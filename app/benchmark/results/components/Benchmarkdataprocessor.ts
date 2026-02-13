// results/components/BenchmarkDataProcessor.ts
import type {
    PCSpecs,
    BenchmarkData,
    BenchmarkResults,
    BenchmarkResult,
    GPUInfo
} from '../../types/types';

// ================= RAW DATA INTERFACES =================

interface RawSystemInfo {
    navigator?: {
        hardwareConcurrency?: number;
        deviceMemory?: number;
        platform?: string;
        userAgent?: string;
    };
    screen?: {
        width?: number;
        height?: number;
    };
}

interface RawGPUData {
    vendor?: string;
    renderer?: string;
    version?: string;
    shadingLanguageVersion?: string;
    maxTextureSize?: number;
    maxViewportDims?: [number, number];
    maxAnisotropy?: number;
    extensions?: string[];
    supportedExtensions?: string[];
}

interface RawBenchmarkRun {
    testName: string;
    startTime: number;
    endTime: number;
    tokenCount: number;
    wordCount: number;
    modelUsed?: string;
    loadTimeMs?: number;
    prompt?: string;
    response?: string;
}

export interface RawBenchmarkSession {
    systemInfo: RawSystemInfo;
    gpuInfo: RawGPUData;
    benchmarkRuns: RawBenchmarkRun[];
    timestamp: number;
    detectedGPUInfo?: GPUInfo | null;
}

// ================= PROCESSOR RETURN TYPE =================

export interface ProcessedSession {
    systemSpecs: PCSpecs;
    benchmarkData: BenchmarkData;
    benchmarkResults: BenchmarkResults;
    fullGPUInfo: GPUInfo;
}

// ================= GPU DATABASE =================
// Single source of truth: every GPU we recognize, its display name, brand, VRAM, and type.

interface GPUEntry {
    displayName: string;
    brand: string;
    vram: string;
    type: 'discrete' | 'integrated' | 'unified' | 'mobile' | 'datacenter';
}

