import { ISOTOPES } from '../data/isotopes';
import { ArcherEquation } from './archer';
import { distance } from './geometry';
import type { Source, Point } from '../types';

interface SourceWithPosition extends Source {
    position: Point;
}

interface BarrierWithGeometry {
    start: Point;
    end: Point;
    material: string;
    thickness: number;
}

interface ExposureData {
    totalExposure: number;
    sourceContributions: Record<string, number>;
    isotopeContributions: Record<string, number>;
}

/**
 * Calculate total exposure from multiple sources at a target point
 */
export function calculateExposureFromMultipleSources(
    sources: SourceWithPosition[], 
    targetPoint: Point, 
    barriers: BarrierWithGeometry[], 
    scaleFactor: number
): ExposureData {
    let totalExposure = 0.0;
    const sourceContributions: Record<string, number> = {};
    const isotopeContributions: Record<string, number> = {};
    
    for (const source of sources) {
        const isotopeKey = typeof source.isotope === 'string' ? source.isotope : source.isotope.name;
        const isotopeData = typeof source.isotope === 'string' 
            ? ISOTOPES[source.isotope] 
            : source.isotope;
            
        if (!isotopeData) continue;
        
        const distancePixels = distance(source.position, targetPoint);
        const distanceM = distancePixels / scaleFactor;
        
        const unshielded = ArcherEquation.calculateExposureRate(
            source.activity,
            distanceM,
            isotopeData.gammaConstant
        );
        
        const barrierTransmission = ArcherEquation.calculateBarrierAttenuation(
            barriers,
            source.position,
            targetPoint,
            isotopeData.energy
        );
        
        const shieldedExposure = unshielded * barrierTransmission;
        
        totalExposure += shieldedExposure;
        sourceContributions[source.id] = shieldedExposure;
        
        if (!isotopeContributions[isotopeKey]) {
            isotopeContributions[isotopeKey] = 0.0;
        }
        isotopeContributions[isotopeKey] += shieldedExposure;
    }
    
    return {
        totalExposure,
        sourceContributions,
        isotopeContributions
    };
}

/**
 * Generate a heatmap of radiation exposure across a grid
 */
export function generateHeatmapData(
    sources: SourceWithPosition[], 
    barriers: BarrierWithGeometry[], 
    scaleFactor: number, 
    gridWidth: number, 
    gridHeight: number, 
    resolution: number, 
    progressCallback?: (progress: number) => void
): number[] {
    const heatmap: number[] = [];
    const totalCells = gridWidth * gridHeight;
    let processedCells = 0;
    
    for (let i = 0; i < gridHeight; i++) {
        for (let j = 0; j < gridWidth; j++) {
            const x = j * resolution + resolution / 2;
            const y = i * resolution + resolution / 2;
            
            const exposureData = calculateExposureFromMultipleSources(
                sources,
                { x, y },
                barriers,
                scaleFactor
            );
            
            heatmap.push(exposureData.totalExposure);
            
            processedCells++;
            if (progressCallback && processedCells % 10 === 0) {
                progressCallback(processedCells / totalCells);
            }
        }
    }
    
    return heatmap;
}