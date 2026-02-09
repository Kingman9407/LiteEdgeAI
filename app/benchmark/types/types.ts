/* =====================================================
   MODEL GENERATION PARAMETERS
   ===================================================== */
export type BenchmarkMode = 'normal' | 'hard';


export interface GenerationParameters {
    /** Maximum number of tokens to generate */
    max_length?: number;

    /** Controls randomness (0.0 = deterministic, higher = more creative) */
    temperature?: number;

    /** Nucleus sampling threshold */
    top_p?: number;

    /** Whether to sample or use greedy decoding */
    do_sample?: boolean;

    /** Include prompt in the generated output */
    return_full_text?: boolean;
}

/* =====================================================
   HUGGING FACE INFERENCE API
   ===================================================== */

export interface HuggingFaceRequest {
    /** Input prompt */
    inputs: string;

    /** Optional generation controls */
    parameters?: GenerationParameters;
}

export interface HuggingFaceResponse {
    /** Generated text from the model */
    generated_text?: string;

    /** Error message if generation failed */
    error?: string;
}

/* =====================================================
   INTERNAL / PUBLIC API CONTRACT
   ===================================================== */

export interface APIGenerateRequest {
    /** Prompt sent from client */
    prompt: string;

    /** Optional overrides for generation */
    parameters?: GenerationParameters;
}

export interface APIGenerateResponse {
    /** Final generated text */
    generated_text: string;
}

export interface APIErrorResponse {
    /** Error message returned by API */
    error: string;
}

/* =====================================================
   OPTIONAL: MODEL METADATA (FUTURE USE)
   ===================================================== */

export type ModelProvider = 'huggingface' | 'webllm' | 'local';
export type Benchmark = 'normal' | 'hard';


export interface ModelConfig {
    /** Model identifier (e.g., gpt2, llama, phi) */
    modelId: string;

    /** Provider type */
    provider: ModelProvider;

    /** Default generation parameters */
    defaultParameters?: GenerationParameters;
}

/* =====================================================
   BENCHMARK TYPES
   ===================================================== */

export interface BenchmarkResult {
    name: string;
    prompt: string;
    response: string;
    tokensPerSecond: number;
    totalTime: number;
    tokenCount: number;
    wordCount: number;
    charCount: number;
}


export interface BenchmarkTest {
    name: string;
    description: string;
    prompt: string;
    category: 'speed' | 'reasoning' | 'creativity' | 'knowledge';
}

