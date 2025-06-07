import { appState } from '../utils/state';
import { ISOTOPES } from '../data/isotopes';
import { ArcherEquation } from '../calculations/archer';
import { getMaterialForEnergy } from '../data/materials';
import { mRperHrToUGyperHr, cmToMm, uGyperHrToMRperHr } from '../utils/unit-conversions';

interface VerticalCalculationResult {
    location: 'above' | 'below';
    pointName: string;
    totalDoseRate: number; // µGy/hr
    requiredLead: number; // mm
    requiredConcrete: number; // mm
    distance: number; // meters
}

export function calculateCeilingFloor(): void {
    if (appState.sources.length === 0) {
        alert('Please place at least one radiation source first');
        return;
    }
    
    const heightInput = document.getElementById('ceiling-height') as HTMLInputElement;
    const calcAbove = document.getElementById('calc-above') as HTMLInputElement;
    const calcBelow = document.getElementById('calc-below') as HTMLInputElement;
    const resultsDiv = document.getElementById('ceiling-floor-results');
    
    if (!heightInput || !resultsDiv) return;
    
    const ceilingHeight = parseFloat(heightInput.value);
    const calculateAbove = calcAbove?.checked ?? true;
    const calculateBelow = calcBelow?.checked ?? true;
    
    if (!calculateAbove && !calculateBelow) {
        resultsDiv.innerHTML = '<span style="color: #666;">Please select at least one location (above or below)</span>';
        return;
    }
    
    const results: VerticalCalculationResult[] = [];
    
    // Get target dose rate (using global default for simplicity)
    const targetInput = document.getElementById('target') as HTMLInputElement;
    const targetUGy = parseFloat(targetInput?.value || '20');
    const targetMR = uGyperHrToMRperHr(targetUGy);
    
    // Calculate for points directly above/below each source
    appState.sources.forEach((source: any, index: number) => {
        const isotopeKey = typeof source.isotope === 'string' ? source.isotope : source.isotope.name;
        const isotopeData = ISOTOPES[isotopeKey];
        
        if (!isotopeData) return;
        
        // Above calculation
        if (calculateAbove) {
            const distanceM = ceilingHeight; // Direct vertical distance
            const unshieldedMR = ArcherEquation.calculateExposureRate(
                source.activity,
                distanceM,
                isotopeData.gammaConstant
            );
            const unshieldedUGy = mRperHrToUGyperHr(unshieldedMR);
            
            // Calculate required shielding
            const leadMm = calculateRequiredShielding(unshieldedMR, targetMR, isotopeData.energy, 'lead');
            const concreteMm = calculateRequiredShielding(unshieldedMR, targetMR, isotopeData.energy, 'concrete');
            
            results.push({
                location: 'above',
                pointName: `Above Source ${index + 1} (${isotopeKey})`,
                totalDoseRate: unshieldedUGy,
                requiredLead: leadMm,
                requiredConcrete: concreteMm,
                distance: distanceM
            });
        }
        
        // Below calculation
        if (calculateBelow) {
            const distanceM = ceilingHeight; // Direct vertical distance
            const unshieldedMR = ArcherEquation.calculateExposureRate(
                source.activity,
                distanceM,
                isotopeData.gammaConstant
            );
            const unshieldedUGy = mRperHrToUGyperHr(unshieldedMR);
            
            // Calculate required shielding
            const leadMm = calculateRequiredShielding(unshieldedMR, targetMR, isotopeData.energy, 'lead');
            const concreteMm = calculateRequiredShielding(unshieldedMR, targetMR, isotopeData.energy, 'concrete');
            
            results.push({
                location: 'below',
                pointName: `Below Source ${index + 1} (${isotopeKey})`,
                totalDoseRate: unshieldedUGy,
                requiredLead: leadMm,
                requiredConcrete: concreteMm,
                distance: distanceM
            });
        }
    });
    
    // Also calculate for worst-case scenario (all sources combined)
    if (appState.sources.length > 1) {
        let totalAboveMR = 0;
        let totalBelowMR = 0;
        let dominantEnergy = 0;
        let maxContribution = 0;
        
        appState.sources.forEach((source: any) => {
            const isotopeKey = typeof source.isotope === 'string' ? source.isotope : source.isotope.name;
            const isotopeData = ISOTOPES[isotopeKey];
            if (!isotopeData) return;
            
            const exposureMR = ArcherEquation.calculateExposureRate(
                source.activity,
                ceilingHeight,
                isotopeData.gammaConstant
            );
            
            totalAboveMR += exposureMR;
            totalBelowMR += exposureMR;
            
            // Track dominant isotope for shielding calculations
            if (exposureMR > maxContribution) {
                maxContribution = exposureMR;
                dominantEnergy = isotopeData.energy;
            }
        });
        
        if (calculateAbove && totalAboveMR > 0) {
            const totalAboveUGy = mRperHrToUGyperHr(totalAboveMR);
            const leadMm = calculateRequiredShielding(totalAboveMR, targetMR, dominantEnergy, 'lead');
            const concreteMm = calculateRequiredShielding(totalAboveMR, targetMR, dominantEnergy, 'concrete');
            
            results.push({
                location: 'above',
                pointName: 'Above ALL Sources (Combined)',
                totalDoseRate: totalAboveUGy,
                requiredLead: leadMm,
                requiredConcrete: concreteMm,
                distance: ceilingHeight
            });
        }
        
        if (calculateBelow && totalBelowMR > 0) {
            const totalBelowUGy = mRperHrToUGyperHr(totalBelowMR);
            const leadMm = calculateRequiredShielding(totalBelowMR, targetMR, dominantEnergy, 'lead');
            const concreteMm = calculateRequiredShielding(totalBelowMR, targetMR, dominantEnergy, 'concrete');
            
            results.push({
                location: 'below',
                pointName: 'Below ALL Sources (Combined)',
                totalDoseRate: totalBelowUGy,
                requiredLead: leadMm,
                requiredConcrete: concreteMm,
                distance: ceilingHeight
            });
        }
    }
    
    // Display results
    displayVerticalResults(results, targetUGy);
}

