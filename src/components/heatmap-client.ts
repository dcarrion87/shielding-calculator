import { appState } from '../utils/state';
import { redraw } from './drawing';
import { updateStatus } from './ui-controls';
import { generateHeatmapData } from '../calculations/exposure';
import { uGyperHrToMRperHr } from '../utils/unit-conversions';

export function generateHeatmap(): void {
    if (appState.sources.length === 0) {
        alert('Please place at least one source first');
        return;
    }
    
    const resolutionInput = document.getElementById('heatmap-resolution') as HTMLInputElement;
    const maxExposureInput = document.getElementById('heatmap-max') as HTMLInputElement;
    
    const resolution = parseInt(resolutionInput?.value || '20');
    const maxExposureUGy = parseFloat(maxExposureInput?.value || '1000');
    const maxExposureMR = uGyperHrToMRperHr(maxExposureUGy);
    
    updateStatus('Generating heatmap...');
    
    if (!appState.canvas || !appState.image) return;
    
    // Use original image dimensions for heatmap calculation
    const gridWidth = Math.ceil(appState.image.width / resolution);
    const gridHeight = Math.ceil(appState.image.height / resolution);
    
    setTimeout(() => {
        const sourcesWithPosition = appState.sources.map((source: any) => ({
            ...source,
            position: source.position || source
        }));
        
        const barriersWithGeometry = appState.barriers.map((barrier: any) => ({
            start: barrier.start || barrier.startPoint,
            end: barrier.end || barrier.endPoint,
            material: typeof barrier.material === 'string' ? barrier.material : barrier.material.name,
            thickness: barrier.thickness
        }));
        
        const heatmapData = generateHeatmapData(
            sourcesWithPosition,
            barriersWithGeometry,
            appState.scaleFactor,
            gridWidth,
            gridHeight,
            resolution,
            (progress) => {
                if (progress % 0.1 < 0.01) {
                    updateStatus(`Generating heatmap... ${Math.round(progress * 100)}%`);
                }
            }
        );
        
        drawHeatmap(heatmapData, gridWidth, gridHeight, resolution, maxExposureMR);
        createHeatmapLegend(maxExposureUGy);
        updateStatus('Heatmap generated successfully');
    }, 10);
}

function drawHeatmap(
    heatmapData: number[], 
    gridWidth: number, 
    gridHeight: number, 
    resolution: number, 
    maxExposure: number
): void {
    if (!appState.canvas || !appState.image) return;
    
    // Create heatmap at original image dimensions
    const heatmapCanvas = document.createElement('canvas');
    heatmapCanvas.width = appState.image.width;
    heatmapCanvas.height = appState.image.height;
    const heatmapCtx = heatmapCanvas.getContext('2d');
    
    if (!heatmapCtx) return;
    
    for (let i = 0; i < gridHeight; i++) {
        for (let j = 0; j < gridWidth; j++) {
            const idx = i * gridWidth + j;
            const exposure = heatmapData[idx];
            
            const color = getHeatmapColor(exposure, maxExposure);
            
            heatmapCtx.fillStyle = color;
            heatmapCtx.fillRect(j * resolution, i * resolution, resolution, resolution);
        }
    }
    
    heatmapCtx.filter = 'blur(2px)';
    heatmapCtx.drawImage(heatmapCanvas, 0, 0);
    heatmapCtx.filter = 'none';
    
    appState.heatmapOverlay = heatmapCanvas;
    redraw();
}

function getHeatmapColor(value: number, maxValue: number): string {
    const normalized = Math.min(value / maxValue, 1);
    
    let r: number, g: number, b: number;
    
    if (normalized < 0.25) {
        const t = normalized * 4;
        r = 0;
        g = Math.floor(255 * t);
        b = Math.floor(255 * (1 - t));
    } else if (normalized < 0.5) {
        const t = (normalized - 0.25) * 4;
        r = Math.floor(255 * t);
        g = 255;
        b = 0;
    } else if (normalized < 0.75) {
        const t = (normalized - 0.5) * 4;
        r = 255;
        g = Math.floor(255 * (1 - t * 0.5));
        b = 0;
    } else {
        const t = (normalized - 0.75) * 4;
        r = 255;
        g = Math.floor(128 * (1 - t));
        b = 0;
    }
    
    return `rgb(${r}, ${g}, ${b})`;
}

function createHeatmapLegend(maxExposure: number): void {
    const legend = document.getElementById('heatmap-legend');
    if (!legend) return;
    
    legend.innerHTML = '<strong>Dose Rate Scale (µGy/hr):</strong><br>';
    
    const gradientBar = document.createElement('div');
    gradientBar.style.cssText = `
        width: 100%;
        height: 20px;
        background: linear-gradient(to right, 
            rgb(0, 0, 255) 0%, 
            rgb(0, 255, 0) 25%, 
            rgb(255, 255, 0) 50%, 
            rgb(255, 128, 0) 75%, 
            rgb(255, 0, 0) 100%);
        margin: 5px 0;
        border: 1px solid #ccc;
    `;
    legend.appendChild(gradientBar);
    
    const labels = document.createElement('div');
    labels.style.cssText = 'display: flex; justify-content: space-between; font-size: 12px;';
    labels.innerHTML = `
        <span>0</span>
        <span>${(maxExposure * 0.25).toFixed(1)}</span>
        <span>${(maxExposure * 0.5).toFixed(1)}</span>
        <span>${(maxExposure * 0.75).toFixed(1)}</span>
        <span>${maxExposure}</span>
    `;
    legend.appendChild(labels);
}

export function clearHeatmap(): void {
    appState.heatmapOverlay = null;
    const legend = document.getElementById('heatmap-legend');
    if (legend) legend.innerHTML = '';
    redraw();
    updateStatus('Heatmap cleared');
}