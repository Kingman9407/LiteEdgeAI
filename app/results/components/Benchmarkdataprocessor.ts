import type {
    PCSpecs,
    BenchmarkData,
    BenchmarkResults,
    GPUInfo
} from './types';

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

interface RawBenchmarkSession {
    systemInfo: RawSystemInfo;
    gpuInfo: RawGPUData;
    benchmarkRuns: RawBenchmarkRun[];
    timestamp: number;
}

// ================= GPU NORMALIZATION =================

const GPU_PATTERNS = [
    // NVIDIA patterns
    { pattern: /NVIDIA GeForce (RTX|GTX) (\d{4}(?:\s?Ti)?)/i, format: (m: RegExpMatchArray) => `NVIDIA ${m[1]} ${m[2]}` },
    { pattern: /GeForce (RTX|GTX) (\d{4}(?:\s?Ti)?)/i, format: (m: RegExpMatchArray) => `NVIDIA ${m[1]} ${m[2]}` },
    { pattern: /NVIDIA (RTX|GTX) (\d{4}(?:\s?Ti)?)/i, format: (m: RegExpMatchArray) => `NVIDIA ${m[1]} ${m[2]}` },

    // AMD patterns
    { pattern: /AMD Radeon (RX) (\d{4}(?:\s?XT)?)/i, format: (m: RegExpMatchArray) => `AMD Radeon ${m[1]} ${m[2]}` },
    { pattern: /Radeon (RX) (\d{4}(?:\s?XT)?)/i, format: (m: RegExpMatchArray) => `AMD Radeon ${m[1]} ${m[2]}` },
    { pattern: /AMD Radeon(?: Graphics)?/i, format: () => 'AMD Radeon Graphics (Integrated)' },

    // Intel patterns
    { pattern: /Intel(?:\(R\))? (?:UHD|Iris Xe|Arc) Graphics(?: (\d+))?/i, format: (m: RegExpMatchArray) => m[1] ? `Intel Graphics ${m[1]}` : 'Intel Graphics (Integrated)' },
    { pattern: /Intel(?:\(R\))? Arc (\w+) (\d+)/i, format: (m: RegExpMatchArray) => `Intel Arc ${m[1]} ${m[2]}` },

    // Apple patterns - ANGLE Metal Renderer format comes first (more specific)
    { pattern: /ANGLE Metal Renderer: Apple (M\d+(?:\s?Pro|Max|Ultra)?)/i, format: (m: RegExpMatchArray) => `Apple ${m[1]} GPU` },
    { pattern: /Apple (M\d+(?:\s?Pro|Max|Ultra)?)/i, format: (m: RegExpMatchArray) => `Apple ${m[1]} GPU` },

    // Generic fallback
    { pattern: /^(.+)$/, format: (m: RegExpMatchArray) => m[1].replace(/\s+/g, ' ').trim() }
];

function normalizeGPUName(rawRenderer?: string): string {
    if (!rawRenderer) return 'Unknown GPU';

    for (const { pattern, format } of GPU_PATTERNS) {
        const match = rawRenderer.match(pattern);
        if (match) {
            return format(match);
        }
    }

    return rawRenderer;
}

function detectGPUBrand(renderer?: string, vendor?: string): string {
    const combined = `${vendor || ''} ${renderer || ''}`.toLowerCase();

    if (combined.includes('nvidia') || combined.includes('geforce')) return 'NVIDIA';
    if (combined.includes('amd') || combined.includes('radeon')) return 'AMD';
    if (combined.includes('intel')) return 'Intel';
    if (combined.includes('apple')) return 'Apple';
    if (combined.includes('qualcomm') || combined.includes('adreno')) return 'Qualcomm';
    if (combined.includes('mali')) return 'ARM';

    return 'Unknown';
}

