// services/supabaseBenchmarkService.ts
import { createClient } from '@supabase/supabase-js';
import type { PCSpecs, BenchmarkData, BenchmarkResults, GPUInfo } from '../types/types';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!;

console.log('=== SUPABASE INITIALIZATION DEBUG ===');
console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key exists:', !!supabaseKey);
console.log('Supabase Key length:', supabaseKey?.length);
console.log('Environment:', process.env.NODE_ENV);
console.log('=====================================');

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ CRITICAL: Missing Supabase credentials');
    console.error('URL present:', !!supabaseUrl);
    console.error('Key present:', !!supabaseKey);
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Type definitions
interface SubmitBenchmarkParams {
    modelName: string;
    systemSpecs: PCSpecs;
    benchmarkData: BenchmarkData;
    benchmarkResults: BenchmarkResults;
    fullGPUInfo?: GPUInfo | null;
    sessionId?: string;
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
    sessionId
}: SubmitBenchmarkParams) {
    console.log('🚀 === SUBMIT BENCHMARK DEBUG START ===');
    console.log('Timestamp:', new Date().toISOString());

    try {
        // Log input parameters
        console.log('📊 Input Parameters:');
        console.log('  Model Name:', modelName);
        console.log('  Session ID:', sessionId);
        console.log('  System Specs:', JSON.stringify(systemSpecs, null, 2));
        console.log('  Benchmark Data:', JSON.stringify(benchmarkData, null, 2));
        console.log('  Benchmark Results:', JSON.stringify(benchmarkResults, null, 2));

        const modelFamily = extractModelFamily(modelName);
        const modelSize = extractModelSize(modelName);
        const gpuName = benchmarkData.normalizedGPU || 'Unknown GPU';

        console.log('🔍 Extracted Values:');
        console.log('  Model Family:', modelFamily);
        console.log('  Model Size:', modelSize);
        console.log('  GPU Name:', gpuName);

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
            p_load_time: benchmarkResults.loadTime,
            p_benchmarks: benchmarkResults.benchmarks || [],
            p_user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
            p_session_id: sessionId || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        };

        console.log('📤 RPC Parameters:', JSON.stringify(rpcParams, null, 2));
        console.log('⏳ Calling insert_benchmark_data RPC...');

        // Call the RPC function
        const { data, error } = await supabase.rpc('insert_benchmark_data', rpcParams);

        if (error) {
            console.error('❌ === RPC ERROR DETAILS ===');
            console.error('Error Object:', error);
            console.error('Error Message:', error.message);
            console.error('Error Code:', error.code);
            console.error('Error Details:', error.details);
            console.error('Error Hint:', error.hint);
            console.error('========================');

            return {
                success: false,
                error: error.message || JSON.stringify(error),
                errorDetails: {
                    code: error.code,
                    details: error.details,
                    hint: error.hint,
                    message: error.message
                }
            };
        }

        console.log('✅ RPC Success!');
        console.log('Response Data:', JSON.stringify(data, null, 2));

        const result = {
            success: true,
            data: data
        };

        console.log('📊 Final Result:', JSON.stringify(result, null, 2));
        console.log('✅ === SUBMIT BENCHMARK DEBUG END ===');

        return result;
    } catch (error) {
        console.error('❌ === CATCH BLOCK ERROR ===');
        console.error('Error Type:', typeof error);
        console.error('Error:', error);

        if (error instanceof Error) {
            console.error('Error Message:', error.message);
            console.error('Error Stack:', error.stack);
        }

        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            errorType: error?.constructor?.name || typeof error,
            errorStack: error instanceof Error ? error.stack : undefined
        };
    }
}

/**
 * Get all GPUs tested for a specific model
 */
export async function getModelGPUs(modelName: string) {
    console.log('📊 getModelGPUs called');
    console.log('  Model Name:', modelName);

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
            console.error('❌ Error fetching model GPUs:', error);
            return null;
        }

        console.log('✅ Model GPUs fetched:', data?.gpu_sessions?.length || 0, 'sessions');
        return data;
    } catch (error) {
        console.error('❌ Exception in getModelGPUs:', error);
        return null;
    }
}

