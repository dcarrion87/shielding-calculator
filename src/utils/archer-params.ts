/**
 * Archer equation parameters management
 * These parameters control the buildup factor calculations
 */

export interface BuildupParameters {
    A: number;      // Amplitude factor
    alpha: number;  // Exponential factor
}

export interface ArcherParameters {
    buildupParams: Record<string, BuildupParameters>;
    useBuildup: boolean;
    customFormula?: string;
}

// Default buildup parameters based on empirical data
export const DEFAULT_BUILDUP_PARAMS: Record<string, BuildupParameters> = {
    lead: { A: 1.0, alpha: 0.1 },
    concrete: { A: 1.2, alpha: 0.08 },
    steel: { A: 1.1, alpha: 0.09 },
    plasterboard: { A: 1.3, alpha: 0.07 },
    glass: { A: 1.2, alpha: 0.08 },
    brick: { A: 1.2, alpha: 0.08 },
    wood: { A: 1.3, alpha: 0.06 }
};

class ArcherParametersManager {
    private parameters: ArcherParameters;
    
    constructor() {
        // Load from localStorage if available, otherwise use defaults
        const stored = localStorage.getItem('archerParameters');
        if (stored) {
            try {
                this.parameters = JSON.parse(stored);
            } catch {
                this.parameters = this.getDefaultParameters();
            }
        } else {
            this.parameters = this.getDefaultParameters();
        }
    }
    
    getDefaultParameters(): ArcherParameters {
        return {
            buildupParams: { ...DEFAULT_BUILDUP_PARAMS },
            useBuildup: true,
            customFormula: 'B(x) = A * exp(alpha * x)'
        };
    }
    
    getParameters(): ArcherParameters {
        return this.parameters;
    }
    
    getBuildupParams(material: string): BuildupParameters {
        return this.parameters.buildupParams[material] || { A: 1.2, alpha: 0.08 };
    }
    
    updateBuildupParam(material: string, param: 'A' | 'alpha', value: number): void {
        if (!this.parameters.buildupParams[material]) {
            this.parameters.buildupParams[material] = { A: 1.2, alpha: 0.08 };
        }
        this.parameters.buildupParams[material][param] = value;
        this.save();
    }
    
    setUseBuildup(use: boolean): void {
        this.parameters.useBuildup = use;
        this.save();
    }
    
    resetToDefaults(): void {
        this.parameters = this.getDefaultParameters();
        this.save();
    }
    
    private save(): void {
        localStorage.setItem('archerParameters', JSON.stringify(this.parameters));
    }
}

export const archerParams = new ArcherParametersManager();