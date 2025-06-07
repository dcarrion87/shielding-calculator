export interface Isotope {
  name: string;
  energy: number;
  halfLife: number;
  halfLifeUnit: 'seconds' | 'minutes' | 'hours' | 'days' | 'years';
  gammaConstant: number;
  doseRatePerMBq?: number;  // µGy/hr at 1 meter per MBq
  color: string;
}

export interface Material {
  name: string;
  density: number;
  zeff: number;
  color: string;
}

export interface Source {
  id: string;
  x: number;
  y: number;
  isotope: Isotope;
  activity: number;
  createdAt: number;
}

export interface Barrier {
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  material: Material;
  thickness: number;
  createdAt: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface MeasurementPoint extends Point {
  id: string;
  occupancyFactor: number;  // 0-1, default 1.0 (100% occupancy)
  targetDoseRate: number;   // µGy/hr, default from global setting
  name?: string;            // Optional label for the point
}

export interface ExposureCalculation {
  exposureRate: number;
  attenuatedExposure: number;
  distanceM: number;
  pathThroughBarriers: Array<{
    barrier: Barrier;
    length: number;
  }>;
}

export type Mode = 'isotope' | 'barrier' | 'exposure' | 'heatmap';

export interface CanvasState {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  scale: number;
  offsetX: number;
  offsetY: number;
}