// Keys are lowercase match strings. Sorted by specificity (longer/more-specific first)
// at lookup time, not definition time.
const GPU_DATABASE: Record<string, GPUEntry> = {
    // ── NVIDIA GeForce RTX 50 Series ──
    'rtx 5090': { displayName: 'NVIDIA RTX 5090', brand: 'NVIDIA', vram: '32 GB', type: 'discrete' },
    'rtx 5080': { displayName: 'NVIDIA RTX 5080', brand: 'NVIDIA', vram: '16 GB', type: 'discrete' },
    'rtx 5070 ti': { displayName: 'NVIDIA RTX 5070 Ti', brand: 'NVIDIA', vram: '16 GB', type: 'discrete' },
    'rtx 5070': { displayName: 'NVIDIA RTX 5070', brand: 'NVIDIA', vram: '12 GB', type: 'discrete' },
    'rtx 5060 ti': { displayName: 'NVIDIA RTX 5060 Ti', brand: 'NVIDIA', vram: '16 GB', type: 'discrete' },
    'rtx 5060': { displayName: 'NVIDIA RTX 5060', brand: 'NVIDIA', vram: '8 GB', type: 'discrete' },

    // ── NVIDIA GeForce RTX 40 Series ──
    'rtx 4090': { displayName: 'NVIDIA RTX 4090', brand: 'NVIDIA', vram: '24 GB', type: 'discrete' },
    'rtx 4080 super': { displayName: 'NVIDIA RTX 4080 Super', brand: 'NVIDIA', vram: '16 GB', type: 'discrete' },
    'rtx 4080': { displayName: 'NVIDIA RTX 4080', brand: 'NVIDIA', vram: '16 GB', type: 'discrete' },
    'rtx 4070 ti super': { displayName: 'NVIDIA RTX 4070 Ti Super', brand: 'NVIDIA', vram: '16 GB', type: 'discrete' },
    'rtx 4070 ti': { displayName: 'NVIDIA RTX 4070 Ti', brand: 'NVIDIA', vram: '12 GB', type: 'discrete' },
    'rtx 4070 super': { displayName: 'NVIDIA RTX 4070 Super', brand: 'NVIDIA', vram: '12 GB', type: 'discrete' },
    'rtx 4070': { displayName: 'NVIDIA RTX 4070', brand: 'NVIDIA', vram: '12 GB', type: 'discrete' },
    'rtx 4060 ti': { displayName: 'NVIDIA RTX 4060 Ti', brand: 'NVIDIA', vram: '8 GB / 16 GB', type: 'discrete' },
    'rtx 4060': { displayName: 'NVIDIA RTX 4060', brand: 'NVIDIA', vram: '8 GB', type: 'discrete' },

    // ── NVIDIA GeForce RTX 30 Series ──
    'rtx 3090 ti': { displayName: 'NVIDIA RTX 3090 Ti', brand: 'NVIDIA', vram: '24 GB', type: 'discrete' },
    'rtx 3090': { displayName: 'NVIDIA RTX 3090', brand: 'NVIDIA', vram: '24 GB', type: 'discrete' },
    'rtx 3080 ti': { displayName: 'NVIDIA RTX 3080 Ti', brand: 'NVIDIA', vram: '12 GB', type: 'discrete' },
    'rtx 3080': { displayName: 'NVIDIA RTX 3080', brand: 'NVIDIA', vram: '10 GB / 12 GB', type: 'discrete' },
    'rtx 3070 ti': { displayName: 'NVIDIA RTX 3070 Ti', brand: 'NVIDIA', vram: '8 GB', type: 'discrete' },
    'rtx 3070': { displayName: 'NVIDIA RTX 3070', brand: 'NVIDIA', vram: '8 GB', type: 'discrete' },
    'rtx 3060 ti': { displayName: 'NVIDIA RTX 3060 Ti', brand: 'NVIDIA', vram: '8 GB', type: 'discrete' },
    'rtx 3060': { displayName: 'NVIDIA RTX 3060', brand: 'NVIDIA', vram: '12 GB', type: 'discrete' },
    'rtx 3050': { displayName: 'NVIDIA RTX 3050', brand: 'NVIDIA', vram: '8 GB', type: 'discrete' },

    // ── NVIDIA GeForce RTX 20 Series ──
    'rtx 2080 ti': { displayName: 'NVIDIA RTX 2080 Ti', brand: 'NVIDIA', vram: '11 GB', type: 'discrete' },
    'rtx 2080 super': { displayName: 'NVIDIA RTX 2080 Super', brand: 'NVIDIA', vram: '8 GB', type: 'discrete' },
    'rtx 2080': { displayName: 'NVIDIA RTX 2080', brand: 'NVIDIA', vram: '8 GB', type: 'discrete' },
    'rtx 2070 super': { displayName: 'NVIDIA RTX 2070 Super', brand: 'NVIDIA', vram: '8 GB', type: 'discrete' },
    'rtx 2070': { displayName: 'NVIDIA RTX 2070', brand: 'NVIDIA', vram: '8 GB', type: 'discrete' },
    'rtx 2060 super': { displayName: 'NVIDIA RTX 2060 Super', brand: 'NVIDIA', vram: '8 GB', type: 'discrete' },
    'rtx 2060': { displayName: 'NVIDIA RTX 2060', brand: 'NVIDIA', vram: '6 GB', type: 'discrete' },

    // ── NVIDIA GeForce GTX 16 Series ──
    'gtx 1660 ti': { displayName: 'NVIDIA GTX 1660 Ti', brand: 'NVIDIA', vram: '6 GB', type: 'discrete' },
    'gtx 1660 super': { displayName: 'NVIDIA GTX 1660 Super', brand: 'NVIDIA', vram: '6 GB', type: 'discrete' },
    'gtx 1660': { displayName: 'NVIDIA GTX 1660', brand: 'NVIDIA', vram: '6 GB', type: 'discrete' },
    'gtx 1650 super': { displayName: 'NVIDIA GTX 1650 Super', brand: 'NVIDIA', vram: '4 GB', type: 'discrete' },
    'gtx 1650': { displayName: 'NVIDIA GTX 1650', brand: 'NVIDIA', vram: '4 GB', type: 'discrete' },

    // ── NVIDIA GeForce GTX 10 Series ──
    'gtx 1080 ti': { displayName: 'NVIDIA GTX 1080 Ti', brand: 'NVIDIA', vram: '11 GB', type: 'discrete' },
    'gtx 1080': { displayName: 'NVIDIA GTX 1080', brand: 'NVIDIA', vram: '8 GB', type: 'discrete' },
    'gtx 1070 ti': { displayName: 'NVIDIA GTX 1070 Ti', brand: 'NVIDIA', vram: '8 GB', type: 'discrete' },
    'gtx 1070': { displayName: 'NVIDIA GTX 1070', brand: 'NVIDIA', vram: '8 GB', type: 'discrete' },
    'gtx 1060': { displayName: 'NVIDIA GTX 1060', brand: 'NVIDIA', vram: '3 GB / 6 GB', type: 'discrete' },
    'gtx 1050 ti': { displayName: 'NVIDIA GTX 1050 Ti', brand: 'NVIDIA', vram: '4 GB', type: 'discrete' },
    'gtx 1050': { displayName: 'NVIDIA GTX 1050', brand: 'NVIDIA', vram: '2 GB', type: 'discrete' },

    // ── NVIDIA GeForce GTX 9 Series ──
    'gtx 980 ti': { displayName: 'NVIDIA GTX 980 Ti', brand: 'NVIDIA', vram: '6 GB', type: 'discrete' },
    'gtx 980': { displayName: 'NVIDIA GTX 980', brand: 'NVIDIA', vram: '4 GB', type: 'discrete' },
    'gtx 970': { displayName: 'NVIDIA GTX 970', brand: 'NVIDIA', vram: '4 GB', type: 'discrete' },
    'gtx 960': { displayName: 'NVIDIA GTX 960', brand: 'NVIDIA', vram: '2 GB / 4 GB', type: 'discrete' },
    'gtx 950': { displayName: 'NVIDIA GTX 950', brand: 'NVIDIA', vram: '2 GB', type: 'discrete' },

    // ── NVIDIA GeForce GTX 7 Series ──
    'gtx 780 ti': { displayName: 'NVIDIA GTX 780 Ti', brand: 'NVIDIA', vram: '3 GB', type: 'discrete' },
    'gtx 780': { displayName: 'NVIDIA GTX 780', brand: 'NVIDIA', vram: '3 GB', type: 'discrete' },
    'gtx 770': { displayName: 'NVIDIA GTX 770', brand: 'NVIDIA', vram: '2 GB / 4 GB', type: 'discrete' },
    'gtx 760': { displayName: 'NVIDIA GTX 760', brand: 'NVIDIA', vram: '2 GB', type: 'discrete' },
    'gtx 750 ti': { displayName: 'NVIDIA GTX 750 Ti', brand: 'NVIDIA', vram: '2 GB', type: 'discrete' },
    'gtx 750': { displayName: 'NVIDIA GTX 750', brand: 'NVIDIA', vram: '1 GB / 2 GB', type: 'discrete' },

    // ── NVIDIA Legacy ──
    'gt 1030': { displayName: 'NVIDIA GT 1030', brand: 'NVIDIA', vram: '2 GB', type: 'discrete' },
    'gt 730': { displayName: 'NVIDIA GT 730', brand: 'NVIDIA', vram: '1 GB / 2 GB / 4 GB', type: 'discrete' },
    'gt 710': { displayName: 'NVIDIA GT 710', brand: 'NVIDIA', vram: '1 GB / 2 GB', type: 'discrete' },

    // ── NVIDIA TITAN ──
    'titan rtx': { displayName: 'NVIDIA TITAN RTX', brand: 'NVIDIA', vram: '24 GB', type: 'discrete' },
    'titan v': { displayName: 'NVIDIA TITAN V', brand: 'NVIDIA', vram: '12 GB', type: 'discrete' },
    'titan xp': { displayName: 'NVIDIA TITAN Xp', brand: 'NVIDIA', vram: '12 GB', type: 'discrete' },
    'titan x': { displayName: 'NVIDIA TITAN X', brand: 'NVIDIA', vram: '12 GB', type: 'discrete' },

    // ── NVIDIA Professional / Data Center ──
    'h100': { displayName: 'NVIDIA H100', brand: 'NVIDIA', vram: '80 GB', type: 'datacenter' },
    'a100': { displayName: 'NVIDIA A100', brand: 'NVIDIA', vram: '40 GB / 80 GB', type: 'datacenter' },
    'l40': { displayName: 'NVIDIA L40', brand: 'NVIDIA', vram: '48 GB', type: 'datacenter' },
    'l4': { displayName: 'NVIDIA L4', brand: 'NVIDIA', vram: '24 GB', type: 'datacenter' },
    'rtx a6000': { displayName: 'NVIDIA RTX A6000', brand: 'NVIDIA', vram: '48 GB', type: 'discrete' },
    'rtx a5000': { displayName: 'NVIDIA RTX A5000', brand: 'NVIDIA', vram: '24 GB', type: 'discrete' },
    'rtx a4000': { displayName: 'NVIDIA RTX A4000', brand: 'NVIDIA', vram: '16 GB', type: 'discrete' },
    'rtx a2000': { displayName: 'NVIDIA RTX A2000', brand: 'NVIDIA', vram: '6 GB / 12 GB', type: 'discrete' },
    'quadro rtx 8000': { displayName: 'NVIDIA Quadro RTX 8000', brand: 'NVIDIA', vram: '48 GB', type: 'discrete' },
    'quadro rtx 6000': { displayName: 'NVIDIA Quadro RTX 6000', brand: 'NVIDIA', vram: '24 GB', type: 'discrete' },
    'quadro rtx 5000': { displayName: 'NVIDIA Quadro RTX 5000', brand: 'NVIDIA', vram: '16 GB', type: 'discrete' },
    'quadro rtx 4000': { displayName: 'NVIDIA Quadro RTX 4000', brand: 'NVIDIA', vram: '8 GB', type: 'discrete' },
    'quadro p6000': { displayName: 'NVIDIA Quadro P6000', brand: 'NVIDIA', vram: '24 GB', type: 'discrete' },
    'quadro p5000': { displayName: 'NVIDIA Quadro P5000', brand: 'NVIDIA', vram: '16 GB', type: 'discrete' },
    'quadro p4000': { displayName: 'NVIDIA Quadro P4000', brand: 'NVIDIA', vram: '8 GB', type: 'discrete' },
    'quadro p2000': { displayName: 'NVIDIA Quadro P2000', brand: 'NVIDIA', vram: '5 GB', type: 'discrete' },
    'quadro k6000': { displayName: 'NVIDIA Quadro K6000', brand: 'NVIDIA', vram: '12 GB', type: 'discrete' },
    'quadro k5200': { displayName: 'NVIDIA Quadro K5200', brand: 'NVIDIA', vram: '8 GB', type: 'discrete' },
    't600': { displayName: 'NVIDIA T600', brand: 'NVIDIA', vram: '4 GB', type: 'discrete' },
    't1000': { displayName: 'NVIDIA T1000', brand: 'NVIDIA', vram: '4 GB / 8 GB', type: 'discrete' },

    // ── NVIDIA Laptop GPUs ──
    'rtx 4090 laptop': { displayName: 'NVIDIA RTX 4090 Laptop', brand: 'NVIDIA', vram: '16 GB', type: 'mobile' },
    'rtx 4080 laptop': { displayName: 'NVIDIA RTX 4080 Laptop', brand: 'NVIDIA', vram: '12 GB', type: 'mobile' },
    'rtx 4070 laptop': { displayName: 'NVIDIA RTX 4070 Laptop', brand: 'NVIDIA', vram: '8 GB', type: 'mobile' },
    'rtx 4060 laptop': { displayName: 'NVIDIA RTX 4060 Laptop', brand: 'NVIDIA', vram: '8 GB', type: 'mobile' },
    'rtx 4050 laptop': { displayName: 'NVIDIA RTX 4050 Laptop', brand: 'NVIDIA', vram: '6 GB', type: 'mobile' },
    'rtx 3080 laptop': { displayName: 'NVIDIA RTX 3080 Laptop', brand: 'NVIDIA', vram: '8 GB / 16 GB', type: 'mobile' },
    'rtx 3070 laptop': { displayName: 'NVIDIA RTX 3070 Laptop', brand: 'NVIDIA', vram: '8 GB', type: 'mobile' },
    'rtx 3060 laptop': { displayName: 'NVIDIA RTX 3060 Laptop', brand: 'NVIDIA', vram: '6 GB', type: 'mobile' },
    'rtx 3050 laptop': { displayName: 'NVIDIA RTX 3050 Laptop', brand: 'NVIDIA', vram: '4 GB / 6 GB', type: 'mobile' },
    'rtx 2080 mobile': { displayName: 'NVIDIA RTX 2080 Mobile', brand: 'NVIDIA', vram: '8 GB', type: 'mobile' },
    'rtx 2070 mobile': { displayName: 'NVIDIA RTX 2070 Mobile', brand: 'NVIDIA', vram: '8 GB', type: 'mobile' },
    'rtx 2060 mobile': { displayName: 'NVIDIA RTX 2060 Mobile', brand: 'NVIDIA', vram: '6 GB', type: 'mobile' },
    'gtx 1660 ti mobile': { displayName: 'NVIDIA GTX 1660 Ti Mobile', brand: 'NVIDIA', vram: '6 GB', type: 'mobile' },
    'gtx 1650 mobile': { displayName: 'NVIDIA GTX 1650 Mobile', brand: 'NVIDIA', vram: '4 GB', type: 'mobile' },

    // ── NVIDIA Tegra (mobile/Switch) ──
    'tegra x2': { displayName: 'NVIDIA Tegra X2', brand: 'NVIDIA', vram: 'Shared Memory', type: 'mobile' },
    'tegra x1': { displayName: 'NVIDIA Tegra X1', brand: 'NVIDIA', vram: 'Shared Memory', type: 'mobile' },

    // ── AMD Radeon RX 9000 Series ──
    'rx 9070 xt': { displayName: 'AMD Radeon RX 9070 XT', brand: 'AMD', vram: '16 GB', type: 'discrete' },
    'rx 9070': { displayName: 'AMD Radeon RX 9070', brand: 'AMD', vram: '16 GB', type: 'discrete' },

    // ── AMD Radeon RX 7000 Series ──
    'rx 7900 xtx': { displayName: 'AMD Radeon RX 7900 XTX', brand: 'AMD', vram: '24 GB', type: 'discrete' },
    'rx 7900 xt': { displayName: 'AMD Radeon RX 7900 XT', brand: 'AMD', vram: '20 GB', type: 'discrete' },
    'rx 7900 gre': { displayName: 'AMD Radeon RX 7900 GRE', brand: 'AMD', vram: '16 GB', type: 'discrete' },
    'rx 7800 xt': { displayName: 'AMD Radeon RX 7800 XT', brand: 'AMD', vram: '16 GB', type: 'discrete' },
    'rx 7700 xt': { displayName: 'AMD Radeon RX 7700 XT', brand: 'AMD', vram: '12 GB', type: 'discrete' },
    'rx 7600 xt': { displayName: 'AMD Radeon RX 7600 XT', brand: 'AMD', vram: '16 GB', type: 'discrete' },
    'rx 7600': { displayName: 'AMD Radeon RX 7600', brand: 'AMD', vram: '8 GB', type: 'discrete' },

    // ── AMD Radeon RX 6000 Series ──
    'rx 6950 xt': { displayName: 'AMD Radeon RX 6950 XT', brand: 'AMD', vram: '16 GB', type: 'discrete' },
    'rx 6900 xt': { displayName: 'AMD Radeon RX 6900 XT', brand: 'AMD', vram: '16 GB', type: 'discrete' },
    'rx 6800 xt': { displayName: 'AMD Radeon RX 6800 XT', brand: 'AMD', vram: '16 GB', type: 'discrete' },
    'rx 6800': { displayName: 'AMD Radeon RX 6800', brand: 'AMD', vram: '16 GB', type: 'discrete' },
    'rx 6750 xt': { displayName: 'AMD Radeon RX 6750 XT', brand: 'AMD', vram: '12 GB', type: 'discrete' },
    'rx 6700 xt': { displayName: 'AMD Radeon RX 6700 XT', brand: 'AMD', vram: '12 GB', type: 'discrete' },
    'rx 6700': { displayName: 'AMD Radeon RX 6700', brand: 'AMD', vram: '10 GB', type: 'discrete' },
    'rx 6650 xt': { displayName: 'AMD Radeon RX 6650 XT', brand: 'AMD', vram: '8 GB', type: 'discrete' },
    'rx 6600 xt': { displayName: 'AMD Radeon RX 6600 XT', brand: 'AMD', vram: '8 GB', type: 'discrete' },
    'rx 6600': { displayName: 'AMD Radeon RX 6600', brand: 'AMD', vram: '8 GB', type: 'discrete' },
    'rx 6500 xt': { displayName: 'AMD Radeon RX 6500 XT', brand: 'AMD', vram: '4 GB', type: 'discrete' },
    'rx 6400': { displayName: 'AMD Radeon RX 6400', brand: 'AMD', vram: '4 GB', type: 'discrete' },

    // ── AMD Radeon RX 5000 Series ──
    'rx 5700 xt': { displayName: 'AMD Radeon RX 5700 XT', brand: 'AMD', vram: '8 GB', type: 'discrete' },
    'rx 5700': { displayName: 'AMD Radeon RX 5700', brand: 'AMD', vram: '8 GB', type: 'discrete' },
    'rx 5600 xt': { displayName: 'AMD Radeon RX 5600 XT', brand: 'AMD', vram: '6 GB', type: 'discrete' },
    'rx 5500 xt': { displayName: 'AMD Radeon RX 5500 XT', brand: 'AMD', vram: '4 GB / 8 GB', type: 'discrete' },

    // ── AMD Radeon RX Vega / 500 Series ──
    'rx vega 64': { displayName: 'AMD Radeon RX Vega 64', brand: 'AMD', vram: '8 GB', type: 'discrete' },
    'rx vega 56': { displayName: 'AMD Radeon RX Vega 56', brand: 'AMD', vram: '8 GB', type: 'discrete' },
    'rx 590': { displayName: 'AMD Radeon RX 590', brand: 'AMD', vram: '8 GB', type: 'discrete' },
    'rx 580': { displayName: 'AMD Radeon RX 580', brand: 'AMD', vram: '4 GB / 8 GB', type: 'discrete' },
    'rx 570': { displayName: 'AMD Radeon RX 570', brand: 'AMD', vram: '4 GB / 8 GB', type: 'discrete' },
    'rx 560': { displayName: 'AMD Radeon RX 560', brand: 'AMD', vram: '2 GB / 4 GB', type: 'discrete' },
    'rx 550': { displayName: 'AMD Radeon RX 550', brand: 'AMD', vram: '2 GB / 4 GB', type: 'discrete' },

    // ── AMD Radeon R9 / R7 ──
    'r9 fury x': { displayName: 'AMD Radeon R9 Fury X', brand: 'AMD', vram: '4 GB HBM', type: 'discrete' },
    'r9 fury': { displayName: 'AMD Radeon R9 Fury', brand: 'AMD', vram: '4 GB HBM', type: 'discrete' },
    'r9 390x': { displayName: 'AMD Radeon R9 390X', brand: 'AMD', vram: '8 GB', type: 'discrete' },
    'r9 390': { displayName: 'AMD Radeon R9 390', brand: 'AMD', vram: '8 GB', type: 'discrete' },
    'r9 380x': { displayName: 'AMD Radeon R9 380X', brand: 'AMD', vram: '4 GB', type: 'discrete' },
    'r9 380': { displayName: 'AMD Radeon R9 380', brand: 'AMD', vram: '2 GB / 4 GB', type: 'discrete' },
    'r9 290x': { displayName: 'AMD Radeon R9 290X', brand: 'AMD', vram: '4 GB', type: 'discrete' },
    'r9 290': { displayName: 'AMD Radeon R9 290', brand: 'AMD', vram: '4 GB', type: 'discrete' },
    'r7 370': { displayName: 'AMD Radeon R7 370', brand: 'AMD', vram: '2 GB / 4 GB', type: 'discrete' },
    'r7 360': { displayName: 'AMD Radeon R7 360', brand: 'AMD', vram: '2 GB', type: 'discrete' },

    // ── AMD Radeon Pro ──
    'radeon pro w7900': { displayName: 'AMD Radeon Pro W7900', brand: 'AMD', vram: '48 GB', type: 'discrete' },
    'radeon pro w7800': { displayName: 'AMD Radeon Pro W7800', brand: 'AMD', vram: '32 GB', type: 'discrete' },
    'radeon pro w7700': { displayName: 'AMD Radeon Pro W7700', brand: 'AMD', vram: '16 GB', type: 'discrete' },
    'radeon pro w7600': { displayName: 'AMD Radeon Pro W7600', brand: 'AMD', vram: '8 GB', type: 'discrete' },
    'radeon pro w6800': { displayName: 'AMD Radeon Pro W6800', brand: 'AMD', vram: '32 GB', type: 'discrete' },
    'radeon pro w6600': { displayName: 'AMD Radeon Pro W6600', brand: 'AMD', vram: '8 GB', type: 'discrete' },
    'radeon pro 5500m': { displayName: 'AMD Radeon Pro 5500M', brand: 'AMD', vram: '4 GB / 8 GB', type: 'mobile' },
    'radeon pro 5300m': { displayName: 'AMD Radeon Pro 5300M', brand: 'AMD', vram: '4 GB', type: 'mobile' },
    'radeon pro vega 20': { displayName: 'AMD Radeon Pro Vega 20', brand: 'AMD', vram: '4 GB', type: 'mobile' },
    'radeon pro vega 16': { displayName: 'AMD Radeon Pro Vega 16', brand: 'AMD', vram: '4 GB', type: 'mobile' },
    'radeon pro 580': { displayName: 'AMD Radeon Pro 580', brand: 'AMD', vram: '8 GB', type: 'discrete' },
    'radeon pro 560x': { displayName: 'AMD Radeon Pro 560X', brand: 'AMD', vram: '4 GB', type: 'mobile' },

    // ── AMD Integrated GPUs ──
    'rx 890m': { displayName: 'AMD Radeon RX 890M (Integrated)', brand: 'AMD', vram: 'Shared Memory', type: 'integrated' },
    'rx 780m': { displayName: 'AMD Radeon RX 780M (Integrated)', brand: 'AMD', vram: 'Shared Memory', type: 'integrated' },
    'rx 680m': { displayName: 'AMD Radeon RX 680M (Integrated)', brand: 'AMD', vram: 'Shared Memory', type: 'integrated' },
    'rx 660m': { displayName: 'AMD Radeon RX 660M (Integrated)', brand: 'AMD', vram: 'Shared Memory', type: 'integrated' },
    'radeon 610m': { displayName: 'AMD Radeon 610M (Integrated)', brand: 'AMD', vram: 'Shared Memory', type: 'integrated' },
    'vega 11': { displayName: 'AMD Radeon Vega 11 (Integrated)', brand: 'AMD', vram: 'Shared Memory', type: 'integrated' },
    'vega 10': { displayName: 'AMD Radeon Vega 10 (Integrated)', brand: 'AMD', vram: 'Shared Memory', type: 'integrated' },
    'vega 8': { displayName: 'AMD Radeon Vega 8 (Integrated)', brand: 'AMD', vram: 'Shared Memory', type: 'integrated' },
    'vega 7': { displayName: 'AMD Radeon Vega 7 (Integrated)', brand: 'AMD', vram: 'Shared Memory', type: 'integrated' },
    'vega 6': { displayName: 'AMD Radeon Vega 6 (Integrated)', brand: 'AMD', vram: 'Shared Memory', type: 'integrated' },
    'vega 3': { displayName: 'AMD Radeon Vega 3 (Integrated)', brand: 'AMD', vram: 'Shared Memory', type: 'integrated' },

    // ── Intel Arc Discrete ──
    'arc b580': { displayName: 'Intel Arc B580', brand: 'Intel', vram: '12 GB', type: 'discrete' },
    'arc b570': { displayName: 'Intel Arc B570', brand: 'Intel', vram: '10 GB', type: 'discrete' },
    'arc a770': { displayName: 'Intel Arc A770', brand: 'Intel', vram: '16 GB', type: 'discrete' },
    'arc a750': { displayName: 'Intel Arc A750', brand: 'Intel', vram: '8 GB', type: 'discrete' },
    'arc a580': { displayName: 'Intel Arc A580', brand: 'Intel', vram: '8 GB', type: 'discrete' },
    'arc a380': { displayName: 'Intel Arc A380', brand: 'Intel', vram: '6 GB', type: 'discrete' },
    'arc a310': { displayName: 'Intel Arc A310', brand: 'Intel', vram: '4 GB', type: 'discrete' },

    // ── Intel Integrated ──
    'iris xe graphics': { displayName: 'Intel Iris Xe Graphics (Integrated)', brand: 'Intel', vram: 'Shared Memory', type: 'integrated' },
    'iris xe': { displayName: 'Intel Iris Xe Graphics (Integrated)', brand: 'Intel', vram: 'Shared Memory', type: 'integrated' },
    'iris plus graphics': { displayName: 'Intel Iris Plus Graphics (Integrated)', brand: 'Intel', vram: 'Shared Memory', type: 'integrated' },
    'iris plus': { displayName: 'Intel Iris Plus Graphics (Integrated)', brand: 'Intel', vram: 'Shared Memory', type: 'integrated' },
    'iris pro graphics': { displayName: 'Intel Iris Pro Graphics (Integrated)', brand: 'Intel', vram: 'Shared Memory', type: 'integrated' },
    'iris pro': { displayName: 'Intel Iris Pro Graphics (Integrated)', brand: 'Intel', vram: 'Shared Memory', type: 'integrated' },
    'uhd graphics 770': { displayName: 'Intel UHD Graphics 770 (Integrated)', brand: 'Intel', vram: 'Shared Memory', type: 'integrated' },
    'uhd graphics 730': { displayName: 'Intel UHD Graphics 730 (Integrated)', brand: 'Intel', vram: 'Shared Memory', type: 'integrated' },
    'uhd graphics 630': { displayName: 'Intel UHD Graphics 630 (Integrated)', brand: 'Intel', vram: 'Shared Memory', type: 'integrated' },
    'uhd graphics 620': { displayName: 'Intel UHD Graphics 620 (Integrated)', brand: 'Intel', vram: 'Shared Memory', type: 'integrated' },
    'uhd graphics 617': { displayName: 'Intel UHD Graphics 617 (Integrated)', brand: 'Intel', vram: 'Shared Memory', type: 'integrated' },
    'uhd graphics 615': { displayName: 'Intel UHD Graphics 615 (Integrated)', brand: 'Intel', vram: 'Shared Memory', type: 'integrated' },
    'uhd graphics 610': { displayName: 'Intel UHD Graphics 610 (Integrated)', brand: 'Intel', vram: 'Shared Memory', type: 'integrated' },
    'uhd graphics 605': { displayName: 'Intel UHD Graphics 605 (Integrated)', brand: 'Intel', vram: 'Shared Memory', type: 'integrated' },
    'uhd graphics 600': { displayName: 'Intel UHD Graphics 600 (Integrated)', brand: 'Intel', vram: 'Shared Memory', type: 'integrated' },
    'uhd graphics': { displayName: 'Intel UHD Graphics (Integrated)', brand: 'Intel', vram: 'Shared Memory', type: 'integrated' },
    'uhd 770': { displayName: 'Intel UHD 770 (Integrated)', brand: 'Intel', vram: 'Shared Memory', type: 'integrated' },
    'uhd 730': { displayName: 'Intel UHD 730 (Integrated)', brand: 'Intel', vram: 'Shared Memory', type: 'integrated' },
    'uhd 630': { displayName: 'Intel UHD 630 (Integrated)', brand: 'Intel', vram: 'Shared Memory', type: 'integrated' },
    'uhd 620': { displayName: 'Intel UHD 620 (Integrated)', brand: 'Intel', vram: 'Shared Memory', type: 'integrated' },
    'uhd 600': { displayName: 'Intel UHD 600 (Integrated)', brand: 'Intel', vram: 'Shared Memory', type: 'integrated' },
    'hd graphics 630': { displayName: 'Intel HD Graphics 630 (Integrated)', brand: 'Intel', vram: 'Shared Memory', type: 'integrated' },
    'hd graphics 530': { displayName: 'Intel HD Graphics 530 (Integrated)', brand: 'Intel', vram: 'Shared Memory', type: 'integrated' },
    'hd graphics 520': { displayName: 'Intel HD Graphics 520 (Integrated)', brand: 'Intel', vram: 'Shared Memory', type: 'integrated' },
    'hd graphics 515': { displayName: 'Intel HD Graphics 515 (Integrated)', brand: 'Intel', vram: 'Shared Memory', type: 'integrated' },
    'hd graphics 510': { displayName: 'Intel HD Graphics 510 (Integrated)', brand: 'Intel', vram: 'Shared Memory', type: 'integrated' },
    'hd graphics 505': { displayName: 'Intel HD Graphics 505 (Integrated)', brand: 'Intel', vram: 'Shared Memory', type: 'integrated' },
    'hd graphics 500': { displayName: 'Intel HD Graphics 500 (Integrated)', brand: 'Intel', vram: 'Shared Memory', type: 'integrated' },
    'hd graphics': { displayName: 'Intel HD Graphics (Integrated)', brand: 'Intel', vram: 'Shared Memory', type: 'integrated' },
    'hd 630': { displayName: 'Intel HD 630 (Integrated)', brand: 'Intel', vram: 'Shared Memory', type: 'integrated' },
    'hd 530': { displayName: 'Intel HD 530 (Integrated)', brand: 'Intel', vram: 'Shared Memory', type: 'integrated' },
    'hd 520': { displayName: 'Intel HD 520 (Integrated)', brand: 'Intel', vram: 'Shared Memory', type: 'integrated' },
    'hd 4600': { displayName: 'Intel HD 4600 (Integrated)', brand: 'Intel', vram: 'Shared Memory', type: 'integrated' },
    'hd 4000': { displayName: 'Intel HD 4000 (Integrated)', brand: 'Intel', vram: 'Shared Memory', type: 'integrated' },
    'hd 3000': { displayName: 'Intel HD 3000 (Integrated)', brand: 'Intel', vram: 'Shared Memory', type: 'integrated' },

    // ── Apple Silicon ──
    'm4 max': { displayName: 'Apple M4 Max GPU', brand: 'Apple', vram: '48 GB / 128 GB', type: 'unified' },
    'm4 pro': { displayName: 'Apple M4 Pro GPU', brand: 'Apple', vram: '24 GB / 48 GB / 64 GB', type: 'unified' },
    'm4': { displayName: 'Apple M4 GPU', brand: 'Apple', vram: '16 GB / 24 GB / 32 GB', type: 'unified' },
    'm3 max': { displayName: 'Apple M3 Max GPU', brand: 'Apple', vram: '36 GB / 48 GB / 64 GB / 128 GB', type: 'unified' },
    'm3 pro': { displayName: 'Apple M3 Pro GPU', brand: 'Apple', vram: '18 GB / 36 GB', type: 'unified' },
    'm3': { displayName: 'Apple M3 GPU', brand: 'Apple', vram: '8 GB / 16 GB / 24 GB', type: 'unified' },
    'm2 ultra': { displayName: 'Apple M2 Ultra GPU', brand: 'Apple', vram: '64 GB / 128 GB / 192 GB', type: 'unified' },
    'm2 max': { displayName: 'Apple M2 Max GPU', brand: 'Apple', vram: '32 GB / 64 GB / 96 GB', type: 'unified' },
    'm2 pro': { displayName: 'Apple M2 Pro GPU', brand: 'Apple', vram: '16 GB / 32 GB', type: 'unified' },
    'm2': { displayName: 'Apple M2 GPU', brand: 'Apple', vram: '8 GB / 16 GB / 24 GB', type: 'unified' },
    'm1 ultra': { displayName: 'Apple M1 Ultra GPU', brand: 'Apple', vram: '64 GB / 128 GB', type: 'unified' },
    'm1 max': { displayName: 'Apple M1 Max GPU', brand: 'Apple', vram: '32 GB / 64 GB', type: 'unified' },
    'm1 pro': { displayName: 'Apple M1 Pro GPU', brand: 'Apple', vram: '16 GB / 32 GB', type: 'unified' },
    'm1': { displayName: 'Apple M1 GPU', brand: 'Apple', vram: '8 GB / 16 GB', type: 'unified' },

    // ── Qualcomm / Snapdragon ──
    'snapdragon x elite': { displayName: 'Qualcomm Snapdragon X Elite GPU', brand: 'Qualcomm', vram: 'Shared Memory', type: 'integrated' },
    'snapdragon x plus': { displayName: 'Qualcomm Snapdragon X Plus GPU', brand: 'Qualcomm', vram: 'Shared Memory', type: 'integrated' },
    'adreno 750': { displayName: 'Qualcomm Adreno 750', brand: 'Qualcomm', vram: 'Shared Memory', type: 'mobile' },
    'adreno 740': { displayName: 'Qualcomm Adreno 740', brand: 'Qualcomm', vram: 'Shared Memory', type: 'mobile' },
    'adreno 730': { displayName: 'Qualcomm Adreno 730', brand: 'Qualcomm', vram: 'Shared Memory', type: 'mobile' },
    'adreno 660': { displayName: 'Qualcomm Adreno 660', brand: 'Qualcomm', vram: 'Shared Memory', type: 'mobile' },
    'adreno 650': { displayName: 'Qualcomm Adreno 650', brand: 'Qualcomm', vram: 'Shared Memory', type: 'mobile' },
    'adreno 640': { displayName: 'Qualcomm Adreno 640', brand: 'Qualcomm', vram: 'Shared Memory', type: 'mobile' },
    'adreno 630': { displayName: 'Qualcomm Adreno 630', brand: 'Qualcomm', vram: 'Shared Memory', type: 'mobile' },
    'adreno 620': { displayName: 'Qualcomm Adreno 620', brand: 'Qualcomm', vram: 'Shared Memory', type: 'mobile' },
    'adreno 619': { displayName: 'Qualcomm Adreno 619', brand: 'Qualcomm', vram: 'Shared Memory', type: 'mobile' },
    'adreno 618': { displayName: 'Qualcomm Adreno 618', brand: 'Qualcomm', vram: 'Shared Memory', type: 'mobile' },
    'adreno 612': { displayName: 'Qualcomm Adreno 612', brand: 'Qualcomm', vram: 'Shared Memory', type: 'mobile' },
    'adreno 610': { displayName: 'Qualcomm Adreno 610', brand: 'Qualcomm', vram: 'Shared Memory', type: 'mobile' },
    'adreno 509': { displayName: 'Qualcomm Adreno 509', brand: 'Qualcomm', vram: 'Shared Memory', type: 'mobile' },
    'adreno 506': { displayName: 'Qualcomm Adreno 506', brand: 'Qualcomm', vram: 'Shared Memory', type: 'mobile' },

    // ── ARM Mali ──
    'mali-g720': { displayName: 'ARM Mali-G720', brand: 'ARM', vram: 'Shared Memory', type: 'mobile' },
    'mali-g715': { displayName: 'ARM Mali-G715', brand: 'ARM', vram: 'Shared Memory', type: 'mobile' },
    'mali-g710': { displayName: 'ARM Mali-G710', brand: 'ARM', vram: 'Shared Memory', type: 'mobile' },
    'mali-g78': { displayName: 'ARM Mali-G78', brand: 'ARM', vram: 'Shared Memory', type: 'mobile' },
    'mali-g77': { displayName: 'ARM Mali-G77', brand: 'ARM', vram: 'Shared Memory', type: 'mobile' },
    'mali-g76': { displayName: 'ARM Mali-G76', brand: 'ARM', vram: 'Shared Memory', type: 'mobile' },
    'mali-g72': { displayName: 'ARM Mali-G72', brand: 'ARM', vram: 'Shared Memory', type: 'mobile' },
    'mali-g71': { displayName: 'ARM Mali-G71', brand: 'ARM', vram: 'Shared Memory', type: 'mobile' },
    'mali-g610': { displayName: 'ARM Mali-G610', brand: 'ARM', vram: 'Shared Memory', type: 'mobile' },
    'mali-g57': { displayName: 'ARM Mali-G57', brand: 'ARM', vram: 'Shared Memory', type: 'mobile' },
    'mali-g52': { displayName: 'ARM Mali-G52', brand: 'ARM', vram: 'Shared Memory', type: 'mobile' },
    'mali-g51': { displayName: 'ARM Mali-G51', brand: 'ARM', vram: 'Shared Memory', type: 'mobile' },
    'mali-g31': { displayName: 'ARM Mali-G31', brand: 'ARM', vram: 'Shared Memory', type: 'mobile' },

    // ── Samsung Xclipse ──
    'xclipse 940': { displayName: 'Samsung Xclipse 940', brand: 'Samsung', vram: 'Shared Memory', type: 'mobile' },
    'xclipse 930': { displayName: 'Samsung Xclipse 930', brand: 'Samsung', vram: 'Shared Memory', type: 'mobile' },
    'xclipse 920': { displayName: 'Samsung Xclipse 920', brand: 'Samsung', vram: 'Shared Memory', type: 'mobile' },

    // ── PowerVR ──
    'powervr bxm-8-256': { displayName: 'PowerVR BXM-8-256', brand: 'Imagination', vram: 'Shared Memory', type: 'mobile' },
    'powervr ge8320': { displayName: 'PowerVR GE8320', brand: 'Imagination', vram: 'Shared Memory', type: 'mobile' },
    'powervr gm9446': { displayName: 'PowerVR GM9446', brand: 'Imagination', vram: 'Shared Memory', type: 'mobile' },
};