/**
 * Get benchmarks for a specific GPU and model
 */
export async function getGPUBenchmarks(modelName: string, gpuName: string) {
    console.log('📊 getGPUBenchmarks called');
    console.log('  Model:', modelName, 'GPU:', gpuName);

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
            console.error('❌ Error fetching GPU benchmarks:', error);
            return null;
        }

        console.log('✅ GPU Benchmarks fetched');
        return data;
    } catch (error) {
        console.error('❌ Exception in getGPUBenchmarks:', error);
        return null;
    }
}

/**
 * Get all models with their GPU test counts
 */
export async function getAllModels() {
    console.log('📊 getAllModels called');

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
            console.error('❌ Error fetching models:', error);
            return null;
        }

        // Process data to add counts
        const processedData = data?.map(model => ({
            ...model,
            total_gpu_types: new Set(model.gpu_sessions?.map(s => s.gpu_name)).size || 0,
            total_sessions: model.gpu_sessions?.length || 0,
            avg_tokens_per_second: model.gpu_sessions?.length > 0
                ? model.gpu_sessions.reduce((sum, s) => sum + (s.tokens_per_second || 0), 0) / model.gpu_sessions.length
                : 0
        }));

        console.log('✅ Models fetched:', processedData?.length || 0);
        return processedData;
    } catch (error) {
        console.error('❌ Exception in getAllModels:', error);
        return null;
    }
}

/**
 * Get GPU performance comparison across all models
 */
export async function getGPULeaderboard(limit: number = 50) {
    console.log('📊 getGPULeaderboard called');

    try {
        const { data, error } = await supabase
            .from('gpu_sessions')
            .select(`
                gpu_name,
                gpu_brand,
                performance_score,
                tokens_per_second,
                performance_tier,
                created_at,
                models (
                    model_name,
                    model_family
                )
            `)
            .order('tokens_per_second', { ascending: false, nullsFirst: false })
            .limit(limit);

        if (error) {
            console.error('❌ Error fetching GPU leaderboard:', error);
            return null;
        }

        console.log('✅ GPU Leaderboard fetched:', data?.length || 0, 'entries');
        return data;
    } catch (error) {
        console.error('❌ Exception in getGPULeaderboard:', error);
        return null;
    }
}

/**
 * Get recent benchmark submissions
 */
export async function getRecentBenchmarks(limit: number = 10) {
    console.log('📊 getRecentBenchmarks called');

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
                    total_time
                )
            `)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('❌ Error fetching recent benchmarks:', error);
            return null;
        }

        console.log('✅ Recent benchmarks fetched:', data?.length || 0);
        return data;
    } catch (error) {
        console.error('❌ Exception in getRecentBenchmarks:', error);
        return null;
    }
}

/**
 * Search GPUs by name
 */
export async function searchGPUs(searchTerm: string) {
    console.log('🔍 searchGPUs called:', searchTerm);

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
            .or(`gpu_name.ilike.%${searchTerm}%,gpu_brand.ilike.%${searchTerm}%`)
            .limit(20);

        if (error) {
            console.error('❌ Error searching GPUs:', error);
            return null;
        }

        console.log('✅ GPU search completed:', data?.length || 0, 'results');
        return data;
    } catch (error) {
        console.error('❌ Exception in searchGPUs:', error);
        return null;
    }
}

/**
 * Get statistics for a specific GPU across all models
 */
export async function getGPUStats(gpuName: string) {
    console.log('📊 getGPUStats called:', gpuName);

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
            console.error('❌ Error fetching GPU stats:', error);
            return null;
        }

        // Calculate aggregated stats
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
            sessions: data
        };

        console.log('✅ GPU stats calculated');
        return stats;
    } catch (error) {
        console.error('❌ Exception in getGPUStats:', error);
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