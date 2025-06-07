import { appState } from './state';
import { ISOTOPES } from '../data/isotopes';
import { calculateExposureFromMultipleSources } from '../calculations/exposure';
import { getMaterialForEnergy } from '../data/materials';
import { mCiToMBq, mRperHrToUGyperHr, cmToMm, uGyperHrToMRperHr } from './unit-conversions';

interface CSVExportData {
    sources: any[];
    measurementPoints: any[];
    barriers: any[];
    calculations: any[];
    ceilingFloorCalculations?: any[];
}

export function generateCSVData(): CSVExportData {
    const data: CSVExportData = {
        sources: [],
        measurementPoints: [],
        barriers: [],
        calculations: []
    };
    
    // Export sources
    appState.sources.forEach((source: any, index: number) => {
        const isotopeKey = typeof source.isotope === 'string' ? source.isotope : source.isotope.name;
        const isotopeData = ISOTOPES[isotopeKey];
        data.sources.push({
            id: index + 1,
            isotope: isotopeKey,
            energy_keV: isotopeData.energy,
            activity_MBq: Math.round(mCiToMBq(source.activity)),
            position_x: source.position.x.toFixed(1),
            position_y: source.position.y.toFixed(1),
            dose_rate_per_MBq: isotopeData.doseRatePerMBq?.toFixed(3) || 'N/A'
        });
    });
    
    // Export measurement points
    appState.measurementPoints.forEach((point, index) => {
        data.measurementPoints.push({
            id: index + 1,
            name: point.name || `P${index + 1}`,
            position_x: point.x.toFixed(1),
            position_y: point.y.toFixed(1),
            occupancy_factor: point.occupancyFactor,
            target_dose_rate_uGy_hr: point.targetDoseRate
        });
    });
    
    // Export barriers
    appState.barriers.forEach((barrier: any, index: number) => {
        const materialName = typeof barrier.material === 'string' 
            ? barrier.material 
            : barrier.material.name;
        data.barriers.push({
            id: index + 1,
            material: materialName,
            thickness_mm: cmToMm(barrier.thickness).toFixed(1),
            start_x: barrier.start.x.toFixed(1),
            start_y: barrier.start.y.toFixed(1),
            end_x: barrier.end.x.toFixed(1),
            end_y: barrier.end.y.toFixed(1)
        });
    });
    
    // Export calculations
    if (appState.sources.length > 0 && appState.measurementPoints.length > 0) {
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
        
        appState.measurementPoints.forEach((point, i) => {
            const exposureData = calculateExposureFromMultipleSources(
                sourcesWithPosition,
                point,
                barriersWithGeometry,
                appState.scaleFactor
            );
            
            const totalExposureUGy = mRperHrToUGyperHr(exposureData.totalExposure);
            const effectiveDoseUGy = totalExposureUGy * point.occupancyFactor;
            
            const calcResult: any = {
                point_name: point.name || `P${i + 1}`,
                total_dose_rate_uGy_hr: totalExposureUGy.toFixed(1),
                effective_dose_rate_uGy_hr: effectiveDoseUGy.toFixed(1),
                occupancy_factor: point.occupancyFactor,
                target_dose_rate_uGy_hr: point.targetDoseRate,
                meets_target: effectiveDoseUGy <= point.targetDoseRate ? 'Yes' : 'No'
            };
            
            // Add isotope contributions
            for (const [isotope, contrib] of Object.entries(exposureData.isotopeContributions)) {
                const contribUGy = mRperHrToUGyperHr(contrib);
                calcResult[`${isotope}_contribution_uGy_hr`] = contribUGy.toFixed(1);
            }
            
            // Add required shielding for dominant isotope
            if (Object.keys(exposureData.isotopeContributions).length > 0) {
                const dominantIsotope = Object.entries(exposureData.isotopeContributions)
                    .reduce((a, b) => a[1] > b[1] ? a : b)[0];
                const isotopeData = ISOTOPES[dominantIsotope];
                const pointTargetMR = uGyperHrToMRperHr(point.targetDoseRate);
                const effectiveExposureMR = exposureData.totalExposure * point.occupancyFactor;
                
                ['lead', 'concrete', 'steel'].forEach(matName => {
                    const matProps = getMaterialForEnergy(matName, isotopeData.energy);
                    if (matProps) {
                        const transmissionNeeded = pointTargetMR / effectiveExposureMR;
                        if (transmissionNeeded < 1) {
                            const thicknessCm = -Math.log(transmissionNeeded) / matProps.linearAttenuationCoefficient;
                            const thicknessMm = cmToMm(thicknessCm);
                            calcResult[`required_${matName}_mm`] = thicknessMm.toFixed(1);
                        } else {
                            calcResult[`required_${matName}_mm`] = '0';
                        }
                    }
                });
            }
            
            data.calculations.push(calcResult);
        });
    }
    
    return data;
}