// Pre-sorted keys by length descending for longest-match-first semantics
const GPU_DATABASE_KEYS_SORTED = Object.keys(GPU_DATABASE).sort((a, b) => b.length - a.length);

// ================= GPU LOOKUP =================

/**
 * Cleans a raw renderer string: strips ANGLE wrappers, common prefixes,
 * normalizes whitespace, lowercases. PRESERVES important model identifiers.
 */
function cleanRendererString(raw?: string): string {
    if (!raw) return '';
    let s = raw;

    // Extract content from ANGLE wrapper: "ANGLE (Intel, Intel(R) UHD Graphics ...)" → inner content
    const angleMatch = s.match(/ANGLE\s*\(\s*([^,]+),\s*(.+?)\s*(?:Direct3D|OpenGL|Vulkan|D3D|,|$)/i);
    if (angleMatch) {
        // angleMatch[1] = vendor (e.g., "Intel")
        // angleMatch[2] = actual GPU model (e.g., "Intel(R) UHD Graphics (0x000046B3)")
        s = angleMatch[2];
    }

    // Strip trailing backend info
    s = s.replace(/Direct3D\d*/gi, '').replace(/vs_\d+_\d+/gi, '').replace(/ps_\d+_\d+/gi, '');
    s = s.replace(/OpenGL\s*Engine/gi, '').replace(/D3D\d*/gi, '');

    // Strip device IDs in parentheses like (0x000046B3) but preserve other parenthetical info
    s = s.replace(/\(0x[0-9a-f]+\)/gi, '');

    // Strip common vendor prefixes and trademark symbols
    s = s.replace(/\bIntel\(R\)\s*/gi, '');
    s = s.replace(/\bNVIDIA\s*/gi, '');
    s = s.replace(/\bAMD\s*/gi, '');
    s = s.replace(/\bATI\s*/gi, '');
    s = s.replace(/\(R\)/gi, '').replace(/\(TM\)/gi, '');
    s = s.replace(/\bCorporation\b/gi, '').replace(/\bInc\.?\b/gi, '');

    // Collapse whitespace & trim
    s = s.replace(/\s+/g, ' ').trim().toLowerCase();
    return s;
}

function isWebGLGenericRenderer(renderer?: string, vendor?: string): boolean {
    const combined = `${vendor || ''} ${renderer || ''}`.toLowerCase();
    return (
        combined.includes('webkit') ||
        combined.includes('webgl') ||
        (combined.includes('angle') && !combined.match(/angle\s*\(.+\)/i)) ||
        (!renderer && !vendor)
    );
}

interface GPULookupResult {
    entry: GPUEntry;
    matchedKey: string;
}

/**
 * Look up a GPU from the database by matching the cleaned renderer string
 * against all known keys (longest-first).
 */
function lookupGPU(rawRenderer?: string, rawVendor?: string): GPULookupResult | null {
    // Try the cleaned renderer first
    const cleaned = cleanRendererString(rawRenderer);
    if (!cleaned) return null;

    for (const key of GPU_DATABASE_KEYS_SORTED) {
        if (cleaned.includes(key)) {
            return { entry: GPU_DATABASE[key], matchedKey: key };
        }
    }

    // Also try the raw lowercased string in case cleaning removed too much
    const rawLower = (rawRenderer || '').toLowerCase();
    for (const key of GPU_DATABASE_KEYS_SORTED) {
        if (rawLower.includes(key)) {
            return { entry: GPU_DATABASE[key], matchedKey: key };
        }
    }

    // Try combined vendor + renderer
    const combined = `${rawVendor || ''} ${rawRenderer || ''}`.toLowerCase();
    for (const key of GPU_DATABASE_KEYS_SORTED) {
        if (combined.includes(key)) {
            return { entry: GPU_DATABASE[key], matchedKey: key };
        }
    }

    return null;
}

// ================= BRAND DETECTION (fallback for unknown GPUs) =================

function detectGPUBrandFallback(renderer?: string, vendor?: string): string {
    const combined = `${vendor || ''} ${renderer || ''}`.toLowerCase();
    if (combined.includes('nvidia') || combined.includes('geforce') || combined.includes('tegra')) return 'NVIDIA';
    if (combined.includes('amd') || combined.includes('radeon') || combined.includes('ati')) return 'AMD';
    if (combined.includes('intel') && !isWebGLGenericRenderer(renderer, vendor)) return 'Intel';
    if (combined.includes('apple')) return 'Apple';
    if (combined.includes('qualcomm') || combined.includes('adreno') || combined.includes('snapdragon')) return 'Qualcomm';
    if (combined.includes('mali')) return 'ARM';
    if (combined.includes('powervr') || combined.includes('imagination')) return 'Imagination';
    if (combined.includes('samsung') || combined.includes('xclipse')) return 'Samsung';
    if (combined.includes('google') || combined.includes('tensor')) return 'Google';
    return 'Unknown';
}

function detectGraphicsBackend(vendor?: string, renderer?: string): string {
    const combined = `${vendor || ''} ${renderer || ''}`.toLowerCase();
    if (combined.includes('angle') || combined.includes('d3d')) return 'DirectX (ANGLE)';
    if (combined.includes('metal')) return 'Metal';
    if (combined.includes('vulkan')) return 'Vulkan';
    if (combined.includes('opengl') && !combined.includes('webgl')) return 'OpenGL';
    return 'WebGL';
}

function inferAppleGPU(systemInfo: RawSystemInfo): GPULookupResult | null {
    const platform = systemInfo.navigator?.platform?.toLowerCase() || '';
    const userAgent = systemInfo.navigator?.userAgent?.toLowerCase() || '';
    const cores = systemInfo.navigator?.hardwareConcurrency || 0;
    const isMac = platform.includes('mac') || userAgent.includes('mac');
    if (!isMac) return null;

    // Heuristic mapping from core count to Apple Silicon chip
    let appleKey: string | null = null;
    if (cores === 8) appleKey = 'm1';
    else if (cores === 10) appleKey = 'm2';
    else if (cores === 12) appleKey = 'm2 pro';
    else if (cores === 16) appleKey = 'm3 max';
    else if (cores >= 18) appleKey = 'm3 pro';

    if (appleKey && GPU_DATABASE[appleKey]) {
        return { entry: GPU_DATABASE[appleKey], matchedKey: appleKey };
    }

    // Generic Apple fallback (not in database)
    return {
        entry: {
            displayName: 'Apple GPU (Integrated)',
            brand: 'Apple',
            vram: 'Unified Memory',
            type: 'unified',
        },
        matchedKey: 'apple',
    };
}

function detectPlatformType(userAgent?: string, platform?: string): string {
    const ua = (userAgent || '').toLowerCase();
    const plat = (platform || '').toLowerCase();
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) return 'Mobile';
    if (plat.includes('mac') || ua.includes('macintosh')) return 'macOS';
    if (plat.includes('win') || ua.includes('windows')) return 'Windows';
    if (plat.includes('linux')) return 'Linux';
    return 'Desktop';
}

