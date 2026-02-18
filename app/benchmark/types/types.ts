// types/types.ts — SINGLE SOURCE OF TRUTH

/* =====================================================
   SYSTEM & PC SPECS
   ===================================================== */

export type PCSpecs = {
    cpuCores: number;
    deviceMemory?: number;
    os: string;
    screen: string;
};

/* =====================================================
   GPU TYPES
   ===================================================== */

export type PrecisionFormat = {
    rangeMin: number;
    rangeMax: number;
    precision: number;
};

export type GPUInfo = {
    renderer?: string;
    vendor?: string;
    unmaskedRenderer?: string;
    unmaskedVendor?: string;

    webgpu?: boolean;
    webgl?: boolean;
    webgl2?: boolean;
    webglVersion?: string;
    shadingLanguageVersion?: string;

    predictedVRAM?: string;
    predictedTier?: string;
    performanceScore?: number;
    capabilities?: string[];

    maxTextureSize?: number;
    maxCubeMapSize?: number;
    maxRenderbufferSize?: number;
    maxTextureImageUnits?: number;
    maxCombinedTextureImageUnits?: number;
    maxVertexTextureImageUnits?: number;
    maxViewportWidth?: number;
    maxViewportHeight?: number;
    maxVertexAttribs?: number;
    maxVertexUniformVectors?: number;
    maxFragmentUniformVectors?: number;
    maxVaryingVectors?: number;
    maxDrawBuffers?: number;
    maxColorAttachments?: number;
    maxAnisotropy?: number;

    vertexShaderHighFloat?: PrecisionFormat;
    vertexShaderMediumFloat?: PrecisionFormat;
    vertexShaderLowFloat?: PrecisionFormat;
    fragmentShaderHighFloat?: PrecisionFormat;
    fragmentShaderMediumFloat?: PrecisionFormat;
    fragmentShaderLowFloat?: PrecisionFormat;

    extensions?: string[];

    webgpuAdapter?: {
        architecture?: string;
        device?: string;
        vendor?: string;
        backend?: string;
    };

    aliasedPointSizeRange?: [number, number];
    aliasedLineWidthRange?: [number, number];
    subpixelBits?: number;
    samples?: number;
};

/* =====================================================
   BENCHMARK TYPES
   ===================================================== */

export type BenchmarkMode = 'normal' | 'hard' | 'extreme';

export interface BenchmarkTest {
    name: string;
    description: string;
    prompt: string;
    maxTokens: number;
    category: 'speed' | 'reasoning' | 'creativity' | 'knowledge';
}

export interface BenchmarkResult {
    name: string;
    prompt: string;
    response: string;
    totalTime: number;
    tokenCount: number;
    maxTokens: number;
    wordCount: number;
    charCount: number;
    tokensPerSecond: number;
    firstTokenLatencyMs: number;
    startTime: number;
    endTime: number;
}

export interface BenchmarkResults {
    modelName?: string;
    tokensPerSecond: number;
    loadTime: number;
    score: number;
    benchmarks: BenchmarkResult[];
}

export interface BenchmarkData {
    normalizedGPU?: string;
    performanceScore?: number;
    performanceTier?: string;
    graphicsBackend?: string;
    gpuBrand?: string;
    platformType?: string;
}

/* =====================================================
   SUBMIT / RESULTS PAGE
   ===================================================== */

export interface SubmitResultsPageProps {
    onSubmit: () => void;
    onSkip: () => void;
    benchmarkData: BenchmarkData;
    systemSpecs: PCSpecs;
    benchmarkResults: BenchmarkResults;
    modelName: string;
    firstTokenLatencyMs: number | null;
    totalBenchmarkTime: number | null;
}

/* =====================================================
   MODEL / API TYPES
   ===================================================== */

export type ModelProvider = 'huggingface' | 'webllm' | 'local';

export interface GenerationParameters {
    max_length?: number;
    temperature?: number;
    top_p?: number;
    do_sample?: boolean;
    return_full_text?: boolean;
}

export interface ModelConfig {
    modelId: string;
    provider: ModelProvider;
    defaultParameters?: GenerationParameters;
}

export interface HuggingFaceRequest {
    inputs: string;
    parameters?: GenerationParameters;
}

export interface HuggingFaceResponse {
    generated_text?: string;
    error?: string;
}

export interface APIGenerateRequest {
    prompt: string;
    parameters?: GenerationParameters;
}

export interface APIGenerateResponse {
    generated_text: string;
}

export interface APIErrorResponse {
    error: string;
}