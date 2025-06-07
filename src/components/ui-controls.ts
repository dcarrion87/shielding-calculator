import { MODES, ModeType } from '../utils/constants';
import { appState } from '../utils/state';
import { redraw } from './drawing';
import { cmToMm, mCiToMBq } from '../utils/unit-conversions';

export function setMode(newMode: ModeType, event?: Event | null): void {
    appState.setMode(newMode);
    
    document.querySelectorAll('.mode-button').forEach(btn => {
        btn.classList.remove('active');
    });
    
    if (event && event.target instanceof HTMLElement) {
        event.target.classList.add('active');
    } else {
        document.querySelectorAll('.mode-button').forEach(btn => {
            const onclick = btn.getAttribute('onclick');
            if (onclick && onclick.includes(newMode)) {
                btn.classList.add('active');
            }
        });
    }
    
    const sourceControls = document.getElementById('source-controls');
    const measureControls = document.getElementById('measure-controls');
    const barrierControls = document.getElementById('barrier-controls');
    const heatmapControls = document.getElementById('heatmap-controls');
    
    if (sourceControls) sourceControls.style.display = newMode === MODES.SOURCE ? 'block' : 'none';
    if (measureControls) measureControls.style.display = newMode === MODES.MEASURE ? 'block' : 'none';
    if (barrierControls) barrierControls.style.display = newMode === MODES.BARRIER ? 'block' : 'none';
    if (heatmapControls) heatmapControls.style.display = newMode === MODES.HEATMAP ? 'block' : 'none';
    
    redraw();
}