// ================= GPU CAPABILITIES =================

function extractGPUCapabilities(extensions?: string[]): string[] {
    if (!extensions || extensions.length === 0) return [];
    const caps: string[] = [];
    if (extensions.some(e => e.includes('texture_float'))) caps.push('Float Textures');
    if (extensions.some(e => e.includes('WEBGL_draw_buffers'))) caps.push('Multiple Render Targets');
    if (extensions.some(e => e.includes('depth_texture'))) caps.push('Depth Textures');
    if (extensions.some(e => e.includes('vertex_array_object'))) caps.push('VAO Support');
    if (extensions.some(e => e.includes('anisotropic'))) caps.push('Anisotropic Filtering');
    if (extensions.some(e => e.includes('compressed_texture'))) caps.push('Texture Compression');
    if (extensions.some(e => e.includes('instanced_arrays'))) caps.push('Instanced Rendering');
    if (extensions.some(e => e.includes('EXT_color_buffer'))) caps.push('HDR Rendering');
    return caps;
}

// ================= PERFORMANCE SCORING =================

function calculatePerformanceScore(runs: RawBenchmarkRun[]): number {
    if (runs.length === 0) return 0;

    const avgTPS = runs.reduce((sum, run) => {
        const dur = (run.endTime - run.startTime) / 1000;
        return sum + (dur > 0 ? run.tokenCount / dur : 0);
    }, 0) / runs.length;

    let score = 0;
    if (avgTPS <= 20) score = (avgTPS / 20) * 40;
    else if (avgTPS <= 50) score = 40 + ((avgTPS - 20) / 30) * 30;
    else if (avgTPS <= 100) score = 70 + ((avgTPS - 50) / 50) * 20;
    else score = 90 + Math.min(((avgTPS - 100) / 100) * 10, 10);

    return Math.round(Math.min(score, 100));
}

