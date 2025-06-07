import { ISOTOPES } from '../data/isotopes';
import { MATERIALS } from '../data/materials';

export const ISOTOPE_COLORS = Object.entries(ISOTOPES).reduce<Record<string, string>>((colors, [key, isotope]) => {
    colors[key] = isotope.color;
    return colors;
}, {});

export const MATERIAL_COLORS = Object.entries(MATERIALS).reduce<Record<string, string>>((colors, [key, material]) => {
    colors[key] = material.color;
    return colors;
}, {});

export const MODES = {
    CALIBRATE: 'calibrate',
    SOURCE: 'source',
    MEASURE: 'measure',
    BARRIER: 'barrier',
    HEATMAP: 'heatmap'
} as const;

export type ModeType = typeof MODES[keyof typeof MODES];