export function updateSourceList(): void {
    const list = document.getElementById('source-list');
    if (!list) return;
    
    list.innerHTML = '<strong>Sources:</strong><br>';
    
    appState.sources.forEach((source: any, index: number) => {
        const item = document.createElement('div');
        item.className = 'source-item';
        item.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 5px;
            margin-bottom: 5px;
            background-color: #f8f9fa;
            border-radius: 3px;
        `;
        
        const info = document.createElement('div');
        info.style.fontSize = '14px';
        const isotopeKey = typeof source.isotope === 'string' ? source.isotope : source.isotope.name;
        const activityMBq = Math.round(mCiToMBq(source.activity));
        info.textContent = `${index + 1}. ${isotopeKey} (${activityMBq} MBq)`;
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'barrier-delete';
        deleteBtn.textContent = 'Delete';
        deleteBtn.onclick = () => deleteSource(index);
        
        item.appendChild(info);
        item.appendChild(deleteBtn);
        list.appendChild(item);
    });
}

export function updateBarrierList(): void {
    const list = document.getElementById('barrier-list');
    if (!list) return;
    
    list.innerHTML = '<strong>Barriers:</strong><br>';
    
    appState.barriers.forEach((barrier: any, index: number) => {
        const item = document.createElement('div');
        item.className = 'barrier-item';
        
        const info = document.createElement('div');
        info.className = 'barrier-info';
        const materialName = typeof barrier.material === 'string' 
            ? barrier.material 
            : barrier.material.name;
        const thicknessMm = cmToMm(barrier.thickness);
        info.textContent = `${index + 1}. ${materialName} (${thicknessMm}mm)`;
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'barrier-delete';
        deleteBtn.textContent = 'Delete';
        deleteBtn.onclick = () => deleteBarrier(index);
        
        item.appendChild(info);
        item.appendChild(deleteBtn);
        list.appendChild(item);
    });
}

export function deleteSource(index: number): void {
    appState.removeSource(index);
    updateSourceList();
    redraw();
}

export function deleteBarrier(index: number): void {
    appState.removeBarrier(index);
    updateBarrierList();
    redraw();
}

export function updateMeasurementList(): void {
    const list = document.getElementById('measurement-list');
    if (!list) return;
    
    list.innerHTML = '<strong>Points:</strong><br>';
    
    appState.measurementPoints.forEach((point, index) => {
        const item = document.createElement('div');
        item.className = 'measurement-item';
        item.style.cssText = `
            display: flex;
            flex-direction: column;
            padding: 10px;
            margin-bottom: 10px;
            background-color: #f8f9fa;
            border-radius: 5px;
            border: 1px solid #dee2e6;
        `;
        
        // Header with name and delete button
        const header = document.createElement('div');
        header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;';
        
        const name = document.createElement('strong');
        name.textContent = point.name || `Point ${index + 1}`;
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'barrier-delete';
        deleteBtn.textContent = 'Delete';
        deleteBtn.onclick = () => deleteMeasurementPoint(index);
        
        header.appendChild(name);
        header.appendChild(deleteBtn);
        
        // Occupancy factor control
        const occupancyDiv = document.createElement('div');
        occupancyDiv.style.cssText = 'margin-bottom: 5px;';
        
        const occupancyLabel = document.createElement('label');
        occupancyLabel.style.cssText = 'font-size: 12px; margin-right: 5px;';
        occupancyLabel.textContent = 'Occupancy:';
        
        const occupancyInput = document.createElement('input');
        occupancyInput.type = 'number';
        occupancyInput.min = '0';
        occupancyInput.max = '1';
        occupancyInput.step = '0.05';
        occupancyInput.value = point.occupancyFactor.toString();
        occupancyInput.style.cssText = 'width: 60px; margin-right: 5px;';
        occupancyInput.onchange = (e) => {
            const value = parseFloat((e.target as HTMLInputElement).value);
            if (value >= 0 && value <= 1) {
                appState.updateMeasurementPoint(index, { occupancyFactor: value });
            }
        };
        
        const occupancyPercent = document.createElement('span');
        occupancyPercent.style.cssText = 'font-size: 12px; color: #666;';
        occupancyPercent.textContent = `(${(point.occupancyFactor * 100).toFixed(0)}%)`;
        
        occupancyDiv.appendChild(occupancyLabel);
        occupancyDiv.appendChild(occupancyInput);
        occupancyDiv.appendChild(occupancyPercent);
        
        // Target dose rate control
        const targetDiv = document.createElement('div');
        
        const targetLabel = document.createElement('label');
        targetLabel.style.cssText = 'font-size: 12px; margin-right: 5px;';
        targetLabel.textContent = 'Target:';
        
        const targetInput = document.createElement('input');
        targetInput.type = 'number';
        targetInput.min = '0';
        targetInput.step = '1';
        targetInput.value = point.targetDoseRate.toString();
        targetInput.style.cssText = 'width: 60px; margin-right: 5px;';
        targetInput.onchange = (e) => {
            const value = parseFloat((e.target as HTMLInputElement).value);
            if (value >= 0) {
                appState.updateMeasurementPoint(index, { targetDoseRate: value });
            }
        };
        
        const targetUnit = document.createElement('span');
        targetUnit.style.cssText = 'font-size: 12px; color: #666;';
        targetUnit.textContent = 'µGy/hr';
        
        targetDiv.appendChild(targetLabel);
        targetDiv.appendChild(targetInput);
        targetDiv.appendChild(targetUnit);
        
        item.appendChild(header);
        item.appendChild(occupancyDiv);
        item.appendChild(targetDiv);
        list.appendChild(item);
    });
}

export function deleteMeasurementPoint(index: number): void {
    appState.removeMeasurementPoint(index);
    updateMeasurementList();
    redraw();
}

export function toggleDebug(): void {
    const debugContent = document.getElementById('debug-content');
    const toggleIcon = document.getElementById('debug-toggle');
    
    if (debugContent) debugContent.classList.toggle('show');
    if (toggleIcon) toggleIcon.classList.toggle('rotated');
}

export function updateStatus(message: string): void {
    const results = document.getElementById('results');
    if (results) {
        results.textContent = message;
    }
}