function determinePerformanceTier(score: number, gpuType: string): string {
    const isIntegrated = gpuType === 'integrated' || gpuType === 'mobile';
    if (score >= 75 && !isIntegrated) return 'High-End';
    if (score >= 50) return 'Mid-Range';
    if (score >= 25) return 'Low-End';
    return 'Integrated';
}

// ================= MAIN PROCESSOR =================

export class BenchmarkDataProcessor {

    static parseSystemSpecs(rawData: RawSystemInfo): PCSpecs {
        const nav = rawData.navigator || {};
        const screen = rawData.screen || {};
        return {
            cpuCores: nav.hardwareConcurrency || 4,
            deviceMemory: nav.deviceMemory,
            os: this.parseOS(nav.userAgent, nav.platform),
            screen: `${screen.width || 1920}x${screen.height || 1080}`,
        };
    }

    static parseOS(userAgent?: string, platform?: string): string {
        const ua = (userAgent || '').toLowerCase();
        const plat = (platform || '').toLowerCase();
        if (plat.includes('mac') || ua.includes('macintosh')) {
            if (ua.includes('iphone') || ua.includes('ipad')) return 'iOS';
            return 'macOS';
        }
        if (plat.includes('win') || ua.includes('windows')) {
            if (ua.includes('windows nt 10')) return 'Windows 10/11';
            return 'Windows';
        }
        if (ua.includes('android')) return 'Android';
        if (plat.includes('linux')) return 'Linux';
        return 'Unknown OS';
    }

