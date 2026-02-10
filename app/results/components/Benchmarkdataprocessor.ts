// results/components/BenchmarkDataProcessor.ts
import type {
    PCSpecs,
    BenchmarkData,
    BenchmarkResults,
    BenchmarkResult,
    GPUInfo
} from '../../benchmark/types/types';

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

// ================= GPU NORMALIZATION =================

function normalizeGPUName(rawRenderer?: string): string {
    if (!rawRenderer) return 'Unknown GPU';
    const str = rawRenderer.toLowerCase();

    if (str.includes('webkit') || str.includes('webgl') || str.includes('angle')) {
        return 'Unknown GPU';
    }

    if (str.includes('rtx') || str.includes('gtx')) {
        const match = rawRenderer.match(/(RTX|GTX)\s*(\d{4}(?:\s?Ti|\s?Super|\s?SUPER)?)/i);
        if (match) return `NVIDIA ${match[1].toUpperCase()} ${match[2]}`;
    }

    if (str.includes('nvidia') && str.includes('titan')) {
        const match = rawRenderer.match(/TITAN\s*(RTX|V|Xp|X)?/i);
        if (match) return `NVIDIA TITAN ${match[1] || ''}`.trim();
    }

    if (str.includes('nvidia') && str.includes('quadro')) {
        const match = rawRenderer.match(/Quadro\s*(RTX\s*\d{4}|P\d{4}|K\d{4}|GP100|GV100)/i);
        if (match) return `NVIDIA Quadro ${match[1]}`;
    }

    if (str.includes('nvidia') && str.includes('a100')) return 'NVIDIA A100';
    if (str.includes('nvidia') && str.includes('a6000')) return 'NVIDIA RTX A6000';
    if (str.includes('nvidia') && str.includes('a5000')) return 'NVIDIA RTX A5000';
    if (str.includes('nvidia') && str.includes('a4000')) return 'NVIDIA RTX A4000';
    if (str.includes('nvidia') && str.includes('a2000')) return 'NVIDIA RTX A2000';
    if (str.includes('nvidia') && str.includes('h100')) return 'NVIDIA H100';
    if (str.includes('nvidia') && str.includes('l40')) return 'NVIDIA L40';
    if (str.includes('nvidia') && str.includes('t600')) return 'NVIDIA T600';
    if (str.includes('nvidia') && str.includes('t1000')) return 'NVIDIA T1000';

    if (str.includes('radeon') && str.includes('rx')) {
        const match = rawRenderer.match(/RX\s*(\d{4}(?:\s?XT|XTX|S)?)/i);
        if (match) return `AMD Radeon RX ${match[1]}`;
    }

    if (str.includes('radeon') && str.includes('pro')) {
        const match = rawRenderer.match(/Radeon\s*Pro\s*(W\d{4}(?:X)?|V\d{3}|VII|5\d{3}M?|Vega\s*\d+)/i);
        if (match) return `AMD Radeon Pro ${match[1]}`;
    }

    if (str.includes('radeon') && str.includes('vega')) {
        const match = rawRenderer.match(/Vega\s*(\d+)/i);
        if (match) return `AMD Radeon RX Vega ${match[1]}`;
        return 'AMD Radeon Vega Graphics (Integrated)';
    }

    if (str.includes('radeon') && str.includes('r9')) {
        const match = rawRenderer.match(/R9\s*(\d{3}X?)/i);
        if (match) return `AMD Radeon R9 ${match[1]}`;
    }

    if (str.includes('radeon') && str.includes('r7')) {
        const match = rawRenderer.match(/R7\s*(\d{3}X?)/i);
        if (match) return `AMD Radeon R7 ${match[1]}`;
    }

    if (str.includes('radeon') && str.includes('680m')) return 'AMD Radeon RX 680M (Integrated)';
    if (str.includes('radeon') && str.includes('780m')) return 'AMD Radeon RX 780M (Integrated)';
    if (str.includes('radeon') && str.includes('890m')) return 'AMD Radeon RX 890M (Integrated)';
    if (str.includes('radeon') && str.includes('610m')) return 'AMD Radeon 610M (Integrated)';
    if (str.includes('radeon') && str.includes('660m')) return 'AMD Radeon RX 660M (Integrated)';

    if (str.includes('radeon')) return 'AMD Radeon Graphics (Integrated)';

    if (str.includes('intel arc')) {
        const match = rawRenderer.match(/Arc\s*(\w+)\s*(\d+)/i);
        if (match) return `Intel Arc ${match[1]} ${match[2]}`;
    }

    if (str.includes('intel') && str.includes('iris') && str.includes('xe')) return 'Intel Iris Xe Graphics (Integrated)';
    if (str.includes('intel') && str.includes('iris') && str.includes('plus')) return 'Intel Iris Plus Graphics (Integrated)';
    if (str.includes('intel') && str.includes('iris') && str.includes('pro')) return 'Intel Iris Pro Graphics (Integrated)';
    if (str.includes('intel') && str.includes('iris')) return 'Intel Iris Graphics (Integrated)';
    if (str.includes('intel') && str.includes('uhd') && str.includes('770')) return 'Intel UHD 770 (Integrated)';
    if (str.includes('intel') && str.includes('uhd') && str.includes('730')) return 'Intel UHD 730 (Integrated)';
    if (str.includes('intel') && str.includes('uhd') && str.includes('630')) return 'Intel UHD 630 (Integrated)';
    if (str.includes('intel') && str.includes('uhd')) return 'Intel UHD Graphics (Integrated)';
    if (str.includes('intel') && str.includes('hd') && str.includes('630')) return 'Intel HD 630 (Integrated)';
    if (str.includes('intel') && str.includes('hd') && str.includes('530')) return 'Intel HD 530 (Integrated)';
    if (str.includes('intel') && str.includes('hd')) return 'Intel HD Graphics (Integrated)';
    if (str.includes('intel')) return 'Intel Graphics (Integrated)';

    if (
        str.includes('apple') ||
        str.includes('m1') ||
        str.includes('m2') ||
        str.includes('m3') ||
        str.includes('m4')
    ) {
        const match = rawRenderer.match(/(M[1-4](?:\s?Pro|Max|Ultra)?)/i);
        if (match) return `Apple ${match[1]} GPU`;
    }

    // Qualcomm / Adreno (mobile)
    if (str.includes('adreno')) {
        const match = rawRenderer.match(/Adreno\s*\(TM\)\s*(\d+)/i) || rawRenderer.match(/Adreno\s*(\d+)/i);
        if (match) return `Qualcomm Adreno ${match[1]}`;
        return 'Qualcomm Adreno GPU';
    }

    if (str.includes('snapdragon') && str.includes('x elite')) return 'Qualcomm Snapdragon X Elite GPU';
    if (str.includes('snapdragon') && str.includes('x plus')) return 'Qualcomm Snapdragon X Plus GPU';

    // ARM Mali (mobile)
    if (str.includes('mali')) {
        const match = rawRenderer.match(/Mali-(\w+)/i);
        if (match) return `ARM Mali-${match[1]}`;
        return 'ARM Mali GPU';
    }

    // PowerVR (mobile)
    if (str.includes('powervr')) {
        const match = rawRenderer.match(/PowerVR\s*([\w\s]+)/i);
        if (match) return `PowerVR ${match[1].trim()}`;
        return 'PowerVR GPU';
    }

    // Samsung Xclipse (mobile)
    if (str.includes('xclipse')) {
        const match = rawRenderer.match(/Xclipse\s*(\d+)/i);
        if (match) return `Samsung Xclipse ${match[1]}`;
        return 'Samsung Xclipse GPU';
    }

    // Google Tensor (mobile)
    if (str.includes('tensor')) return 'Google Tensor GPU';

    // Nvidia mobile
    if (str.includes('tegra')) {
        const match = rawRenderer.match(/Tegra\s*(\w+)/i);
        if (match) return `NVIDIA Tegra ${match[1]}`;
        return 'NVIDIA Tegra GPU';
    }

    return rawRenderer;
}