function detectGraphicsBackend(vendor?: string, renderer?: string): string {
    const combined = `${vendor || ''} ${renderer || ''}`.toLowerCase();

    if (combined.includes('angle') || combined.includes('d3d')) return 'DirectX (ANGLE)';
    if (combined.includes('metal')) return 'Metal';
    if (combined.includes('vulkan')) return 'Vulkan';
    if (combined.includes('opengl')) return 'OpenGL';

    return 'WebGL';
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

const VRAM_LOOKUP: { [key: string]: string } = {
    // NVIDIA RTX 40 series
    'rtx 4090': '24 GB',
    'rtx 4080': '16 GB',
    'rtx 4070 ti': '12 GB',
    'rtx 4070': '12 GB',
    'rtx 4060 ti': '8 GB / 16 GB',
    'rtx 4060': '8 GB',

    // NVIDIA RTX 30 series
    'rtx 3090': '24 GB',
    'rtx 3080': '10 GB / 12 GB',
    'rtx 3070': '8 GB',
    'rtx 3060': '12 GB',

    // AMD RX 7000 series
    'rx 7900 xtx': '24 GB',
    'rx 7900 xt': '20 GB',
    'rx 7800 xt': '16 GB',
    'rx 7700 xt': '12 GB',
    'rx 7600': '8 GB',

    // AMD RX 6000 series
    'rx 6900 xt': '16 GB',
    'rx 6800 xt': '16 GB',
    'rx 6700 xt': '12 GB',
    'rx 6600': '8 GB',

    // Intel Arc
    'arc a770': '16 GB',
    'arc a750': '8 GB',
    'arc a580': '8 GB',
};

function estimateVRAM(normalizedGPU: string): string {
    const lookup = normalizedGPU.toLowerCase();

    for (const [key, vram] of Object.entries(VRAM_LOOKUP)) {
        if (lookup.includes(key)) {
            return vram;
        }
    }

    // Fallback heuristics
    if (lookup.includes('integrated') || lookup.includes('intel') && !lookup.includes('arc')) {
        return 'Shared Memory';
    }
    if (lookup.includes('apple m')) {
        return 'Unified Memory';
    }

    return 'Unknown';
}

// ================= GPU CAPABILITIES =================

function extractGPUCapabilities(extensions?: string[]): string[] {
    if (!extensions || extensions.length === 0) return [];

    const capabilities: string[] = [];

    if (extensions.some(e => e.includes('texture_float'))) capabilities.push('Float Textures');
    if (extensions.some(e => e.includes('WEBGL_draw_buffers'))) capabilities.push('Multiple Render Targets');
    if (extensions.some(e => e.includes('depth_texture'))) capabilities.push('Depth Textures');
    if (extensions.some(e => e.includes('vertex_array_object'))) capabilities.push('VAO Support');
    if (extensions.some(e => e.includes('anisotropic'))) capabilities.push('Anisotropic Filtering');
    if (extensions.some(e => e.includes('compressed_texture'))) capabilities.push('Texture Compression');
    if (extensions.some(e => e.includes('instanced_arrays'))) capabilities.push('Instanced Rendering');
    if (extensions.some(e => e.includes('EXT_color_buffer'))) capabilities.push('HDR Rendering');

    return capabilities;
}

// ================= PERFORMANCE SCORING =================

function calculatePerformanceScore(benchmarkRuns: RawBenchmarkRun[]): number {
    if (benchmarkRuns.length === 0) return 0;

    const avgTokensPerSecond = benchmarkRuns.reduce((sum, run) => {
        const duration = (run.endTime - run.startTime) / 1000;
        const tps = duration > 0 ? run.tokenCount / duration : 0;
        return sum + tps;
    }, 0) / benchmarkRuns.length;

    // Score ranges (adjust based on your benchmarks)
    // 0-20 tok/s = 0-40 score
    // 20-50 tok/s = 40-70 score
    // 50-100 tok/s = 70-90 score
    // 100+ tok/s = 90-100 score

    let score = 0;
    if (avgTokensPerSecond <= 20) {
        score = (avgTokensPerSecond / 20) * 40;
    } else if (avgTokensPerSecond <= 50) {
        score = 40 + ((avgTokensPerSecond - 20) / 30) * 30;
    } else if (avgTokensPerSecond <= 100) {
        score = 70 + ((avgTokensPerSecond - 50) / 50) * 20;
    } else {
        score = 90 + Math.min(((avgTokensPerSecond - 100) / 100) * 10, 10);
    }

    return Math.round(Math.min(score, 100));
}

function determinePerformanceTier(score: number, gpuBrand: string): string {
    // Integrated GPUs are capped at Mid-Range
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

    static parseGPUInfo(rawGPU: RawGPUData): GPUInfo {
        const normalizedName = normalizeGPUName(rawGPU.renderer);
        const capabilities = extractGPUCapabilities(rawGPU.extensions);

        return {
            vendor: rawGPU.vendor || 'Unknown',
            renderer: rawGPU.renderer || 'Unknown',
            unmaskedRenderer: rawGPU.renderer, // Same as renderer in this context
            unmaskedVendor: rawGPU.vendor, // Same as vendor in this context
            webgl: true, // Always true if we're getting WebGL data
            webgl2: rawGPU.version?.includes('WebGL 2') || false,
            webgpu: false, // Set based on your detection logic if needed
            predictedVRAM: estimateVRAM(normalizedName),
            capabilities,
            maxTextureSize: rawGPU.maxTextureSize,
            maxViewportWidth: rawGPU.maxViewportDims?.[0],
            maxAnisotropy: rawGPU.maxAnisotropy,
            extensions: rawGPU.extensions || [],
        };
    }

    static parseBenchmarkData(rawGPU: RawGPUData, systemInfo: RawSystemInfo): BenchmarkData {
        const normalizedGPU = normalizeGPUName(rawGPU.renderer);
        const gpuBrand = detectGPUBrand(rawGPU.renderer, rawGPU.vendor);

        return {
            normalizedGPU,
            gpuBrand,
            graphicsBackend: detectGraphicsBackend(rawGPU.vendor, rawGPU.renderer),
            platformType: detectPlatformType(systemInfo.navigator?.userAgent, systemInfo.navigator?.platform),
            performanceScore: 0, // Will be updated after benchmark runs
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

        const benchmarks = runs.map(run => {
            const totalTime = (run.endTime - run.startTime) / 1000;
            const tokensPerSecond = totalTime > 0 ? run.tokenCount / totalTime : 0;

            return {
                name: run.testName,
                totalTime,
                tokenCount: run.tokenCount,
                wordCount: run.wordCount,
                charCount: run.response ? run.response.length : run.wordCount * 5, // Use actual response length or estimate
                tokensPerSecond,
                prompt: run.prompt || '',
                response: run.response || '',
            };
        });

        const avgTokensPerSecond = benchmarks.reduce((sum, b) => sum + b.tokensPerSecond, 0) / benchmarks.length;
        const avgLoadTime = runs.reduce((sum, r) => sum + (r.loadTimeMs || 0), 0) / runs.length / 1000;

        return {
            modelName: runs[0]?.modelUsed || 'Unknown Model',
            benchmarks,
            tokensPerSecond: avgTokensPerSecond,
            loadTime: avgLoadTime,
        };
    }

    static processCompleteSession(session: RawBenchmarkSession) {
        const systemSpecs = this.parseSystemSpecs(session.systemInfo);
        const fullGPUInfo = this.parseGPUInfo(session.gpuInfo);
        const benchmarkData = this.parseBenchmarkData(session.gpuInfo, session.systemInfo);
        const benchmarkResults = this.parseBenchmarkResults(session.benchmarkRuns);

        // Update performance metrics
        benchmarkData.performanceScore = calculatePerformanceScore(session.benchmarkRuns);
        benchmarkData.performanceTier = determinePerformanceTier(
            benchmarkData.performanceScore,
            benchmarkData.gpuBrand || 'Unknown'
        );

        return {
            systemSpecs,
            benchmarkData,
            benchmarkResults,
            fullGPUInfo,
        };
    }
}