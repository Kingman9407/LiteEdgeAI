// shared/types.ts — SINGLE SOURCE OF TRUTH FOR ALL TYPES

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
    // Identity
    renderer?: string;
    vendor?: string;
    unmaskedRenderer?: string;
    unmaskedVendor?: string;

    // API Support
    webgpu?: boolean;
    webgl?: boolean;
    webgl2?: boolean;
    webglVersion?: string;
    shadingLanguageVersion?: string;

    // Analysis
    predictedVRAM?: string;
    predictedTier?: string;
    performanceScore?: number;
    capabilities?: string[];

    // Technical Limits
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

    // Shader Precision
    vertexShaderHighFloat?: PrecisionFormat;
    vertexShaderMediumFloat?: PrecisionFormat;
    vertexShaderLowFloat?: PrecisionFormat;
    fragmentShaderHighFloat?: PrecisionFormat;
    fragmentShaderMediumFloat?: PrecisionFormat;
    fragmentShaderLowFloat?: PrecisionFormat;

    // Extensions
    extensions?: string[];

    // WebGPU Adapter
    webgpuAdapter?: {
        architecture?: string;
        device?: string;
        vendor?: string;
        backend?: string;
    };

    // Additional
    aliasedPointSizeRange?: [number, number];
    aliasedLineWidthRange?: [number, number];
    subpixelBits?: number;
    samples?: number;
};

/* =====================================================
   BENCHMARK TYPES
   ===================================================== */

export type BenchmarkMode = 'normal' | 'hard';

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
    tokensPerSecond: number;
    loadTime: number;
    benchmarks: BenchmarkResult[];
};

export type BenchmarkData = {
    normalizedGPU?: string;
    performanceScore?: number;
    performanceTier?: string;
    graphicsBackend?: string;
    gpuBrand?: string;
    platformType?: string;
};

export interface BenchmarkTest {
    name: string;
    description: string;
    prompt: string;
    category: 'speed' | 'reasoning' | 'creativity' | 'knowledge';
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
    fullGPUInfo?: GPUInfo | null;
    modelName: string; // Add this line
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
