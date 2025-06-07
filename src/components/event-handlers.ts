import { MODES } from '../utils/constants';
import { appState } from '../utils/state';
import { redraw, drawBarrierPreview } from './drawing';
import { updateSourceList, updateBarrierList, updateMeasurementList } from './ui-controls';
import { setCalibrationScale } from './calculations-client';
import { mmToCm, MBqToMCi } from '../utils/unit-conversions';

// Pan state
let isPanning = false;
let panStart = { x: 0, y: 0 };
let panOffset = { x: 0, y: 0 };

export function handleFileUpload(event: Event): void {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                appState.image = img;
                if (appState.canvas) {
                    // Get the canvas container dimensions
                    const container = appState.canvas.parentElement;
                    if (container) {
                        // Set canvas size to match container
                        const containerRect = container.getBoundingClientRect();
                        const containerStyles = window.getComputedStyle(container);
                        const paddingLeft = parseFloat(containerStyles.paddingLeft);
                        const paddingRight = parseFloat(containerStyles.paddingRight);
                        const paddingTop = parseFloat(containerStyles.paddingTop);
                        const paddingBottom = parseFloat(containerStyles.paddingBottom);
                        
                        const maxWidth = containerRect.width - paddingLeft - paddingRight;
                        const maxHeight = containerRect.height - paddingTop - paddingBottom;
                        
                        // Calculate scale to fit image within container while maintaining aspect ratio
                        const scaleX = maxWidth / img.width;
                        const scaleY = maxHeight / img.height;
                        const scale = Math.min(scaleX, scaleY);
                        
                        // Set canvas dimensions to fill available space
                        appState.canvas.width = Math.floor(img.width * scale);
                        appState.canvas.height = Math.floor(img.height * scale);
                        
                        // Store the image scale for coordinate transformations
                        appState.imageScale = scale;
                        appState.imageOffset = { x: 0, y: 0 };
                        appState.zoomLevel = 1.0; // Reset zoom on new image
                    }
                }
                clearAll();
                redraw();
                const uploadStatus = document.getElementById('upload-status');
                if (uploadStatus) {
                    uploadStatus.textContent = `Loaded: ${file.name} (${img.width}x${img.height})`;
                }
                
                // Trigger resize event to ensure proper sizing
                window.dispatchEvent(new Event('resize'));
            };
            img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
    }
}

export function handleCanvasClick(event: MouseEvent): void {
    if (!appState.image || !appState.canvas) return;
    
    // Don't process clicks if we're panning
    if (event.shiftKey || event.metaKey || event.ctrlKey || isPanning) return;
    
    const rect = appState.canvas.getBoundingClientRect();
    const canvasX = (event.clientX - rect.left) * (appState.canvas.width / rect.width);
    const canvasY = (event.clientY - rect.top) * (appState.canvas.height / rect.height);
    
    // Convert canvas coordinates to original image coordinates accounting for pan offset
    const imageScale = appState.imageScale || 1;
    const x = (canvasX - appState.imageOffset.x) / imageScale;
    const y = (canvasY - appState.imageOffset.y) / imageScale;
    
    switch (appState.mode) {
        case MODES.CALIBRATE:
            handleCalibrationClick(x, y);
            break;
        case MODES.SOURCE:
            handleSourceClick(x, y);
            break;
        case MODES.MEASURE:
            handleMeasureClick(x, y);
            break;
        case MODES.BARRIER:
            handleBarrierClick(x, y);
            break;
    }
    
    redraw();
}

function handleCalibrationClick(x: number, y: number): void {
    appState.addCalibrationPoint({x, y});
    
    if (appState.calibrationPoints.length === 2) {
        const calibDistInput = document.getElementById('calib-dist') as HTMLInputElement;
        const realDist = parseFloat(calibDistInput?.value || '1.0');
        if (setCalibrationScale(realDist)) {
            // Clear calibration points after successful calibration
            appState.calibrationPoints = [];
            appState.mode = MODES.SOURCE;
            redraw();
        }
    }
}

