import { ISOTOPES } from '../data/isotopes';
import { getMaterialForEnergy } from '../data/materials';
import { lineIntersection } from './geometry';
import type { Point } from '../types';
import { archerParams } from '../utils/archer-params';

interface MaterialProperties {
    name: string;
    density: number;
    color: string;
    linearAttenuationCoefficient: number;
    halfValueLayer: number;
    tenthValueLayer: number;
}

interface BarrierWithGeometry {
    start: Point;
    end: Point;
    material: string;
    thickness: number;
}

export class ArcherEquation {
    /**
     * Calculate exposure rate without shielding using inverse square law
     */
    static calculateExposureRate(activityMCi: number, distanceM: number, gammaConstant: number | null = null): number {
        if (distanceM === 0) return Infinity;
        
        if (gammaConstant === null) {
            gammaConstant = ISOTOPES['Tc-99m'].gammaConstant;
        }
        
        const exposureRate = (activityMCi * gammaConstant * 1e6) / (distanceM * distanceM);
        return exposureRate;
    }
    
    /**
     * Calculate buildup factor for broad beam geometry
     */
    static calculateBuildupFactor(thicknessHvl: number, material: string): number {
        const parameters = archerParams.getParameters();
        
        // Check if buildup is enabled
        if (!parameters.useBuildup) {
            return 1.0; // No buildup factor
        }
        
        const params = archerParams.getBuildupParams(material);
        const buildup = params.A * Math.exp(params.alpha * thicknessHvl);
        return buildup;
    }
    
    /**
     * Calculate transmission factor through shielding material including buildup
     */
    static calculateTransmissionWithBuildup(thicknessCm: number, material: MaterialProperties): number {
        const mu = material.linearAttenuationCoefficient;
        const thicknessHvl = thicknessCm / (material.halfValueLayer / 10);
        
        const transmission = Math.exp(-mu * thicknessCm);
        
        const materialName = material.name.toLowerCase().split(' ')[0];
        const buildup = this.calculateBuildupFactor(thicknessHvl, materialName);
        
        const totalTransmission = transmission * buildup;
        return totalTransmission;
    }
    
    /**
     * Calculate total attenuation through multiple barriers
     */
    static calculateBarrierAttenuation(
        barriers: BarrierWithGeometry[], 
        source: Point, 
        target: Point, 
        energy: number
    ): number {
        let totalTransmission = 1.0;
        
        for (const barrier of barriers) {
            const intersection = lineIntersection(
                source, target, 
                barrier.start, barrier.end
            );
            
            if (intersection) {
                const material = getMaterialForEnergy(barrier.material, energy);
                if (material) {
                    const transmission = this.calculateTransmissionWithBuildup(
                        barrier.thickness, material
                    );
                    totalTransmission *= transmission;
                }
            }
        }
        
        return totalTransmission;
    }
    
    /**
     * Calculate required shielding thickness to achieve target exposure
     */
    static calculateRequiredShielding(
        activityMCi: number, 
        distanceM: number, 
        targetExposureMr: number, 
        material: MaterialProperties
    ): number {
        const unshieldedExposure = this.calculateExposureRate(activityMCi, distanceM);
        
        if (targetExposureMr >= unshieldedExposure) {
            return 0.0;
        }
        
        const transmissionRequired = targetExposureMr / unshieldedExposure;
        
        const mu = material.linearAttenuationCoefficient;
        const thicknessEstimate = -Math.log(transmissionRequired) / mu;
        
        const thicknessHvl = thicknessEstimate / (material.halfValueLayer / 10);
        const materialName = material.name.toLowerCase().split(' ')[0];
        const buildup = this.calculateBuildupFactor(thicknessHvl, materialName);
        
        const adjustedTransmission = transmissionRequired / buildup;
        if (adjustedTransmission <= 0 || adjustedTransmission >= 1) {
            return thicknessEstimate;
        }
        
        const thickness = -Math.log(adjustedTransmission) / mu;
        return Math.max(0, thickness);
    }
}