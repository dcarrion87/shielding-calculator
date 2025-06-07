import { archerParams, DEFAULT_BUILDUP_PARAMS } from '../utils/archer-params';

export function showArcherParams(): void {
    const modal = document.getElementById('archer-params-modal');
    if (!modal) return;
    
    modal.style.display = 'block';
    updateArcherParamsUI();
}

export function closeArcherParams(): void {
    const modal = document.getElementById('archer-params-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

export function toggleArcherParams(): void {
    const modal = document.getElementById('archer-params-modal');
    if (modal) {
        if (modal.style.display === 'none' || !modal.style.display) {
            showArcherParams();
        } else {
            closeArcherParams();
        }
    }
}

export function updateArcherParamsUI(): void {
    const params = archerParams.getParameters();
    
    // Update checkbox
    const useBuildup = document.getElementById('use-buildup') as HTMLInputElement;
    if (useBuildup) {
        useBuildup.checked = params.useBuildup;
    }
    
    // Update parameters table
    const container = document.getElementById('buildup-params-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Create table
    const table = document.createElement('table');
    table.style.cssText = 'width: 100%; border-collapse: collapse;';
    
    // Header
    const header = document.createElement('tr');
    header.innerHTML = `
        <th style="text-align: left; padding: 10px; border-bottom: 2px solid #ddd;">Material</th>
        <th style="text-align: center; padding: 10px; border-bottom: 2px solid #ddd;">A (Amplitude)</th>
        <th style="text-align: center; padding: 10px; border-bottom: 2px solid #ddd;">α (Alpha)</th>
        <th style="text-align: center; padding: 10px; border-bottom: 2px solid #ddd;">Default A</th>
        <th style="text-align: center; padding: 10px; border-bottom: 2px solid #ddd;">Default α</th>
    `;
    table.appendChild(header);
    
    // Materials
    const materials = Object.keys(DEFAULT_BUILDUP_PARAMS);
    materials.forEach(material => {
        const row = document.createElement('tr');
        const currentParams = params.buildupParams[material] || DEFAULT_BUILDUP_PARAMS[material];
        const defaultParams = DEFAULT_BUILDUP_PARAMS[material];
        
        row.innerHTML = `
            <td style="padding: 10px; border-bottom: 1px solid #eee;">
                ${material.charAt(0).toUpperCase() + material.slice(1)}
            </td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">
                <input type="number" 
                       value="${currentParams.A}" 
                       min="0.5" 
                       max="2.0" 
                       step="0.1"
                       style="width: 80px; text-align: center;"
                       onchange="updateBuildupParam('${material}', 'A', this.value)">
            </td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">
                <input type="number" 
                       value="${currentParams.alpha}" 
                       min="0.01" 
                       max="0.5" 
                       step="0.01"
                       style="width: 80px; text-align: center;"
                       onchange="updateBuildupParam('${material}', 'alpha', this.value)">
            </td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center; color: #666;">
                ${defaultParams.A}
            </td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center; color: #666;">
                ${defaultParams.alpha}
            </td>
        `;
        
        table.appendChild(row);
    });
    
    container.appendChild(table);
    
    // Add explanation
    const explanation = document.createElement('div');
    explanation.style.cssText = 'margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 5px;';
    explanation.innerHTML = `
        <h4 style="margin: 0 0 10px 0;">Parameter Explanation</h4>
        <p style="margin: 5px 0; font-size: 14px;">
            <strong>A (Amplitude):</strong> Base multiplication factor for buildup. Higher values mean more scattered radiation contribution.
        </p>
        <p style="margin: 5px 0; font-size: 14px;">
            <strong>α (Alpha):</strong> Exponential growth factor. Higher values mean buildup increases faster with thickness.
        </p>
        <p style="margin: 5px 0; font-size: 14px;">
            <strong>Formula:</strong> Buildup Factor B = A × e^(α × thickness_in_HVLs)
        </p>
        <p style="margin: 10px 0 0 0; font-size: 12px; color: #666;">
            Note: These parameters are empirical and may vary based on energy and geometry. 
            Default values are based on broad beam conditions for typical medical isotope energies.
        </p>
    `;
    container.appendChild(explanation);
}

export function updateBuildupParam(material: string, param: 'A' | 'alpha', value: string): void {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
        archerParams.updateBuildupParam(material, param, numValue);
    }
}

export function updateUseBuildup(use: boolean): void {
    archerParams.setUseBuildup(use);
}

export function resetArcherParams(): void {
    if (confirm('Reset all Archer parameters to default values?')) {
        archerParams.resetToDefaults();
        updateArcherParamsUI();
    }
}