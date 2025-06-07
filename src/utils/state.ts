import { MODES, ModeType } from './constants';
import type { Source, Barrier, Point, MeasurementPoint } from '../types';

interface HeatmapData {
    width: number;
    height: number;
    data: number[][];
    maxValue: number;
    resolution: number;
}

class AppState {
    mode: ModeType;
    image: HTMLImageElement | null;
    scaleFactor: number;
    calibrationPoints: Point[];
    sources: Source[];
    measurementPoints: MeasurementPoint[];
    barriers: Barrier[];
    barrierStart: Point | null;
    heatmapData: HeatmapData | null;
    heatmapOverlay: HTMLCanvasElement | null;
    canvas: HTMLCanvasElement | null;
    ctx: CanvasRenderingContext2D | null;
    imageScale: number;
    imageOffset: Point;
    zoomLevel: number;

    constructor() {
        this.mode = MODES.CALIBRATE;
        this.image = null;
        this.scaleFactor = 1.0;
        this.calibrationPoints = [];
        this.sources = [];
        this.measurementPoints = [];
        this.barriers = [];
        this.barrierStart = null;
        this.heatmapData = null;
        this.heatmapOverlay = null;
        this.canvas = null;
        this.ctx = null;
        this.imageScale = 1.0;
        this.imageOffset = { x: 0, y: 0 };
        this.zoomLevel = 1.0;
    }

    reset(): void {
        this.calibrationPoints = [];
        this.sources = [];
        this.measurementPoints = [];
        this.barriers = [];
        this.barrierStart = null;
        this.scaleFactor = 1.0;
        this.heatmapData = null;
        this.heatmapOverlay = null;
        this.imageScale = 1.0;
        this.imageOffset = { x: 0, y: 0 };
        this.zoomLevel = 1.0;
    }

    setCanvas(canvas: HTMLCanvasElement): void {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
    }

    setMode(mode: ModeType): void {
        this.mode = mode;
        this.barrierStart = null;
    }

    addCalibrationPoint(point: Point): void {
        this.calibrationPoints.push(point);
        if (this.calibrationPoints.length > 2) {
            this.calibrationPoints = this.calibrationPoints.slice(-2);
        }
    }

    addSource(source: Source): void {
        this.sources.push(source);
    }

    removeSource(index: number): void {
        this.sources.splice(index, 1);
    }

    addMeasurementPoint(point: Point): void {
        // Get default target dose from the global setting
        const targetInput = document.getElementById('target') as HTMLInputElement;
        const defaultTarget = parseFloat(targetInput?.value || '20');
        
        const measurementPoint: MeasurementPoint = {
            ...point,
            id: this.generateId(),
            occupancyFactor: 1.0,  // Default 100% occupancy
            targetDoseRate: defaultTarget,
            name: `P${this.measurementPoints.length + 1}`
        };
        this.measurementPoints.push(measurementPoint);
    }
    
    updateMeasurementPoint(index: number, updates: Partial<MeasurementPoint>): void {
        if (index >= 0 && index < this.measurementPoints.length) {
            this.measurementPoints[index] = {
                ...this.measurementPoints[index],
                ...updates
            };
        }
    }
    
    removeMeasurementPoint(index: number): void {
        this.measurementPoints.splice(index, 1);
    }

    addBarrier(barrier: Barrier): void {
        this.barriers.push(barrier);
    }

    removeBarrier(index: number): void {
        this.barriers.splice(index, 1);
    }

    generateId(): string {
        return Math.random().toString(36).substring(2, 11);
    }
}

export const appState = new AppState();