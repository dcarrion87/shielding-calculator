import type { Material } from '../types';

interface MaterialData extends Material {
  attenuation: Record<number, number>;
  hvl: Record<number, number>;
}

export const MATERIALS: Record<string, MaterialData> = {
    lead: {
        name: 'Lead',
        density: 11.34,
        zeff: 82,
        color: '#4B4B4D',
        attenuation: {
            140: 25.67,
            159: 19.84,
            184: 14.23,
            245: 8.45,
            364: 3.41,
            511: 1.74
        },
        hvl: {
            140: 0.27,
            159: 0.35,
            184: 0.49,
            245: 0.82,
            364: 2.03,
            511: 3.98
        }
    },
    concrete: {
        name: 'Concrete',
        density: 2.35,
        zeff: 13,
        color: '#8B8B8B',
        attenuation: {
            140: 0.277,
            159: 0.249,
            184: 0.223,
            245: 0.193,
            364: 0.151,
            511: 0.124
        },
        hvl: {
            140: 25.0,
            159: 27.8,
            184: 31.1,
            245: 35.9,
            364: 45.9,
            511: 55.9
        }
    },
    steel: {
        name: 'Steel',
        density: 7.85,
        zeff: 26,
        color: '#71797E',
        attenuation: {
            140: 0.975,
            159: 0.873,
            184: 0.771,
            245: 0.643,
            364: 0.469,
            511: 0.373
        },
        hvl: {
            140: 7.1,
            159: 7.9,
            184: 9.0,
            245: 10.8,
            364: 14.8,
            511: 18.6
        }
    },
    plasterboard: {
        name: 'Plasterboard (Gypsum)',
        density: 0.96,
        zeff: 16,
        color: '#F5F5DC',
        attenuation: {
            140: 0.113,
            159: 0.102,
            184: 0.092,
            245: 0.080,
            364: 0.063,
            511: 0.052
        },
        hvl: {
            140: 61.0,
            159: 67.9,
            184: 75.3,
            245: 86.6,
            364: 110.0,
            511: 133.3
        }
    },
    glass: {
        name: 'Glass',
        density: 2.5,
        zeff: 14,
        color: '#ADD8E6',
        attenuation: {
            140: 0.385,
            159: 0.346,
            184: 0.309,
            245: 0.267,
            364: 0.209,
            511: 0.171
        },
        hvl: {
            140: 18.0,
            159: 20.0,
            184: 22.4,
            245: 26.0,
            364: 33.2,
            511: 40.5
        }
    },
    brick: {
        name: 'Brick',
        density: 1.92,
        zeff: 12,
        color: '#CB4154',
        attenuation: {
            140: 0.217,
            159: 0.195,
            184: 0.174,
            245: 0.151,
            364: 0.118,
            511: 0.097
        },
        hvl: {
            140: 32.0,
            159: 35.5,
            184: 39.8,
            245: 45.9,
            364: 58.7,
            511: 71.4
        }
    },
    wood: {
        name: 'Wood',
        density: 0.5,
        zeff: 6,
        color: '#DEB887',
        attenuation: {
            140: 0.060,
            159: 0.054,
            184: 0.048,
            245: 0.042,
            364: 0.033,
            511: 0.027
        },
        hvl: {
            140: 115.0,
            159: 128.3,
            184: 144.4,
            245: 165.0,
            364: 210.0,
            511: 256.6
        }
    }
} as const;

interface MaterialProperties {
    name: string;
    density: number;
    color: string;
    linearAttenuationCoefficient: number;
    halfValueLayer: number;
    tenthValueLayer: number;
}

export function getMaterialForEnergy(materialName: string, energy: number): MaterialProperties | null {
    const material = MATERIALS[materialName];
    if (!material) return null;
    
    const energies = Object.keys(material.attenuation).map(Number);
    const closestEnergy = energies.reduce((prev, curr) => 
        Math.abs(curr - energy) < Math.abs(prev - energy) ? curr : prev
    );
    
    return {
        name: material.name,
        density: material.density,
        color: material.color,
        linearAttenuationCoefficient: material.attenuation[closestEnergy],
        halfValueLayer: material.hvl[closestEnergy],
        tenthValueLayer: material.hvl[closestEnergy] * 3.32
    };
}