export function exportToCSV(): void {
    // Add validation warning
    if (!confirm('VALIDATION NOTICE:\n\nThis calculator is pending clinical validation. Exported results should NOT be used for clinical decisions without independent verification.\n\nDo you want to continue with the export?')) {
        return;
    }
    
    const data = generateCSVData();
    const csvParts: string[] = [];
    
    // Add validation header
    csvParts.push('*** VALIDATION PENDING - NOT FOR CLINICAL USE ***');
    csvParts.push('This calculator is undergoing validation. Results must be independently verified.');
    csvParts.push('Generated: ' + new Date().toISOString());
    csvParts.push('');
    
    // Sources section
    csvParts.push('RADIATION SOURCES');
    if (data.sources.length > 0) {
        const sourceHeaders = Object.keys(data.sources[0]);
        csvParts.push(sourceHeaders.join(','));
        data.sources.forEach(source => {
            csvParts.push(sourceHeaders.map(h => source[h]).join(','));
        });
    } else {
        csvParts.push('No sources defined');
    }
    csvParts.push('');
    
    // Measurement points section
    csvParts.push('MEASUREMENT POINTS');
    if (data.measurementPoints.length > 0) {
        const pointHeaders = Object.keys(data.measurementPoints[0]);
        csvParts.push(pointHeaders.join(','));
        data.measurementPoints.forEach(point => {
            csvParts.push(pointHeaders.map(h => point[h]).join(','));
        });
    } else {
        csvParts.push('No measurement points defined');
    }
    csvParts.push('');
    
    // Barriers section
    csvParts.push('BARRIERS');
    if (data.barriers.length > 0) {
        const barrierHeaders = Object.keys(data.barriers[0]);
        csvParts.push(barrierHeaders.join(','));
        data.barriers.forEach(barrier => {
            csvParts.push(barrierHeaders.map(h => barrier[h]).join(','));
        });
    } else {
        csvParts.push('No barriers defined');
    }
    csvParts.push('');
    
    // Calculations section
    csvParts.push('CALCULATION RESULTS');
    if (data.calculations.length > 0) {
        const calcHeaders = Object.keys(data.calculations[0]);
        csvParts.push(calcHeaders.join(','));
        data.calculations.forEach(calc => {
            csvParts.push(calcHeaders.map(h => calc[h] || '').join(','));
        });
    } else {
        csvParts.push('No calculations performed');
    }
    
    // Add metadata
    csvParts.push('');
    csvParts.push('METADATA');
    csvParts.push(`Export Date,${new Date().toISOString()}`);
    csvParts.push(`Scale Factor,${appState.scaleFactor.toFixed(1)} pixels/meter`);
    
    // Create and download CSV
    const csvContent = csvParts.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `shielding_calculation_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

export async function exportToPDF(): Promise<void> {
    // Add validation warning
    if (!confirm('VALIDATION NOTICE:\n\nThis calculator is pending clinical validation. Exported results should NOT be used for clinical decisions without independent verification.\n\nDo you want to continue with the export?')) {
        return;
    }
    
    if (!appState.canvas) {
        alert('No floor plan loaded to export');
        return;
    }
    
    // Convert canvas to base64
    const imageDataUrl = appState.canvas.toDataURL('image/png');
    
    // Generate comprehensive report with embedded image
    const summaryReport = generateSummaryReport(imageDataUrl);
    
    // Open in new window/tab for direct printing
    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.write(summaryReport);
        printWindow.document.close();
        
        // Auto-trigger print dialog after a short delay
        setTimeout(() => {
            printWindow.print();
        }, 500);
    } else {
        // Fallback if popup blocked
        const blob = new Blob([summaryReport], { type: 'text/html;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        
        // Clean up after a delay
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
}

function generateSummaryReport(imageDataUrl?: string): string {
    const data = generateCSVData();
    const timestamp = new Date().toLocaleString();
    
    const validationWarning = `
        <div style="background: #fef3c7; border: 2px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 8px;">
            <h3 style="color: #92400e; margin: 0 0 10px 0;">⚠️ VALIDATION PENDING - NOT FOR CLINICAL USE</h3>
            <p style="color: #78350f; margin: 0;">This calculator is undergoing validation. All results must be independently verified by qualified professionals before any clinical use.</p>
        </div>
    `;
    
    let html = `
<!DOCTYPE html>
<html>
<head>
    <title>Radiation Shielding Calculation Report</title>
    <style>
        @media print {
            body { margin: 20px; }
            .no-print { display: none !important; }
            .page-break { page-break-before: always; }
        }
        body { font-family: Arial, sans-serif; margin: 40px; }
        h1, h2 { color: #333; }
        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .header { background-color: #1e3a8a; color: white; padding: 20px; margin: -40px -40px 40px -40px; }
        .summary { background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .meets-target { color: green; font-weight: bold; }
        .fails-target { color: red; font-weight: bold; }
        .floor-plan { margin: 20px 0; text-align: center; }
        .floor-plan img { max-width: 100%; height: auto; border: 1px solid #ddd; }
        .print-button { 
            position: fixed; 
            top: 20px; 
            right: 20px; 
            padding: 10px 20px; 
            background: #1e3a8a; 
            color: white; 
            border: none; 
            border-radius: 5px; 
            cursor: pointer; 
            font-size: 16px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        .print-button:hover { background: #1e40af; }
    </style>
</head>
<body>
    <button class="print-button no-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
    
    <div class="header">
        <h1>Radiation Shielding Calculation Report</h1>
        <p>Generated: ${timestamp}</p>
    </div>
    
    ${validationWarning}
    
    <div class="summary">
        <h2>Summary</h2>
        <ul>
            <li>Number of radiation sources: ${data.sources.length}</li>
            <li>Number of measurement points: ${data.measurementPoints.length}</li>
            <li>Number of barriers: ${data.barriers.length}</li>
            <li>Scale factor: ${appState.scaleFactor.toFixed(1)} pixels/meter</li>
        </ul>
    </div>
    
    ${imageDataUrl ? `
    <div class="floor-plan">
        <h2>Floor Plan Layout</h2>
        <img src="${imageDataUrl}" alt="Shielding Layout" />
    </div>
    ` : ''}
    
    <div class="page-break"></div>
    
    <h2>Radiation Sources</h2>
    <table>
        <tr>
            <th>ID</th>
            <th>Isotope</th>
            <th>Energy (keV)</th>
            <th>Activity (MBq)</th>
            <th>Position</th>
            <th>Dose Rate (µGy/hr at 1m per MBq)</th>
        </tr>`;
    
    data.sources.forEach(source => {
        html += `
        <tr>
            <td>${source.id}</td>
            <td>${source.isotope}</td>
            <td>${source.energy_keV}</td>
            <td>${source.activity_MBq}</td>
            <td>(${source.position_x}, ${source.position_y})</td>
            <td>${source.dose_rate_per_MBq}</td>
        </tr>`;
    });
    
    html += `
    </table>
    
    <h2>Measurement Points</h2>
    <table>
        <tr>
            <th>Name</th>
            <th>Position</th>
            <th>Occupancy</th>
            <th>Target Dose Rate (µGy/hr)</th>
        </tr>`;
    
    data.measurementPoints.forEach(point => {
        html += `
        <tr>
            <td>${point.name}</td>
            <td>(${point.position_x}, ${point.position_y})</td>
            <td>${(point.occupancy_factor * 100).toFixed(0)}%</td>
            <td>${point.target_dose_rate_uGy_hr}</td>
        </tr>`;
    });
    
    html += `
    </table>
    
    <h2>Barriers</h2>
    <table>
        <tr>
            <th>ID</th>
            <th>Material</th>
            <th>Thickness (mm)</th>
            <th>Start Position</th>
            <th>End Position</th>
        </tr>`;
    
    data.barriers.forEach(barrier => {
        html += `
        <tr>
            <td>${barrier.id}</td>
            <td>${barrier.material}</td>
            <td>${barrier.thickness_mm}</td>
            <td>(${barrier.start_x}, ${barrier.start_y})</td>
            <td>(${barrier.end_x}, ${barrier.end_y})</td>
        </tr>`;
    });
    
    html += `
    </table>
    
    <h2>Calculation Results</h2>
    <table>
        <tr>
            <th>Point</th>
            <th>Total Dose Rate (µGy/hr)</th>
            <th>Effective Dose Rate (µGy/hr)</th>
            <th>Target (µGy/hr)</th>
            <th>Meets Target?</th>
            <th>Required Lead (mm)</th>
            <th>Required Concrete (mm)</th>
        </tr>`;
    
    data.calculations.forEach(calc => {
        const meetsTarget = calc.meets_target === 'Yes';
        html += `
        <tr>
            <td>${calc.point_name}</td>
            <td>${calc.total_dose_rate_uGy_hr}</td>
            <td>${calc.effective_dose_rate_uGy_hr}</td>
            <td>${calc.target_dose_rate_uGy_hr}</td>
            <td class="${meetsTarget ? 'meets-target' : 'fails-target'}">${calc.meets_target}</td>
            <td>${calc.required_lead_mm || '0'}</td>
            <td>${calc.required_concrete_mm || '0'}</td>
        </tr>`;
    });
    
    html += `
    </table>
</body>
</html>`;
    
    return html;
}