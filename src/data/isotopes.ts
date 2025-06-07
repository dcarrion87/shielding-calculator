import type { Isotope } from '../types';
import { GAMMA_CONSTANT_CONVERSION } from '../utils/unit-conversions';

// Helper function to calculate dose rate at 1 meter per MBq
// Original gamma constant is in R·m²/(mCi·h), we need µGy·m²/(MBq·h)
function calculateDoseRatePerMBq(gammaConstant: number): number {
    // Convert to µGy·m²/(MBq·h) and then get dose rate at 1 meter
    const gammaConstantSI = gammaConstant * GAMMA_CONSTANT_CONVERSION * 1000; // Convert to µGy
    return gammaConstantSI; // This gives µGy/hr at 1 meter per MBq
}

export const ISOTOPES: Record<string, Isotope> = {
    'Tc-99m': {
        name: 'Technetium-99m',
        energy: 140,
        halfLife: 6.02,
        halfLifeUnit: 'hours',
        gammaConstant: 5.95e-6,
        doseRatePerMBq: calculateDoseRatePerMBq(5.95e-6),
        color: '#FF6B6B'
    },
    'I-131': {
        name: 'Iodine-131',
        energy: 364,
        halfLife: 193.2,
        halfLifeUnit: 'hours',
        gammaConstant: 2.17e-5,
        doseRatePerMBq: calculateDoseRatePerMBq(2.17e-5),
        color: '#4ECDC4'
    },
    'F-18': {
        name: 'Fluorine-18',
        energy: 511,
        halfLife: 1.83,
        halfLifeUnit: 'hours',
        gammaConstant: 5.7e-5,
        doseRatePerMBq: calculateDoseRatePerMBq(5.7e-5),
        color: '#45B7D1'
    },
    'I-123': {
        name: 'Iodine-123',
        energy: 159,
        halfLife: 13.2,
        halfLifeUnit: 'hours',
        gammaConstant: 7.4e-6,
        doseRatePerMBq: calculateDoseRatePerMBq(7.4e-6),
        color: '#96CEB4'
    },
    'Ga-67': {
        name: 'Gallium-67',
        energy: 184,
        halfLife: 78.3,
        halfLifeUnit: 'hours',
        gammaConstant: 8.9e-6,
        doseRatePerMBq: calculateDoseRatePerMBq(8.9e-6),
        color: '#FECA57'
    },
    'In-111': {
        name: 'Indium-111',
        energy: 245,
        halfLife: 67.3,
        halfLifeUnit: 'hours',
        gammaConstant: 2.8e-5,
        doseRatePerMBq: calculateDoseRatePerMBq(2.8e-5),
        color: '#9C88FF'
    }
} as const;