    static parseGPUInfo(
        rawGPU: RawGPUData,
        existingGPUInfo?: GPUInfo | null
    ): GPUInfo {
        // Prefer pre-detected data from useGPUInfo hook
        if (existingGPUInfo && existingGPUInfo.renderer && existingGPUInfo.renderer !== 'Unknown') {
            const effectiveRenderer = existingGPUInfo.unmaskedRenderer || existingGPUInfo.renderer;
            const lookup = lookupGPU(effectiveRenderer, existingGPUInfo.unmaskedVendor || existingGPUInfo.vendor);
            const vram = lookup
                ? lookup.entry.vram
                : (existingGPUInfo.predictedVRAM || 'Unknown');

            return {
                ...existingGPUInfo,
                predictedVRAM: existingGPUInfo.predictedVRAM || vram,
                capabilities: (existingGPUInfo.capabilities && existingGPUInfo.capabilities.length > 0)
                    ? existingGPUInfo.capabilities
                    : extractGPUCapabilities(existingGPUInfo.extensions),
            };
        }

        // Fallback: build from raw WebGL data
        const lookup = lookupGPU(rawGPU.renderer, rawGPU.vendor);
        return {
            vendor: rawGPU.vendor || 'Unknown',
            renderer: rawGPU.renderer || 'Unknown',
            unmaskedRenderer: rawGPU.renderer,
            unmaskedVendor: rawGPU.vendor,
            webgl: true,
            webgl2: rawGPU.version?.includes('WebGL 2') || false,
            webgpu: false,
            predictedVRAM: lookup ? lookup.entry.vram : 'Unknown',
            capabilities: extractGPUCapabilities(rawGPU.extensions),
            maxTextureSize: rawGPU.maxTextureSize,
            maxViewportWidth: rawGPU.maxViewportDims?.[0],
            maxAnisotropy: rawGPU.maxAnisotropy,
            extensions: rawGPU.extensions || [],
        };
    }

