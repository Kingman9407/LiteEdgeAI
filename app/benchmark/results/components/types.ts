// BenchmarkResult represents individual test results
export type BenchmarkResult = {
    name: string;
    prompt: string;
    response: string;
    totalTime: number;
    tokenCount: number;
    wordCount: number;
    charCount: number;
    tokensPerSecond: number;
};


export type BenchmarkResults = {
    modelName?: string;
    tokensPerSecond?: number;
    loadTime?: number;
    benchmarks?: BenchmarkResult[];  // ← Added this property
    // Add other benchmark metrics as needed
};

export type PrecisionFormat = {
    rangeMin: number;
    rangeMax: number;
    precision: number;
};

export type SubmitResultsPageProps = {
    onSubmit: () => void;
    onSkip: () => void;
    benchmarkData?: BenchmarkData;
    systemSpecs?: PCSpecs | null;
    benchmarkResults?: BenchmarkResults;
    fullGPUInfo?: GPUInfo | null;
    difficulty?: BenchmarkMode;
};

export type BenchmarkData = {
    normalizedGPU?: string;
    performanceScore?: number;
    performanceTier?: string;
    graphicsBackend?: string;
    gpuBrand?: string;
    platformType?: string;
};

export type PCSpecs = {
    cpuCores: number;
    deviceMemory?: number;
    os: string;
    screen: string;
};

export type GPUInfo = {
    renderer?: string;
    vendor?: string;
    unmaskedRenderer?: string;
    unmaskedVendor?: string;
    webgpu?: boolean;
    webgl?: boolean;
    webgl2?: boolean;
    predictedVRAM?: string;
    predictedTier?: string;
    performanceScore?: number;
    capabilities?: string[];
    extensions?: string[];
    maxTextureSize?: number;
    maxViewportWidth?: number;
    maxAnisotropy?: number;
};

export type BenchmarkMode = 'normal' | 'hard';

