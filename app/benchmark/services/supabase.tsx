// services/supabaseBenchmarkService.ts
import { createClient } from '@supabase/supabase-js';
import type { PCSpecs, BenchmarkData, BenchmarkResults, GPUInfo } from '../types/types';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase configuration. Check environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Dev-only logger — completely silent in production
const isDev = process.env.NODE_ENV === 'development';
function devLog(...args: unknown[]) {
    if (isDev) console.log(...args);
}
function devError(...args: unknown[]) {
    if (isDev) console.error(...args);
}

// Type definitions
interface SubmitBenchmarkParams {
    modelName: string;
    systemSpecs: PCSpecs;
    benchmarkData: BenchmarkData;
    benchmarkResults: BenchmarkResults;
    fullGPUInfo?: GPUInfo | null;
    sessionId?: string;
    // [ADDED] top-level timing fields from WebLLMBenchmark state
    firstTokenLatencyMs?: number | null;
    totalBenchmarkTime?: number | null;
}


/**
 * Main function to submit benchmark data to Supabase
 */
export async function submitBenchmarkToSupabase({
    modelName,
    systemSpecs,
    benchmarkData,
    benchmarkResults,
    fullGPUInfo,
    sessionId,
    firstTokenLatencyMs,   // [ADDED]
    totalBenchmarkTime,    // [ADDED]
}: SubmitBenchmarkParams) {
    devLog('Submitting benchmark for model:', modelName);

    try {

        const modelFamily = extractModelFamily(modelName);
        const modelSize = extractModelSize(modelName);
        const gpuName = benchmarkData.normalizedGPU || 'Unknown GPU';

        devLog('Extracted:', { modelFamily, modelSize, gpuName });

        // [UPDATED] benchmarks array now includes startTime, endTime, prompt, response
        const enrichedBenchmarks = (benchmarkResults.benchmarks || []).map(bench => ({
            name: bench.name,
            tokensPerSecond: bench.tokensPerSecond,
            totalTime: bench.totalTime,
            tokenCount: bench.tokenCount,
            wordCount: bench.wordCount,
            startTime: bench.startTime ?? null,   // [ADDED]
            endTime: bench.endTime ?? null,   // [ADDED]
            prompt: bench.prompt ?? null,   // [ADDED]
            response: bench.response ?? null,   // [ADDED]
        }));

        // Prepare RPC parameters matching your original structure
        const rpcParams = {
            p_model_name: modelName,
            p_model_family: modelFamily,
            p_model_size: modelSize,
            p_gpu_name: gpuName,
            p_gpu_brand: benchmarkData.gpuBrand || null,
            p_normalized_gpu_name: normalizeGPUName(gpuName),
            p_estimated_vram: fullGPUInfo?.predictedVRAM || null,
            p_cpu_cores: systemSpecs.cpuCores,
            p_device_memory: systemSpecs.deviceMemory,
            p_os: systemSpecs.os,
            p_screen_resolution: systemSpecs.screen,
            p_graphics_backend: benchmarkData.graphicsBackend,
            p_platform_type: benchmarkData.platformType,
            p_gpu_capabilities: fullGPUInfo ? {
                maxTextureSize: fullGPUInfo.maxTextureSize,
                maxViewportWidth: fullGPUInfo.maxViewportWidth,
                maxAnisotropy: fullGPUInfo.maxAnisotropy,
                capabilities: fullGPUInfo.capabilities,
                extensions: fullGPUInfo.extensions
            } : null,
            p_performance_score: benchmarkData.performanceScore,
            p_performance_tier: benchmarkData.performanceTier,
            p_tokens_per_second: benchmarkResults.tokensPerSecond,
            // [UPDATED] p_load_time now correctly sourced from totalBenchmarkTime
            p_load_time: totalBenchmarkTime ?? benchmarkResults.loadTime ?? null,
            // [ADDED] new RPC params
            p_first_token_latency_ms: firstTokenLatencyMs ?? null,
            p_total_benchmark_time: totalBenchmarkTime ?? null,
            // [UPDATED] enrichedBenchmarks replaces bare benchmarks array
            p_benchmarks: enrichedBenchmarks,
            p_user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
            p_session_id: sessionId || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        };

        devLog('Calling insert_benchmark_data RPC...');

        // Call the RPC function
        const { data, error } = await supabase.rpc('insert_benchmark_data', rpcParams);

        if (error) {
            devError('RPC Error:', error.message, error.code);

            return {
                success: false,
                error: error.message || 'Submission failed'
            };
        }

        devLog('Benchmark submitted successfully');

        return {
            success: true,
            data: data
        };
    } catch (error) {
        devError('Submit benchmark error:', error instanceof Error ? error.message : error);

        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Get all GPUs tested for a specific model
 */
export async function getModelGPUs(modelName: string) {

    try {
        const { data, error } = await supabase
            .from('models')
            .select(`
                *,
                gpu_sessions (
                    *,
                    benchmarks (*)
                )
            `)
            .eq('model_name', modelName)
            .single();

        if (error) {
            devError('Error fetching model GPUs:', error.message);
            return null;
        }

        devLog('Model GPUs fetched:', data?.gpu_sessions?.length || 0, 'sessions');
        return data;
    } catch (error) {
        devError('Exception in getModelGPUs:', error);
        return null;
    }
}

/**
 * Get benchmarks for a specific GPU and model
 */
export async function getGPUBenchmarks(modelName: string, gpuName: string) {

    try {
        const { data, error } = await supabase
            .from('models')
            .select(`
                id,
                model_name,
                gpu_sessions!inner (
                    *,
                    benchmarks (*)
                )
            `)
            .eq('model_name', modelName)
            .eq('gpu_sessions.gpu_name', gpuName)
            .single();

        if (error) {
            devError('Error fetching GPU benchmarks:', error.message);
            return null;
        }

        devLog('GPU Benchmarks fetched');
        return data;
    } catch (error) {
        devError('Exception in getGPUBenchmarks:', error);
        return null;
    }
}

/**
 * Get all models with their GPU test counts
 */
export async function getAllModels() {

    try {
        const { data, error } = await supabase
            .from('models')
            .select(`
                *,
                gpu_sessions (
                    id,
                    gpu_name,
                    performance_score,
                    tokens_per_second
                )
            `)
            .order('created_at', { ascending: false });

        if (error) {
            devError('Error fetching models:', error.message);
            return null;
        }

        const processedData = data?.map(model => ({
            ...model,
            total_gpu_types: new Set(model.gpu_sessions?.map((s: { gpu_name?: string }) => s.gpu_name)).size || 0,
            total_sessions: model.gpu_sessions?.length || 0,
            avg_tokens_per_second:
                model.gpu_sessions && model.gpu_sessions.length > 0
                    ? model.gpu_sessions.reduce(
                        (sum: number, s: { tokens_per_second?: number }) =>
                            sum + (s.tokens_per_second || 0),
                        0
                    ) / model.gpu_sessions.length
                    : 0,
        }));

        devLog('Models fetched:', processedData?.length || 0);
        return processedData;
    } catch (error) {
        devError('Exception in getAllModels:', error);
        return null;
    }
}

/**
 * Get GPU performance comparison across all models
 */
export async function getGPULeaderboard(limit: number = 50) {

    try {
        const { data, error } = await supabase
            .from('gpu_sessions')
            .select(`
                gpu_name,
                gpu_brand,
                performance_score,
                tokens_per_second,
                performance_tier,
                first_token_latency_ms,
                total_benchmark_time,
                created_at,
                models (
                    model_name,
                    model_family
                )
            `)
            .order('tokens_per_second', { ascending: false, nullsFirst: false })
            .limit(limit);

        if (error) {
            devError('Error fetching GPU leaderboard:', error.message);
            return null;
        }

        devLog('GPU Leaderboard fetched:', data?.length || 0, 'entries');
        return data;
    } catch (error) {
        devError('Exception in getGPULeaderboard:', error);
        return null;
    }
}

/**
 * Get recent benchmark submissions
 */
export async function getRecentBenchmarks(limit: number = 10) {

    try {
        const { data, error } = await supabase
            .from('gpu_sessions')
            .select(`
                *,
                models (
                    model_name,
                    model_family
                ),
                benchmarks (
                    name,
                    tokens_per_second,
                    total_time,
                    start_time,
                    end_time,
                    prompt,
                    response
                )
            `)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            devError('Error fetching recent benchmarks:', error.message);
            return null;
        }

        devLog('Recent benchmarks fetched:', data?.length || 0);
        return data;
    } catch (error) {
        devError('Exception in getRecentBenchmarks:', error);
        return null;
    }
}

/**
 * Search GPUs by name
 */
export async function searchGPUs(searchTerm: string) {
    const sanitized = searchTerm.replace(/[^a-zA-Z0-9\s\-_.]/g, '').trim();
    if (!sanitized) return [];

    try {
        const { data, error } = await supabase
            .from('gpu_sessions')
            .select(`
                gpu_name,
                gpu_brand,
                performance_score,
                tokens_per_second,
                models (
                    model_name
                )
            `)
            .or(`gpu_name.ilike.%${sanitized}%,gpu_brand.ilike.%${sanitized}%`)
            .limit(20);

        if (error) {
            devError('Error searching GPUs:', error.message);
            return null;
        }

        devLog('GPU search completed:', data?.length || 0, 'results');
        return data;
    } catch (error) {
        devError('Exception in searchGPUs:', error);
        return null;
    }
}

/**
 * Get statistics for a specific GPU across all models
 */
export async function getGPUStats(gpuName: string) {

    try {
        const { data, error } = await supabase
            .from('gpu_sessions')
            .select(`
                *,
                models (
                    model_name,
                    model_family
                ),
                benchmarks (*)
            `)
            .eq('gpu_name', gpuName)
            .order('tokens_per_second', { ascending: false });

        if (error) {
            devError('Error fetching GPU stats:', error.message);
            return null;
        }

        const stats = {
            gpu_name: gpuName,
            total_tests: data?.length || 0,
            models_tested: new Set(data?.map(d => d.models?.model_name)).size || 0,
            avg_tokens_per_second: data?.length > 0
                ? data.reduce((sum, d) => sum + (d.tokens_per_second || 0), 0) / data.length
                : 0,
            max_tokens_per_second: Math.max(...(data?.map(d => d.tokens_per_second || 0) || [0])),
            min_tokens_per_second: Math.min(...(data?.map(d => d.tokens_per_second || 0) || [Infinity])),
            avg_performance_score: data?.length > 0
                ? data.reduce((sum, d) => sum + (d.performance_score || 0), 0) / data.length
                : 0,
            // [ADDED] latency aggregates
            avg_first_token_latency_ms: data?.length > 0
                ? data.reduce((sum, d) => sum + (d.first_token_latency_ms || 0), 0) / data.length
                : 0,
            avg_total_benchmark_time: data?.length > 0
                ? data.reduce((sum, d) => sum + (d.total_benchmark_time || 0), 0) / data.length
                : 0,
            sessions: data
        };

        devLog('GPU stats calculated');
        return stats;
    } catch (error) {
        devError('Exception in getGPUStats:', error);
        return null;
    }
}

/**
 * Helper function to extract model family from model name
 */
function extractModelFamily(modelName: string): string | null {
    const patterns = [
        /^(Llama)/i,
        /^(Phi)/i,
        /^(Gemma)/i,
        /^(Mistral)/i,
        /^(Qwen)/i,
        /^(GPT)/i,
        /^(Claude)/i
    ];

    for (const pattern of patterns) {
        const match = modelName.match(pattern);
        if (match) {
            return match[1];
        }
    }

    return null;
}

/**
 * Helper function to extract model size from model name
 */
function extractModelSize(modelName: string): string | null {
    const sizeMatch = modelName.match(/(\d+(?:\.\d+)?[BM])/i);
    return sizeMatch ? sizeMatch[1].toUpperCase() : null;
}

/**
 * Helper function to normalize GPU name
 */
function normalizeGPUName(gpuName: string): string {
    return gpuName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
}