    static parseBenchmarkData(
        rawGPU: RawGPUData,
        systemInfo: RawSystemInfo,
        existingGPUInfo?: GPUInfo | null
    ): BenchmarkData {
        // Use unmasked values from pre-detected info first
        const effectiveRenderer =
            existingGPUInfo?.unmaskedRenderer ||
            existingGPUInfo?.renderer ||
            rawGPU.renderer;
        const effectiveVendor =
            existingGPUInfo?.unmaskedVendor ||
            existingGPUInfo?.vendor ||
            rawGPU.vendor;

        // Primary lookup against the GPU database
        let lookup = lookupGPU(effectiveRenderer, effectiveVendor);

        // Apple fallback when WebGL masks the GPU
        if (!lookup && isWebGLGenericRenderer(effectiveRenderer, effectiveVendor)) {
            lookup = inferAppleGPU(systemInfo);
        }

        let normalizedGPU: string;
        let gpuBrand: string;
        let gpuType: string;

        if (lookup) {
            normalizedGPU = lookup.entry.displayName;
            gpuBrand = lookup.entry.brand;
            gpuType = lookup.entry.type;
        } else {
            // No match in database — use cleaned renderer as display name
            const cleaned = cleanRendererString(effectiveRenderer);
            normalizedGPU = cleaned || effectiveRenderer || 'Unknown GPU';
            gpuBrand = detectGPUBrandFallback(effectiveRenderer, effectiveVendor);
            gpuType = gpuBrand === 'Intel' ? 'integrated' : 'discrete';
        }

        return {
            normalizedGPU,
            gpuBrand,
            graphicsBackend: detectGraphicsBackend(effectiveVendor, effectiveRenderer),
            platformType: detectPlatformType(
                systemInfo.navigator?.userAgent,
                systemInfo.navigator?.platform
            ),
            performanceScore: 0,
            performanceTier: 'Unknown',
            _gpuType: gpuType, // internal, used for tier calculation
        } as BenchmarkData & { _gpuType: string };
    }