function detectGPUBrand(renderer?: string, vendor?: string): string {
    const combined = `${vendor || ''} ${renderer || ''}`.toLowerCase();
    const isGenericWebGL =
        combined.includes('webkit') ||
        combined.includes('webgl') ||
        combined.includes('angle') ||
        !renderer ||
        !vendor;

    if (combined.includes('nvidia') || combined.includes('geforce') || combined.includes('tegra')) return 'NVIDIA';
    if (combined.includes('amd') || combined.includes('radeon')) return 'AMD';
    if (combined.includes('intel') && !isGenericWebGL) return 'Intel';
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

function inferAppleGPU(systemInfo: RawSystemInfo): string | null {
    const platform = systemInfo.navigator?.platform?.toLowerCase() || '';
    const userAgent = systemInfo.navigator?.userAgent?.toLowerCase() || '';
    const cores = systemInfo.navigator?.hardwareConcurrency || 0;
    const isMac = platform.includes('mac') || userAgent.includes('mac');
    if (!isMac) return null;

    if (cores === 8) return 'Apple M1 GPU';
    if (cores === 10) return 'Apple M2 GPU';
    if (cores === 12) return 'Apple M2 Pro GPU';
    if (cores === 16) return 'Apple M3 Max GPU';
    if (cores >= 18) return 'Apple M3 Pro/Max GPU';
    return 'Apple GPU (Integrated)';
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

// ================= VRAM ESTIMATION =================

const VRAM_LOOKUP: Record<string, string> = {
    // NVIDIA GeForce RTX 50 Series
    'rtx 5090': '32 GB', 'rtx 5080': '16 GB',
    'rtx 5070 ti': '16 GB', 'rtx 5070': '12 GB',
    'rtx 5060 ti': '16 GB', 'rtx 5060': '8 GB',

    // NVIDIA GeForce RTX 40 Series
    'rtx 4090': '24 GB', 'rtx 4080 super': '16 GB', 'rtx 4080': '16 GB',
    'rtx 4070 ti super': '16 GB', 'rtx 4070 ti': '12 GB',
    'rtx 4070 super': '12 GB', 'rtx 4070': '12 GB',
    'rtx 4060 ti': '8 GB / 16 GB', 'rtx 4060': '8 GB',

    // NVIDIA GeForce RTX 30 Series
    'rtx 3090 ti': '24 GB', 'rtx 3090': '24 GB',
    'rtx 3080 ti': '12 GB', 'rtx 3080': '10 GB / 12 GB',
    'rtx 3070 ti': '8 GB', 'rtx 3070': '8 GB',
    'rtx 3060 ti': '8 GB', 'rtx 3060': '12 GB',
    'rtx 3050': '8 GB',

    // NVIDIA GeForce RTX 20 Series
    'rtx 2080 ti': '11 GB', 'rtx 2080 super': '8 GB', 'rtx 2080': '8 GB',
    'rtx 2070 super': '8 GB', 'rtx 2070': '8 GB',
    'rtx 2060 super': '8 GB', 'rtx 2060': '6 GB',

    // NVIDIA GeForce GTX 16 Series
    'gtx 1660 ti': '6 GB', 'gtx 1660 super': '6 GB', 'gtx 1660': '6 GB',
    'gtx 1650 super': '4 GB', 'gtx 1650': '4 GB',

    // NVIDIA GeForce GTX 10 Series
    'gtx 1080 ti': '11 GB', 'gtx 1080': '8 GB',
    'gtx 1070 ti': '8 GB', 'gtx 1070': '8 GB',
    'gtx 1060': '3 GB / 6 GB', 'gtx 1050 ti': '4 GB', 'gtx 1050': '2 GB',

    // NVIDIA GeForce GTX 9 Series
    'gtx 980 ti': '6 GB', 'gtx 980': '4 GB',
    'gtx 970': '4 GB', 'gtx 960': '2 GB / 4 GB',
    'gtx 950': '2 GB',

    // NVIDIA GeForce GTX 7 Series
    'gtx 780 ti': '3 GB', 'gtx 780': '3 GB',
    'gtx 770': '2 GB / 4 GB', 'gtx 760': '2 GB',
    'gtx 750 ti': '2 GB', 'gtx 750': '1 GB / 2 GB',

    // NVIDIA TITAN
    'titan rtx': '24 GB', 'titan v': '12 GB',
    'titan xp': '12 GB', 'titan x': '12 GB',

    // NVIDIA Professional / Data Center
    'a100': '40 GB / 80 GB', 'h100': '80 GB',
    'l40': '48 GB', 'l4': '24 GB',
    'rtx a6000': '48 GB', 'rtx a5000': '24 GB',
    'rtx a4000': '16 GB', 'rtx a2000': '6 GB / 12 GB',
    'quadro rtx 8000': '48 GB', 'quadro rtx 6000': '24 GB',
    'quadro rtx 5000': '16 GB', 'quadro rtx 4000': '8 GB',
    'quadro p6000': '24 GB', 'quadro p5000': '16 GB',
    'quadro p4000': '8 GB', 'quadro p2000': '5 GB',
    'quadro k6000': '12 GB', 'quadro k5200': '8 GB',
    't600': '4 GB', 't1000': '4 GB / 8 GB',

    // NVIDIA Laptop GPUs
    'rtx 4090 laptop': '16 GB', 'rtx 4080 laptop': '12 GB',
    'rtx 4070 laptop': '8 GB', 'rtx 4060 laptop': '8 GB',
    'rtx 4050 laptop': '6 GB',
    'rtx 3080 laptop': '8 GB / 16 GB', 'rtx 3070 laptop': '8 GB',
    'rtx 3060 laptop': '6 GB', 'rtx 3050 laptop': '4 GB / 6 GB',
    'rtx 2080 mobile': '8 GB', 'rtx 2070 mobile': '8 GB',
    'rtx 2060 mobile': '6 GB',
    'gtx 1660 ti mobile': '6 GB', 'gtx 1650 mobile': '4 GB',

    // AMD Radeon RX 9000 Series
    'rx 9070 xt': '16 GB', 'rx 9070': '16 GB',

    // AMD Radeon RX 7000 Series
    'rx 7900 xtx': '24 GB', 'rx 7900 xt': '20 GB', 'rx 7900 gre': '16 GB',
    'rx 7800 xt': '16 GB', 'rx 7700 xt': '12 GB',
    'rx 7600 xt': '16 GB', 'rx 7600': '8 GB',

    // AMD Radeon RX 6000 Series
    'rx 6950 xt': '16 GB', 'rx 6900 xt': '16 GB',
    'rx 6800 xt': '16 GB', 'rx 6800': '16 GB',
    'rx 6750 xt': '12 GB', 'rx 6700 xt': '12 GB', 'rx 6700': '10 GB',
    'rx 6650 xt': '8 GB', 'rx 6600 xt': '8 GB', 'rx 6600': '8 GB',
    'rx 6500 xt': '4 GB', 'rx 6400': '4 GB',

    // AMD Radeon RX 5000 Series
    'rx 5700 xt': '8 GB', 'rx 5700': '8 GB',
    'rx 5600 xt': '6 GB', 'rx 5500 xt': '4 GB / 8 GB',

    // AMD Radeon RX Vega / 500 Series
    'rx vega 64': '8 GB', 'rx vega 56': '8 GB',
    'rx 590': '8 GB', 'rx 580': '4 GB / 8 GB',
    'rx 570': '4 GB / 8 GB', 'rx 560': '2 GB / 4 GB',
    'rx 550': '2 GB / 4 GB',

    // AMD Radeon R9 / R7
    'r9 fury x': '4 GB HBM', 'r9 fury': '4 GB HBM',
    'r9 390x': '8 GB', 'r9 390': '8 GB',
    'r9 380x': '4 GB', 'r9 380': '2 GB / 4 GB',
    'r9 290x': '4 GB', 'r9 290': '4 GB',
    'r7 370': '2 GB / 4 GB', 'r7 360': '2 GB',

    // AMD Radeon Pro
    'radeon pro w7900': '48 GB', 'radeon pro w7800': '32 GB',
    'radeon pro w7700': '16 GB', 'radeon pro w7600': '8 GB',
    'radeon pro w6800': '32 GB', 'radeon pro w6600': '8 GB',
    'radeon pro 5500m': '4 GB / 8 GB', 'radeon pro 5300m': '4 GB',
    'radeon pro vega 20': '4 GB', 'radeon pro vega 16': '4 GB',
    'radeon pro 580': '8 GB', 'radeon pro 560x': '4 GB',

    // AMD Integrated GPUs
    'rx 780m': 'Shared Memory', 'rx 680m': 'Shared Memory',
    'rx 890m': 'Shared Memory', 'rx 660m': 'Shared Memory',
    'radeon 610m': 'Shared Memory',
    'vega 8': 'Shared Memory', 'vega 7': 'Shared Memory',
    'vega 6': 'Shared Memory', 'vega 11': 'Shared Memory',
    'vega 10': 'Shared Memory', 'vega 3': 'Shared Memory',

    // Intel Arc Discrete
    'arc a770': '16 GB', 'arc a750': '8 GB',
    'arc a580': '8 GB', 'arc a380': '6 GB',
    'arc a310': '4 GB',
    'arc b580': '12 GB', 'arc b570': '10 GB',

    // Intel Integrated
    'iris xe': 'Shared Memory', 'iris plus': 'Shared Memory',
    'iris pro': 'Shared Memory', 'uhd 770': 'Shared Memory',
    'uhd 730': 'Shared Memory', 'uhd 630': 'Shared Memory',
    'uhd 620': 'Shared Memory', 'uhd 600': 'Shared Memory',
    'hd 630': 'Shared Memory', 'hd 530': 'Shared Memory',
    'hd 520': 'Shared Memory', 'hd 4600': 'Shared Memory',
    'hd 4000': 'Shared Memory', 'hd 3000': 'Shared Memory',

    // Apple Silicon
    'm1': '8 GB / 16 GB', 'm1 pro': '16 GB / 32 GB',
    'm1 max': '32 GB / 64 GB', 'm1 ultra': '64 GB / 128 GB',
    'm2': '8 GB / 16 GB / 24 GB', 'm2 pro': '16 GB / 32 GB',
    'm2 max': '32 GB / 64 GB / 96 GB', 'm2 ultra': '64 GB / 128 GB / 192 GB',
    'm3': '8 GB / 16 GB / 24 GB', 'm3 pro': '18 GB / 36 GB',
    'm3 max': '36 GB / 48 GB / 64 GB / 128 GB',
    'm4': '16 GB / 24 GB / 32 GB', 'm4 pro': '24 GB / 48 GB / 64 GB',
    'm4 max': '48 GB / 128 GB',

    // Qualcomm / Snapdragon
    'snapdragon x elite': 'Shared Memory', 'snapdragon x plus': 'Shared Memory',
    'adreno 750': 'Shared Memory', 'adreno 740': 'Shared Memory',
    'adreno 730': 'Shared Memory', 'adreno 660': 'Shared Memory',
    'adreno 650': 'Shared Memory', 'adreno 640': 'Shared Memory',
    'adreno 630': 'Shared Memory', 'adreno 620': 'Shared Memory',
    'adreno 619': 'Shared Memory', 'adreno 618': 'Shared Memory',
    'adreno 612': 'Shared Memory', 'adreno 610': 'Shared Memory',
    'adreno 509': 'Shared Memory', 'adreno 506': 'Shared Memory',

    // ARM Mali
    'mali-g720': 'Shared Memory', 'mali-g715': 'Shared Memory',
    'mali-g710': 'Shared Memory', 'mali-g78': 'Shared Memory',
    'mali-g77': 'Shared Memory', 'mali-g76': 'Shared Memory',
    'mali-g72': 'Shared Memory', 'mali-g71': 'Shared Memory',
    'mali-g610': 'Shared Memory', 'mali-g57': 'Shared Memory',
    'mali-g52': 'Shared Memory', 'mali-g51': 'Shared Memory',
    'mali-g31': 'Shared Memory',

    // Samsung Xclipse
    'xclipse 940': 'Shared Memory', 'xclipse 930': 'Shared Memory',
    'xclipse 920': 'Shared Memory',

    // PowerVR
    'powervr bxm-8-256': 'Shared Memory', 'powervr ge8320': 'Shared Memory',
    'powervr gm9446': 'Shared Memory',

    // NVIDIA Tegra (mobile/Switch)
    'tegra x1': 'Shared Memory', 'tegra x2': 'Shared Memory',

    // Legacy NVIDIA
    'gt 1030': '2 GB', 'gt 730': '1 GB / 2 GB / 4 GB',
    'gt 710': '1 GB / 2 GB',
};

function estimateVRAM(normalizedGPU: string): string {
    const lookup = normalizedGPU.toLowerCase();
    // Sort keys by length descending so more specific matches come first
    const sortedKeys = Object.keys(VRAM_LOOKUP).sort((a, b) => b.length - a.length);
    for (const key of sortedKeys) {
        if (lookup.includes(key)) return VRAM_LOOKUP[key];
    }
    if (lookup.includes('unknown')) return 'Unable to Detect';
    if (lookup.includes('integrated') || (lookup.includes('intel') && !lookup.includes('arc'))) {
        return 'Shared Memory';
    }
    if (lookup.includes('apple')) return 'Unified Memory';
    return 'Unknown';
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

function determinePerformanceTier(score: number, gpuBrand: string): string {
    const isIntegrated = gpuBrand === 'Intel' || gpuBrand === 'ARM';
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
            const normalizedName = normalizeGPUName(
                existingGPUInfo.unmaskedRenderer || existingGPUInfo.renderer
            );
            return {
                ...existingGPUInfo,
                predictedVRAM: existingGPUInfo.predictedVRAM || estimateVRAM(normalizedName),
                capabilities: (existingGPUInfo.capabilities && existingGPUInfo.capabilities.length > 0)
                    ? existingGPUInfo.capabilities
                    : extractGPUCapabilities(existingGPUInfo.extensions),
            };
        }

        // Fallback: build from raw WebGL data
        const normalizedName = normalizeGPUName(rawGPU.renderer);
        return {
            vendor: rawGPU.vendor || 'Unknown',
            renderer: rawGPU.renderer || 'Unknown',
            unmaskedRenderer: rawGPU.renderer,
            unmaskedVendor: rawGPU.vendor,
            webgl: true,
            webgl2: rawGPU.version?.includes('WebGL 2') || false,
            webgpu: false,
            predictedVRAM: estimateVRAM(normalizedName),
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

        let normalizedGPU = normalizeGPUName(effectiveRenderer);
        let gpuBrand = detectGPUBrand(effectiveRenderer, effectiveVendor);

        // Apple fallback when WebGL masks the GPU
        if (normalizedGPU === 'Unknown GPU' || gpuBrand === 'Unknown') {
            const inferredGPU = inferAppleGPU(systemInfo);
            if (inferredGPU) {
                normalizedGPU = inferredGPU;
                gpuBrand = 'Apple';
            }
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
        };
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
        );
        const benchmarkResults = this.parseBenchmarkResults(session.benchmarkRuns);

        benchmarkData.performanceScore = calculatePerformanceScore(session.benchmarkRuns);
        benchmarkData.performanceTier = determinePerformanceTier(
            benchmarkData.performanceScore ?? 0,
            benchmarkData.gpuBrand || 'Unknown'
        );

        return { systemSpecs, benchmarkData, benchmarkResults, fullGPUInfo };
    }
}