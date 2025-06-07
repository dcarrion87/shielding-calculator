/**
 * Unit conversion utilities for radiation measurements
 * Converting from US customary units to SI units
 */

// Activity conversions
export const ACTIVITY_CONVERSIONS = {
    mCi_TO_MBq: 37.0,           // 1 mCi = 37 MBq
    MBq_TO_mCi: 1 / 37.0,       // 1 MBq = 0.027 mCi
    mCi_TO_GBq: 0.037,          // 1 mCi = 0.037 GBq
    GBq_TO_mCi: 1 / 0.037,      // 1 GBq = 27.027 mCi
} as const;

// Exposure/Dose conversions
export const DOSE_CONVERSIONS = {
    mR_TO_uGy: 8.7,             // 1 mR ≈ 8.7 µGy (in air)
    uGy_TO_mR: 1 / 8.7,         // 1 µGy ≈ 0.115 mR
    mR_TO_uSv: 10.0,            // 1 mR ≈ 10 µSv (for gamma, tissue)
    uSv_TO_mR: 0.1,             // 1 µSv = 0.1 mR
} as const;

// Distance conversions
export const DISTANCE_CONVERSIONS = {
    cm_TO_mm: 10,               // 1 cm = 10 mm
    mm_TO_cm: 0.1,              // 1 mm = 0.1 cm
    m_TO_cm: 100,               // 1 m = 100 cm
    cm_TO_m: 0.01,              // 1 cm = 0.01 m
} as const;

// Gamma constant conversions
// Original: R·m²/(mCi·h) → New: µGy·m²/(MBq·h)
// Conversion factor: 1 R·m²/(mCi·h) = 8.7 µGy·m²/(37 MBq·h) = 0.235 µGy·m²/(MBq·h)
export const GAMMA_CONSTANT_CONVERSION = 0.235;

// Conversion functions
export function mCiToMBq(mCi: number): number {
    return mCi * ACTIVITY_CONVERSIONS.mCi_TO_MBq;
}

export function MBqToMCi(MBq: number): number {
    return MBq * ACTIVITY_CONVERSIONS.MBq_TO_mCi;
}

export function mRperHrToUGyperHr(mRperHr: number): number {
    return mRperHr * DOSE_CONVERSIONS.mR_TO_uGy;
}

export function uGyperHrToMRperHr(uGyperHr: number): number {
    return uGyperHr * DOSE_CONVERSIONS.uGy_TO_mR;
}

export function cmToMm(cm: number): number {
    return cm * DISTANCE_CONVERSIONS.cm_TO_mm;
}

export function mmToCm(mm: number): number {
    return mm * DISTANCE_CONVERSIONS.mm_TO_cm;
}

// Convert gamma constant from R·m²/(mCi·h) to µGy·m²/(MBq·h)
export function convertGammaConstant(oldConstant: number): number {
    return oldConstant * GAMMA_CONSTANT_CONVERSION;
}