    static parseBenchmarkResults(runs: RawBenchmarkRun[]): BenchmarkResults {
        if (runs.length === 0) {
            return {
                benchmarks: [],
                tokensPerSecond: 0,
                loadTime: 0,
            };
        }

        const benchmarks: BenchmarkResult[] = runs.map(run => {
            const totalTime = (run.endTime - run.startTime) / 1000;
            const tokensPerSecond = totalTime > 0 ? run.tokenCount / totalTime : 0;
            return {
                name: run.testName,
                totalTime,
                tokenCount: run.tokenCount,
                wordCount: run.wordCount,
                charCount: run.response ? run.response.length : run.wordCount * 5,
                tokensPerSecond,
                prompt: run.prompt || '',
                response: run.response || '',
            };
        });

        const avgTPS = benchmarks.reduce((s, b) => s + b.tokensPerSecond, 0) / benchmarks.length;
        const avgLoad = runs.reduce((s, r) => s + (r.loadTimeMs || 0), 0) / runs.length / 1000;

        return {
            modelName: runs[0]?.modelUsed || 'Unknown Model',
            benchmarks,
            tokensPerSecond: avgTPS,
            loadTime: avgLoad,
        };
    }

    static processCompleteSession(session: RawBenchmarkSession): ProcessedSession {
        const systemSpecs = this.parseSystemSpecs(session.systemInfo);
        const fullGPUInfo = this.parseGPUInfo(session.gpuInfo, session.detectedGPUInfo);
        const benchmarkData = this.parseBenchmarkData(
            session.gpuInfo,
            session.systemInfo,
            session.detectedGPUInfo
        ) as BenchmarkData & { _gpuType?: string };
        const benchmarkResults = this.parseBenchmarkResults(session.benchmarkRuns);

        benchmarkData.performanceScore = calculatePerformanceScore(session.benchmarkRuns);
        benchmarkData.performanceTier = determinePerformanceTier(
            benchmarkData.performanceScore ?? 0,
            (benchmarkData as any)._gpuType || 'discrete'
        );

        // Clean up internal field
        delete (benchmarkData as any)._gpuType;

        return { systemSpecs, benchmarkData, benchmarkResults, fullGPUInfo };
    }
}