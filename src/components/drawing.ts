import { ISOTOPE_COLORS, MATERIAL_COLORS } from '../utils/constants';
import { appState } from '../utils/state';
import { mCiToMBq } from '../utils/unit-conversions';

export function redraw(): void {
    if (!appState.image || !appState.ctx) return;
    
    const ctx = appState.ctx;
    const canvas = appState.canvas;
    
    if (!canvas) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Save the current context state
    ctx.save();
    
    // Apply pan offset first
    ctx.translate(appState.imageOffset.x, appState.imageOffset.y);
    
    // Apply scaling for the image
    const scale = appState.imageScale || 1;
    ctx.scale(scale, scale);
    
    // Draw the scaled image
    ctx.drawImage(appState.image, 0, 0);
    
    if (appState.heatmapOverlay) {
        ctx.globalAlpha = 0.6;
        ctx.drawImage(appState.heatmapOverlay, 0, 0, appState.image.width, appState.image.height);
        ctx.globalAlpha = 1.0;
    }
    
    // Draw all elements in image coordinate space
    drawBarriers(ctx);
    drawCalibration(ctx);
    drawSources(ctx);
    drawMeasurementPoints(ctx);
    
    if (appState.barrierStart) {
        ctx.fillStyle = 'orange';
        ctx.beginPath();
        ctx.arc(appState.barrierStart.x, appState.barrierStart.y, 5 / scale, 0, 2 * Math.PI);
        ctx.fill();
    }
    
    // Restore the context state
    ctx.restore();
}

function drawBarriers(ctx: CanvasRenderingContext2D): void {
    const scale = appState.imageScale || 1;
    appState.barriers.forEach((barrier: any) => {
        const materialKey = typeof barrier.material === 'string' 
            ? barrier.material 
            : barrier.material.name.toLowerCase();
        ctx.strokeStyle = MATERIAL_COLORS[materialKey] || '#000';
        // Make barrier lines thinner - fixed 3px width regardless of barrier thickness
        ctx.lineWidth = 3 / scale;
        ctx.beginPath();
        ctx.moveTo(barrier.start.x, barrier.start.y);
        ctx.lineTo(barrier.end.x, barrier.end.y);
        ctx.stroke();
        
        // Add small indicators at the ends to show barrier presence
        ctx.fillStyle = ctx.strokeStyle;
        ctx.beginPath();
        ctx.arc(barrier.start.x, barrier.start.y, 2 / scale, 0, 2 * Math.PI);
        ctx.arc(barrier.end.x, barrier.end.y, 2 / scale, 0, 2 * Math.PI);
        ctx.fill();
    });
}

function drawCalibration(ctx: CanvasRenderingContext2D): void {
    if (appState.calibrationPoints.length >= 2) {
        const scale = appState.imageScale || 1;
        ctx.strokeStyle = 'blue';
        ctx.lineWidth = 2 / scale;
        ctx.beginPath();
        ctx.moveTo(appState.calibrationPoints[0].x, appState.calibrationPoints[0].y);
        ctx.lineTo(appState.calibrationPoints[1].x, appState.calibrationPoints[1].y);
        ctx.stroke();
        
        appState.calibrationPoints.forEach(point => {
            ctx.fillStyle = 'blue';
            ctx.beginPath();
            ctx.arc(point.x, point.y, 5 / scale, 0, 2 * Math.PI);
            ctx.fill();
        });
    }
}

function drawSources(ctx: CanvasRenderingContext2D): void {
    const scale = appState.imageScale || 1;
    appState.sources.forEach((source: any, index: number) => {
        const isotopeKey = typeof source.isotope === 'string' 
            ? source.isotope 
            : source.isotope.name;
        const color = ISOTOPE_COLORS[isotopeKey] || 'red';
        ctx.fillStyle = color;
        ctx.font = `bold ${14 / scale}px Arial`;
        ctx.textAlign = 'center';
        const activityMBq = Math.round(mCiToMBq(source.activity));
        ctx.fillText(`${isotopeKey} (${activityMBq}MBq)`, 
                     source.position.x, source.position.y - 15 / scale);
        ctx.beginPath();
        ctx.arc(source.position.x, source.position.y, 8 / scale, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.fillStyle = 'white';
        ctx.font = `bold ${10 / scale}px Arial`;
        ctx.fillText((index + 1).toString(), source.position.x, source.position.y + 3 / scale);
    });
}

function drawMeasurementPoints(ctx: CanvasRenderingContext2D): void {
    const scale = appState.imageScale || 1;
    appState.measurementPoints.forEach((point, index) => {
        ctx.fillStyle = 'green';
        ctx.font = `${14 / scale}px Arial`;
        ctx.textAlign = 'center';
        const label = point.name || `P${index + 1}`;
        ctx.fillText(label, point.x, point.y - 10 / scale);
        ctx.beginPath();
        ctx.arc(point.x, point.y, 5 / scale, 0, 2 * Math.PI);
        ctx.fill();
        
        // Show occupancy factor if not 100%
        if (point.occupancyFactor < 1) {
            ctx.font = `${10 / scale}px Arial`;
            ctx.fillStyle = '#666';
            ctx.fillText(`${(point.occupancyFactor * 100).toFixed(0)}%`, point.x, point.y + 18 / scale);
        }
    });
}

export function drawBarrierPreview(x: number, y: number): void {
    if (!appState.barrierStart || !appState.ctx) return;
    
    redraw();
    
    const ctx = appState.ctx;
    const scale = appState.imageScale || 1;
    
    ctx.save();
    ctx.scale(scale, scale);
    
    ctx.strokeStyle = 'rgba(128, 128, 128, 0.5)';
    ctx.lineWidth = 3 / scale;
    ctx.setLineDash([5 / scale, 5 / scale]);
    ctx.beginPath();
    ctx.moveTo(appState.barrierStart.x, appState.barrierStart.y);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.setLineDash([]);
    
    ctx.restore();
}