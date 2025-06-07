import { appState } from '../utils/state';
import { calculateExposureFromMultipleSources } from '../calculations/exposure';
import { ISOTOPES } from '../data/isotopes';
import { getMaterialForEnergy } from '../data/materials';
import { uGyperHrToMRperHr, mRperHrToUGyperHr, mCiToMBq, cmToMm } from '../utils/unit-conversions';

export function calculate(): void {
    if (appState.sources.length === 0 || appState.measurementPoints.length === 0) {
        alert('Please place at least one source and measurement point');
        return;
    }
    
    const targetInput = document.getElementById('target') as HTMLInputElement;
    const targetUGy = parseFloat(targetInput?.value || '20');
    
    const results: string[] = [];
    const debugInfo: string[] = [];
    
    results.push("=== Multi-Source Shielding Calculation Results ===\n");
    results.push(`Number of sources: ${appState.sources.length}`);
    results.push(`Target dose rate: ${targetUGy} µGy/hr`);
    results.push(`Scale: ${appState.scaleFactor.toFixed(1)} pixels/meter\n`);
    
    results.push("Sources:");
    appState.sources.forEach((source: any, i: number) => {
        const isotopeKey = typeof source.isotope === 'string' ? source.isotope : source.isotope.name;
        const isotopeData = ISOTOPES[isotopeKey];
        const activityMBq = Math.round(mCiToMBq(source.activity));
        results.push(`  ${i+1}. ${isotopeData.name}: ${activityMBq} MBq at (${source.position.x.toFixed(0)}, ${source.position.y.toFixed(0)})`);
    });
    results.push("");
    
    appState.measurementPoints.forEach((point, i) => {
        // Use point-specific target dose rate
        const pointTargetUGy = point.targetDoseRate;
        const pointTargetMR = uGyperHrToMRperHr(pointTargetUGy);
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
        
        const exposureData = calculateExposureFromMultipleSources(
            sourcesWithPosition,
            point,
            barriersWithGeometry,
            appState.scaleFactor
        );
        
        const pointName = point.name || `Point ${i+1}`;
        results.push(`\n${pointName}:`);
        const totalExposureUGy = mRperHrToUGyperHr(exposureData.totalExposure);
        const effectiveDoseUGy = totalExposureUGy * point.occupancyFactor;
        results.push(`  Total dose rate: ${totalExposureUGy.toFixed(1)} µGy/hr`);
        if (point.occupancyFactor < 1) {
            results.push(`  Effective dose rate: ${effectiveDoseUGy.toFixed(1)} µGy/hr (${(point.occupancyFactor * 100).toFixed(0)}% occupancy)`);
        }
        results.push(`  Target dose rate: ${point.targetDoseRate} µGy/hr`);
        results.push(`\n  Contributions by isotope:`);
        
        for (const [isotope, contrib] of Object.entries(exposureData.isotopeContributions)) {
            const percentage = (contrib / exposureData.totalExposure * 100) || 0;
            const contribUGy = mRperHrToUGyperHr(contrib);
            results.push(`    - ${isotope}: ${contribUGy.toFixed(1)} µGy/hr (${percentage.toFixed(1)}%)`);
        }
        
        results.push(`\n  Contributions by source:`);
        appState.sources.forEach((source: any, j: number) => {
            const contrib = exposureData.sourceContributions[source.id] || 0;
            const percentage = (contrib / exposureData.totalExposure * 100) || 0;
            const isotopeKey = typeof source.isotope === 'string' ? source.isotope : source.isotope.name;
            const contribUGy = mRperHrToUGyperHr(contrib);
            results.push(`    - Source ${j+1} (${isotopeKey}): ${contribUGy.toFixed(1)} µGy/hr (${percentage.toFixed(1)}%)`);
        });
        
        if (Object.keys(exposureData.isotopeContributions).length > 0) {
            const dominantIsotope = Object.entries(exposureData.isotopeContributions)
                .reduce((a, b) => a[1] > b[1] ? a : b)[0];
            const isotopeData = ISOTOPES[dominantIsotope];
            
            results.push(`\n  Required shielding (based on ${dominantIsotope}):`);
            
            let totalDist = 0;
            appState.sources.forEach((source: any) => {
                const dist = Math.sqrt(
                    Math.pow(point.x - source.position.x, 2) + 
                    Math.pow(point.y - source.position.y, 2)
                ) / appState.scaleFactor;
                totalDist += dist;
            });
            
            ['lead', 'concrete', 'steel'].forEach(matName => {
                const matProps = getMaterialForEnergy(matName, isotopeData.energy);
                if (matProps) {
                    // Calculate transmission needed considering occupancy
                    const effectiveExposureMR = exposureData.totalExposure * point.occupancyFactor;
                    const transmissionNeeded = pointTargetMR / effectiveExposureMR;
                    if (transmissionNeeded < 1) {
                        const thicknessCm = -Math.log(transmissionNeeded) / matProps.linearAttenuationCoefficient;
                        const thicknessMm = cmToMm(thicknessCm);
                        results.push(`    - ${matName.charAt(0).toUpperCase() + matName.slice(1)}: ${thicknessMm.toFixed(1)} mm`);
                    } else {
                        results.push(`    - ${matName.charAt(0).toUpperCase() + matName.slice(1)}: No shielding required`);
                    }
                }
            });
        }
    });
    
    debugInfo.push("=== MULTI-SOURCE DEBUG INFORMATION ===\n");
    
    // Add isotope information
    debugInfo.push("ISOTOPE PARAMETERS:");
    for (const [isotope, data] of Object.entries(ISOTOPES)) {
        debugInfo.push(`${isotope}: Γ = ${data.gammaConstant} R·m²/mCi·h, Energy = ${data.energy} keV`);
    }
    
    // Add Archer equation parameters
    debugInfo.push("\nARCHER EQUATION PARAMETERS:");
    const archerParameters = (window as any).archerParams?.getParameters();
    if (archerParameters) {
        debugInfo.push(`Buildup Factor Enabled: ${archerParameters.useBuildup ? 'Yes' : 'No'}`);
        if (archerParameters.useBuildup) {
            debugInfo.push("\nBuildup Parameters (B = A × exp(α × x)):");
            Object.entries(archerParameters.buildupParams).forEach(([material, params]: [string, any]) => {
                debugInfo.push(`  ${material}: A = ${params.A}, α = ${params.alpha}`);
            });
        }
    }
    
    // Add calculation formula
    debugInfo.push("\nCALCULATION FORMULAS:");
    debugInfo.push("Exposure Rate: X = (A × Γ × 10⁶) / d²");
    debugInfo.push("Transmission: T = e^(-μx) × B");
    debugInfo.push("Where: A = activity (mCi), Γ = gamma constant, d = distance (m)");
    debugInfo.push("       μ = linear attenuation coefficient, x = thickness, B = buildup factor");
    
    const resultsElement = document.getElementById('results');
    const debugElement = document.getElementById('debug-content');
    
    if (resultsElement) resultsElement.textContent = results.join('\n');
    if (debugElement) debugElement.textContent = debugInfo.join('\n');
}

export function setCalibrationScale(calibrationDistance: number): boolean {
    if (appState.calibrationPoints.length >= 2) {
        const p1 = appState.calibrationPoints[0];
        const p2 = appState.calibrationPoints[1];
        const pixelDist = Math.sqrt(
            Math.pow(p2.x - p1.x, 2) + 
            Math.pow(p2.y - p1.y, 2)
        );
        
        if (pixelDist > 0 && calibrationDistance > 0) {
            appState.scaleFactor = pixelDist / calibrationDistance;
            const scaleStatus = document.getElementById('scale-status');
            if (scaleStatus) {
                scaleStatus.textContent = `Scale: ${appState.scaleFactor.toFixed(1)} pixels/meter`;
            }
            return true;
        }
    }
    return false;
}