function calculateRequiredShielding(
    unshieldedMR: number, 
    targetMR: number, 
    energy: number, 
    material: string
): number {
    if (targetMR >= unshieldedMR) return 0;
    
    const matProps = getMaterialForEnergy(material, energy);
    if (!matProps) return 0;
    
    // Calculate transmission factor needed
    const transmissionNeeded = targetMR / unshieldedMR;
    
    // Use buildup factor in calculation
    const mu = matProps.linearAttenuationCoefficient;
    
    // Initial estimate without buildup
    let thicknessCm = -Math.log(transmissionNeeded) / mu;
    
    // Iterate to account for buildup
    for (let i = 0; i < 3; i++) {
        const thicknessHvl = thicknessCm / (matProps.halfValueLayer / 10);
        const materialName = material.toLowerCase();
        const buildup = ArcherEquation.calculateBuildupFactor(thicknessHvl, materialName);
        
        // Adjust for buildup
        const adjustedTransmission = transmissionNeeded / buildup;
        if (adjustedTransmission <= 0 || adjustedTransmission >= 1) break;
        
        thicknessCm = -Math.log(adjustedTransmission) / mu;
    }
    
    return cmToMm(Math.max(0, thicknessCm));
}

function displayVerticalResults(results: VerticalCalculationResult[], targetUGy: number): void {
    const resultsDiv = document.getElementById('ceiling-floor-results');
    if (!resultsDiv) return;
    
    if (results.length === 0) {
        resultsDiv.innerHTML = '<span style="color: #666;">No calculations performed</span>';
        return;
    }
    
    let html = '<div style="max-height: 300px; overflow-y: auto;">';
    html += `<div style="margin-bottom: 10px; color: #666;">Target: ${targetUGy} µGy/hr</div>`;
    
    // Group by location
    const aboveResults = results.filter(r => r.location === 'above');
    const belowResults = results.filter(r => r.location === 'below');
    
    if (aboveResults.length > 0) {
        html += '<strong>ABOVE (Ceiling):</strong><br>';
        aboveResults.forEach(result => {
            const meetsTarget = result.totalDoseRate <= targetUGy;
            html += `
                <div style="margin: 5px 0; padding: 5px; background: #f8f9fa; border-radius: 3px;">
                    <div style="font-weight: 500;">${result.pointName}</div>
                    <div style="font-size: 11px;">
                        Dose rate: <span style="color: ${meetsTarget ? 'green' : 'red'}; font-weight: bold;">
                            ${result.totalDoseRate.toFixed(1)} µGy/hr
                        </span> at ${result.distance}m
                    </div>
                    <div style="font-size: 11px;">
                        Required: Lead ${result.requiredLead.toFixed(1)}mm | Concrete ${result.requiredConcrete.toFixed(0)}mm
                    </div>
                </div>
            `;
        });
    }
    
    if (belowResults.length > 0) {
        html += '<br><strong>BELOW (Floor):</strong><br>';
        belowResults.forEach(result => {
            const meetsTarget = result.totalDoseRate <= targetUGy;
            html += `
                <div style="margin: 5px 0; padding: 5px; background: #f8f9fa; border-radius: 3px;">
                    <div style="font-weight: 500;">${result.pointName}</div>
                    <div style="font-size: 11px;">
                        Dose rate: <span style="color: ${meetsTarget ? 'green' : 'red'}; font-weight: bold;">
                            ${result.totalDoseRate.toFixed(1)} µGy/hr
                        </span> at ${result.distance}m
                    </div>
                    <div style="font-size: 11px;">
                        Required: Lead ${result.requiredLead.toFixed(1)}mm | Concrete ${result.requiredConcrete.toFixed(0)}mm
                    </div>
                </div>
            `;
        });
    }
    
    html += '</div>';
    
    // Add note about typical floor/ceiling construction
    html += `
        <div style="margin-top: 10px; padding: 10px; background: #e3f2fd; border-radius: 5px; font-size: 11px;">
            <strong>Note:</strong> Typical concrete floor/ceiling slabs are 150-200mm thick. 
            Standard construction may provide significant shielding.
        </div>
    `;
    
    resultsDiv.innerHTML = html;
}