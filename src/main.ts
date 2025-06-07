// Check authentication
if (sessionStorage.getItem('auth') !== 'true') {
    window.location.href = './auth.html';
}

import './styles/main.css';
import { appState } from './utils/state';
import { setMode, deleteSource, deleteBarrier, toggleDebug, deleteMeasurementPoint } from './components/ui-controls';
import { calculate } from './components/calculations-client';
import { generateHeatmap, clearHeatmap } from './components/heatmap-client';
import { 
    handleFileUpload, 
    handleCanvasClick, 
    handleCanvasMouseMove,
    handleCanvasMouseDown,
    handleCanvasMouseUp,
    clearAll,
    clearSources 
} from './components/event-handlers';
import { redraw } from './components/drawing';
import type { ModeType } from './utils/constants';
import { ISOTOPES } from './data/isotopes';
import { exportToCSV, exportToPDF } from './utils/export';
import { 
    toggleArcherParams, 
    closeArcherParams, 
    updateBuildupParam, 
    updateUseBuildup, 
    resetArcherParams 
} from './components/archer-ui';
import { archerParams } from './utils/archer-params';
import { calculateCeilingFloor } from './components/ceiling-floor-calc';

declare global {
    interface Window {
        setMode: (mode: ModeType, event?: Event | null) => void;
        calculate: () => void;
        generateHeatmap: () => void;
        clearHeatmap: () => void;
        clearAll: () => void;
        clearSources: () => void;
        deleteSource: (index: number) => void;
        deleteBarrier: (index: number) => void;
        deleteMeasurementPoint: (index: number) => void;
        toggleDebug: () => void;
        toggleCanvasExpand: () => void;
        toggleResultsExpand: () => void;
        zoomIn: () => void;
        zoomOut: () => void;
        zoomReset: () => void;
        exportCSV: () => void;
        exportPDF: () => void;
        toggleArcherParams: () => void;
        closeArcherParams: () => void;
        updateBuildupParam: (material: string, param: 'A' | 'alpha', value: string) => void;
        updateUseBuildup: (use: boolean) => void;
        resetArcherParams: () => void;
        archerParams: any;
        calculateCeilingFloor: () => void;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('canvas') as HTMLCanvasElement;
    if (canvas) {
        appState.setCanvas(canvas);
        
        canvas.addEventListener('click', handleCanvasClick);
        canvas.addEventListener('mousemove', handleCanvasMouseMove);
        canvas.addEventListener('mousedown', handleCanvasMouseDown);
        canvas.addEventListener('mouseup', handleCanvasMouseUp);
        
        // Also handle mouseup on document in case mouse leaves canvas
        document.addEventListener('mouseup', handleCanvasMouseUp);
        
        // Add mouse wheel zoom
        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            if (e.deltaY < 0) {
                window.zoomIn();
            } else {
                window.zoomOut();
            }
        });
    }
    
    const fileInput = document.getElementById('file-input');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileUpload);
    }
    
    // Add isotope selection change handler
    const isotopeSelect = document.getElementById('source-isotope') as HTMLSelectElement;
    if (isotopeSelect) {
        isotopeSelect.addEventListener('change', updateDoseRateInfo);
        // Initialize dose rate info
        updateDoseRateInfo();
    }
    
    // Handle window resize to update canvas size
    let resizeTimeout: ReturnType<typeof setTimeout> | null = null;
    window.addEventListener('resize', () => {
        if (resizeTimeout) clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            updateCanvasSize();
            redraw();
        }, 250);
    });
    
    window.setMode = (mode: ModeType, event?: Event | null) => setMode(mode, event);
    window.calculate = calculate;
    window.generateHeatmap = generateHeatmap;
    window.clearHeatmap = clearHeatmap;
    window.clearAll = clearAll;
    window.clearSources = clearSources;
    window.deleteSource = deleteSource;
    window.deleteBarrier = deleteBarrier;
    window.deleteMeasurementPoint = deleteMeasurementPoint;
    window.toggleDebug = toggleDebug;
    window.exportCSV = exportToCSV;
    window.exportPDF = exportToPDF;
    window.toggleArcherParams = toggleArcherParams;
    window.closeArcherParams = closeArcherParams;
    window.updateBuildupParam = updateBuildupParam;
    window.updateUseBuildup = updateUseBuildup;
    window.resetArcherParams = resetArcherParams;
    window.archerParams = archerParams;
    window.calculateCeilingFloor = calculateCeilingFloor;
    
    // Toggle functions
    window.toggleCanvasExpand = () => {
        const mainContent = document.querySelector('.main-content');
        const canvasIcon = document.getElementById('canvas-expand-icon');
        const resultsIcon = document.getElementById('results-expand-icon');
        
        if (mainContent) {
            // Remove results-expanded if active
            if (mainContent.classList.contains('results-expanded')) {
                mainContent.classList.remove('results-expanded');
                if (resultsIcon) resultsIcon.textContent = '□';
            }
            
            // Toggle canvas-expanded
            mainContent.classList.toggle('canvas-expanded');
            if (canvasIcon) {
                canvasIcon.textContent = mainContent.classList.contains('canvas-expanded') ? '◻' : '□';
            }
            
            // Trigger resize immediately
            window.dispatchEvent(new Event('resize'));
        }
    };
    
    window.toggleResultsExpand = () => {
        const mainContent = document.querySelector('.main-content');
        const resultsIcon = document.getElementById('results-expand-icon');
        const canvasIcon = document.getElementById('canvas-expand-icon');
        
        if (mainContent) {
            // Remove canvas-expanded if active
            if (mainContent.classList.contains('canvas-expanded')) {
                mainContent.classList.remove('canvas-expanded');
                if (canvasIcon) canvasIcon.textContent = '□';
            }
            
            // Toggle results-expanded
            mainContent.classList.toggle('results-expanded');
            if (resultsIcon) {
                resultsIcon.textContent = mainContent.classList.contains('results-expanded') ? '◻' : '□';
            }
            
            // Trigger resize immediately
            window.dispatchEvent(new Event('resize'));
        }
    };
    
    // Validation modal functions
    window.closeValidationInfo = () => {
        const modal = document.getElementById('validation-info');
        if (modal) {
            modal.style.display = 'none';
        }
    };
    
    // Handle validation link click
    document.addEventListener('click', (e) => {
        if (e.target && (e.target as HTMLElement).classList.contains('validation-link')) {
            e.preventDefault();
            const modal = document.getElementById('validation-info');
            if (modal) {
                modal.style.display = 'flex';
            }
        }
    });
    
    // Close modal on background click
    const validationModal = document.getElementById('validation-info');
    if (validationModal) {
        validationModal.addEventListener('click', (e) => {
            if (e.target === validationModal) {
                window.closeValidationInfo();
            }
        });
    }
    
    // Zoom functions
    window.zoomIn = () => {
        if (appState.image && appState.canvas) {
            appState.zoomLevel = Math.min(appState.zoomLevel * 1.2, 5.0);
            updateCanvasSize();
            redraw();
        }
    };
    
    window.zoomOut = () => {
        if (appState.image && appState.canvas) {
            appState.zoomLevel = Math.max(appState.zoomLevel / 1.2, 0.2);
            updateCanvasSize();
            redraw();
        }
    };
    
    window.zoomReset = () => {
        if (appState.image && appState.canvas) {
            appState.zoomLevel = 1.0;
            appState.imageOffset = { x: 0, y: 0 }; // Reset pan
            updateCanvasSize();
            redraw();
        }
    };
    
    // Helper function to update canvas size with zoom
    function updateCanvasSize() {
        if (!appState.image || !appState.canvas) return;
        
        const container = appState.canvas.parentElement;
        if (container) {
            const containerRect = container.getBoundingClientRect();
            const containerStyles = window.getComputedStyle(container);
            const paddingLeft = parseFloat(containerStyles.paddingLeft);
            const paddingRight = parseFloat(containerStyles.paddingRight);
            const paddingTop = parseFloat(containerStyles.paddingTop);
            const paddingBottom = parseFloat(containerStyles.paddingBottom);
            
            const maxWidth = containerRect.width - paddingLeft - paddingRight;
            const maxHeight = containerRect.height - paddingTop - paddingBottom;
            
            // Calculate base scale to fit image within container
            const scaleX = maxWidth / appState.image.width;
            const scaleY = maxHeight / appState.image.height;
            const baseScale = Math.min(scaleX, scaleY);
            
            // Apply zoom level to base scale
            const finalScale = baseScale * appState.zoomLevel;
            
            // Set canvas dimensions
            appState.canvas.width = Math.floor(appState.image.width * finalScale);
            appState.canvas.height = Math.floor(appState.image.height * finalScale);
            
            // Store the combined scale for coordinate transformations
            appState.imageScale = finalScale;
        }
    }
    
    // Helper function to update dose rate info
    function updateDoseRateInfo() {
        const isotopeSelect = document.getElementById('source-isotope') as HTMLSelectElement;
        const doseRateInfo = document.getElementById('dose-rate-info');
        
        if (isotopeSelect && doseRateInfo) {
            const selectedIsotope = isotopeSelect.value;
            const isotopeData = ISOTOPES[selectedIsotope];
            
            if (isotopeData && isotopeData.doseRatePerMBq) {
                const doseRate = isotopeData.doseRatePerMBq.toFixed(3);
                doseRateInfo.innerHTML = `Dose rate: <strong>${doseRate} µGy/hr</strong> at 1m per MBq`;
            } else {
                doseRateInfo.innerHTML = '';
            }
        }
    }
});