function handleSourceClick(x: number, y: number): void {
    const isotopeSelect = document.getElementById('source-isotope') as HTMLSelectElement;
    const activityInput = document.getElementById('source-activity') as HTMLInputElement;
    
    const isotope = isotopeSelect?.value || 'Tc-99m';
    const activityMBq = parseFloat(activityInput?.value || '370');
    const activityMCi = MBqToMCi(activityMBq);
    
    const source = {
        id: appState.generateId(),
        position: {x, y},
        isotope: isotope,
        activity: activityMCi
    };
    
    appState.addSource(source as any);
    updateSourceList();
}

function handleMeasureClick(x: number, y: number): void {
    appState.addMeasurementPoint({x, y});
    updateMeasurementList();
}

function handleBarrierClick(x: number, y: number): void {
    if (!appState.barrierStart) {
        appState.barrierStart = {x, y};
    } else {
        const materialSelect = document.getElementById('barrier-material') as HTMLSelectElement;
        const thicknessInput = document.getElementById('barrier-thickness') as HTMLInputElement;
        
        const material = materialSelect?.value || 'lead';
        const thicknessMm = parseFloat(thicknessInput?.value || '100.0');
        const thicknessCm = mmToCm(thicknessMm);
        
        appState.addBarrier({
            start: appState.barrierStart,
            end: {x, y},
            material: material,
            thickness: thicknessCm
        } as any);
        
        appState.barrierStart = null;
        updateBarrierList();
    }
}

export function handleCanvasMouseMove(event: MouseEvent): void {
    if (!appState.canvas) return;
    
    if (isPanning) {
        const rect = appState.canvas.getBoundingClientRect();
        const currentX = (event.clientX - rect.left) * (appState.canvas.width / rect.width);
        const currentY = (event.clientY - rect.top) * (appState.canvas.height / rect.height);
        
        appState.imageOffset.x = panOffset.x + (currentX - panStart.x);
        appState.imageOffset.y = panOffset.y + (currentY - panStart.y);
        
        redraw();
    } else if (appState.mode === MODES.BARRIER && appState.barrierStart) {
        const rect = appState.canvas.getBoundingClientRect();
        const canvasX = (event.clientX - rect.left) * (appState.canvas.width / rect.width);
        const canvasY = (event.clientY - rect.top) * (appState.canvas.height / rect.height);
        
        // Convert canvas coordinates to original image coordinates accounting for pan
        const imageScale = appState.imageScale || 1;
        const x = (canvasX - appState.imageOffset.x) / imageScale;
        const y = (canvasY - appState.imageOffset.y) / imageScale;
        
        drawBarrierPreview(x, y);
    }
}

export function handleCanvasMouseDown(event: MouseEvent): void {
    if (!appState.canvas || !appState.image) return;
    
    // Start panning if shift or cmd/ctrl is held
    if (event.shiftKey || event.metaKey || event.ctrlKey) {
        isPanning = true;
        const rect = appState.canvas.getBoundingClientRect();
        panStart.x = (event.clientX - rect.left) * (appState.canvas.width / rect.width);
        panStart.y = (event.clientY - rect.top) * (appState.canvas.height / rect.height);
        panOffset.x = appState.imageOffset.x;
        panOffset.y = appState.imageOffset.y;
        
        // Change cursor to indicate panning
        appState.canvas.style.cursor = 'move';
        event.preventDefault();
    }
}

export function handleCanvasMouseUp(event: MouseEvent): void {
    if (isPanning && appState.canvas) {
        isPanning = false;
        appState.canvas.style.cursor = 'crosshair';
    }
}

export function clearAll(): void {
    appState.reset();
    const scaleStatus = document.getElementById('scale-status');
    if (scaleStatus) scaleStatus.textContent = '';
    updateSourceList();
    updateBarrierList();
    updateMeasurementList();
    redraw();
    const results = document.getElementById('results');
    if (results) results.textContent = 'Click "Calculate All Points" to see results';
}

export function clearSources(): void {
    appState.sources = [];
    updateSourceList();
    redraw();
}