// services/supabaseBenchmarkService.ts
import { createClient } from '@supabase/supabase-js';
import type { PCSpecs, BenchmarkData, BenchmarkResults, GPUInfo } from '../types/types';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!;

// ─── ENV DEBUG ────────────────────────────────────────────────────────────────
console.debug('[Supabase Init] supabaseUrl:', supabaseUrl ?? '❌ MISSING');
console.debug(
    '[Supabase Init] supabaseKey:',
    supabaseKey ? `✅ present (${supabaseKey.slice(0, 8)}…)` : '❌ MISSING'
);
// ─────────────────────────────────────────────────────────────────────────────

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

// ─── SHARED DEBUG HELPERS ─────────────────────────────────────────────────────
/** Pretty-prints a value under a collapsible console group */
function debugGroup(label: string, value: unknown) {
    console.groupCollapsed(`[DEBUG] ${label}`);
    console.log(value);
    console.groupEnd();
}

/**
 * Iterates over an object's keys and warns about any that are
 * null / undefined / empty-string.
 */
function debugRequiredFields(label: string, obj: Record<string, unknown>) {
    console.groupCollapsed(`[DEBUG] Field check — ${label}`);
    let allOk = true;
    for (const [key, val] of Object.entries(obj)) {
        const bad = val === null || val === undefined || val === '';
        if (bad) {
            console.warn(`  ⚠️  ${key}: MISSING (got ${JSON.stringify(val)})`);
            allOk = false;
        } else {
            console.log(`  ✅ ${key}:`, val);
        }
    }
    if (allOk) console.log('All fields present ✅');
    console.groupEnd();
}
// ─────────────────────────────────────────────────────────────────────────────

// Type definitions
interface SubmitBenchmarkParams {
    modelName: string;
    systemSpecs: PCSpecs;
    benchmarkData: BenchmarkData;
    benchmarkResults: BenchmarkResults;
    fullGPUInfo?: GPUInfo | null;
    sessionId?: string;
    firstTokenLatencyMs?: number | null;
    totalBenchmarkTime?: number | null;
    difficulty?: string | null;
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
    firstTokenLatencyMs,
    totalBenchmarkTime,
    difficulty,
}: SubmitBenchmarkParams) {
    devLog('Submitting benchmark for model:', modelName);

    // ── INPUT DEBUG ───────────────────────────────────────────────────────────
    console.group('[submitBenchmarkToSupabase] invoked');
    debugGroup('modelName', modelName);
    debugGroup('systemSpecs', systemSpecs);
    debugGroup('benchmarkData', benchmarkData);
    debugGroup('benchmarkResults', benchmarkResults);
    debugGroup('fullGPUInfo', fullGPUInfo);
    debugGroup('sessionId', sessionId);
    debugGroup('firstTokenLatencyMs', firstTokenLatencyMs);
    debugGroup('totalBenchmarkTime', totalBenchmarkTime);
    debugGroup('difficulty', difficulty);

    debugRequiredFields('top-level params', {
        modelName,
        'systemSpecs.cpuCores': systemSpecs?.cpuCores,
        'systemSpecs.deviceMemory': systemSpecs?.deviceMemory,
        'systemSpecs.os': systemSpecs?.os,
        'systemSpecs.screen': systemSpecs?.screen,
        'benchmarkData.normalizedGPU': benchmarkData?.normalizedGPU,
        'benchmarkData.gpuBrand': benchmarkData?.gpuBrand,
        'benchmarkData.graphicsBackend': benchmarkData?.graphicsBackend,
        'benchmarkData.platformType': benchmarkData?.platformType,
        'benchmarkData.performanceScore': benchmarkData?.performanceScore,
        'benchmarkData.performanceTier': benchmarkData?.performanceTier,
        'benchmarkResults.tokensPerSecond': benchmarkResults?.tokensPerSecond,
        'benchmarkResults.loadTime': benchmarkResults?.loadTime,
        firstTokenLatencyMs,
        totalBenchmarkTime,
        difficulty,
    });
    // ─────────────────────────────────────────────────────────────────────────

    try {
        const modelFamily = extractModelFamily(modelName);
        const modelSize = extractModelSize(modelName);
        const gpuName = benchmarkData.normalizedGPU || 'Unknown GPU';

        devLog('Extracted:', { modelFamily, modelSize, gpuName });
        console.debug('[DEBUG] modelFamily:', modelFamily ?? '⚠️ null', '| modelSize:', modelSize ?? '⚠️ null', '| gpuName:', gpuName);

        if (!modelFamily) console.warn('[DEBUG] ⚠️ Could not extract modelFamily from:', modelName);
        if (!modelSize) console.warn('[DEBUG] ⚠️ Could not extract modelSize from:', modelName);
        if (gpuName === 'Unknown GPU') console.warn('[DEBUG] ⚠️ normalizedGPU was missing — falling back to "Unknown GPU"');

        // ── ENRICH BENCHMARKS ─────────────────────────────────────────────────
        const rawBenchmarks = benchmarkResults.benchmarks || [];
        console.debug('[DEBUG] benchmarkResults.benchmarks count:', rawBenchmarks.length);
        if (rawBenchmarks.length === 0) {
            console.warn('[DEBUG] ⚠️ benchmarks array is EMPTY — no individual run data will be sent!');
        }

        const enrichedBenchmarks = rawBenchmarks.map((bench, idx) => {
            const enriched = {
                name: bench.name,
                tokensPerSecond: bench.tokensPerSecond,
                totalTime: bench.totalTime,
                tokenCount: bench.tokenCount,
                wordCount: bench.wordCount,
                startTime: bench.startTime ?? null,
                endTime: bench.endTime ?? null,
                prompt: bench.prompt ?? null,
                response: bench.response ?? null,
            };

            // Per-run field check
            const missing: string[] = [];
            if (!enriched.name) missing.push('name');
            if (!enriched.tokensPerSecond) missing.push('tokensPerSecond');
            if (!enriched.totalTime) missing.push('totalTime');
            if (!enriched.tokenCount) missing.push('tokenCount');
            if (!enriched.prompt) missing.push('prompt');
            if (!enriched.response) missing.push('response');

            if (missing.length) {
                console.warn(`[DEBUG] ⚠️ Benchmark[${idx}] ("${enriched.name}") — missing: [${missing.join(', ')}]`);
            } else {
                console.debug(`[DEBUG] ✅ Benchmark[${idx}] ("${enriched.name}") complete`);
            }

            return enriched;
        });

        debugGroup('enrichedBenchmarks (final, sent to RPC)', enrichedBenchmarks);
        // ─────────────────────────────────────────────────────────────────────

        // Helper: coerce to integer — strips non-numeric chars first (e.g. "8GB" -> 8)
        const toInt = (v: unknown): number | null => {
            const stripped = String(v ?? '').replace(/[^0-9.]/g, '');
            const n = Number(stripped);
            return stripped && isFinite(n) ? Math.round(n) : null;
        };

        // Helper: coerce to numeric/float
        const toNumeric = (v: unknown): number | null => {
            const n = Number(v);
            return isFinite(n) ? n : null;
        };

        // Prepare RPC parameters — typed to match the NEWER overload:
        //   p_device_memory    => numeric
        //   p_performance_score => integer
        //   p_tokens_per_second => numeric
        //   p_load_time         => numeric
        //   p_first_token_latency_ms => numeric
        //   p_total_benchmark_time   => numeric
        //   p_difficulty        => text   ← present only in newer overload
        const rpcParams = {
            p_model_name: modelName,
            p_model_family: modelFamily,
            p_model_size: modelSize,
            p_gpu_name: gpuName,
            p_gpu_brand: benchmarkData.gpuBrand || null,
            p_normalized_gpu_name: normalizeGPUName(gpuName),
            p_estimated_vram: toInt(fullGPUInfo?.predictedVRAM ?? null),
            p_cpu_cores: toInt(systemSpecs.cpuCores),
            p_device_memory: toNumeric(systemSpecs.deviceMemory),
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
            p_performance_score: toInt(benchmarkData.performanceScore),   // integer in newer overload
            p_performance_tier: benchmarkData.performanceTier,
            p_tokens_per_second: toNumeric(benchmarkResults.tokensPerSecond),
            p_load_time: toNumeric(totalBenchmarkTime ?? benchmarkResults.loadTime ?? null),
            p_first_token_latency_ms: toNumeric(firstTokenLatencyMs ?? null),
            p_total_benchmark_time: toNumeric(totalBenchmarkTime ?? null),
            p_benchmarks: enrichedBenchmarks,
            p_user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
            p_session_id: sessionId || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            p_difficulty: difficulty ?? null,
        };

        console.debug('[DEBUG] Coerced numeric fields:', {
            p_cpu_cores: rpcParams.p_cpu_cores,
            p_device_memory: rpcParams.p_device_memory,
            p_performance_score: rpcParams.p_performance_score,
            p_tokens_per_second: rpcParams.p_tokens_per_second,
            p_load_time: rpcParams.p_load_time,
            p_first_token_latency_ms: rpcParams.p_first_token_latency_ms,
            p_total_benchmark_time: rpcParams.p_total_benchmark_time,
            p_difficulty: rpcParams.p_difficulty,
        });

        // ── RPC PARAMS DEBUG ──────────────────────────────────────────────────
        debugGroup('rpcParams (full payload)', rpcParams);

        // Check JSON serializability — catches circular refs, BigInt, etc.
        try {
            const json = JSON.stringify(rpcParams);
            console.debug('[DEBUG] rpcParams serialized OK | size (bytes):', new TextEncoder().encode(json).byteLength);
        } catch (serErr) {
            console.error('[DEBUG] ❌ rpcParams is NOT JSON-serializable:', serErr);
        }

        // Log keys that resolved to null/undefined (may indicate upstream data gaps)
        const nullKeys = Object.entries(rpcParams)
            .filter(([, v]) => v === null || v === undefined)
            .map(([k]) => k);
        if (nullKeys.length) {
            console.warn('[DEBUG] RPC keys that are null/undefined (check if intentional):', nullKeys);
        }
        // ─────────────────────────────────────────────────────────────────────

        devLog('Calling insert_benchmark_data RPC...');
        console.time('[DEBUG] RPC round-trip');

        const { data, error } = await supabase.rpc('insert_benchmark_data', rpcParams);

        console.timeEnd('[DEBUG] RPC round-trip');

        // ── RESPONSE DEBUG ────────────────────────────────────────────────────
        console.debug('[DEBUG] RPC response — data:', data, '| error:', error);
        // ─────────────────────────────────────────────────────────────────────

        // Check both real Supabase errors AND errors returned as JSON inside data
        // (the Postgres function catches exceptions and returns them as { error, success })
        const dataError = data && typeof data === 'object' && 'error' in data && data.error
            ? String(data.error)
            : null;

        if (error || dataError) {
            const message = error?.message || dataError || 'Submission failed';
            devError('RPC Error:', message, error?.code);
            console.error('[DEBUG] ❌ RPC failed:', {
                supabaseError: error ? { message: error.message, code: error.code, details: (error as { details?: string }).details, hint: (error as { hint?: string }).hint } : null,
                dataError,
            });
            console.groupEnd();
            return { success: false, error: message };
        }

        devLog('Benchmark submitted successfully');
        console.debug('[DEBUG] ✅ Submission succeeded. Server returned:', data);
        console.groupEnd();

        return { success: true, data };

    } catch (error) {
        devError('Submit benchmark error:', error instanceof Error ? error.message : error);
        console.error('[DEBUG] ❌ Unexpected exception:', error);
        console.groupEnd();

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
    console.debug('[getModelGPUs] modelName:', modelName);

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
            console.error('[getModelGPUs] ❌', error);
            return null;
        }

        devLog('Model GPUs fetched:', data?.gpu_sessions?.length || 0, 'sessions');
        console.debug('[getModelGPUs] ✅ sessions:', data?.gpu_sessions?.length ?? 0);
        return data;
    } catch (error) {
        devError('Exception in getModelGPUs:', error);
        console.error('[getModelGPUs] ❌ Exception:', error);
        return null;
    }
}

/**
 * Get benchmarks for a specific GPU and model
 */
export async function getGPUBenchmarks(modelName: string, gpuName: string) {
    console.debug('[getGPUBenchmarks] modelName:', modelName, '| gpuName:', gpuName);

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
            console.error('[getGPUBenchmarks] ❌', error);
            return null;
        }

        devLog('GPU Benchmarks fetched');
        console.debug('[getGPUBenchmarks] ✅ data:', data);
        return data;
    } catch (error) {
        devError('Exception in getGPUBenchmarks:', error);
        console.error('[getGPUBenchmarks] ❌ Exception:', error);
        return null;
    }
}

/**
 * Get all models with their GPU test counts
 */
export async function getAllModels() {
    console.debug('[getAllModels] called');

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
            console.error('[getAllModels] ❌', error);
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
        console.debug('[getAllModels] ✅ count:', processedData?.length ?? 0);
        return processedData;
    } catch (error) {
        devError('Exception in getAllModels:', error);
        console.error('[getAllModels] ❌ Exception:', error);
        return null;
    }
}

/**
 * Get GPU performance comparison across all models
 */
export async function getGPULeaderboard(limit: number = 50) {
    console.debug('[getGPULeaderboard] limit:', limit);

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
            console.error('[getGPULeaderboard] ❌', error);
            return null;
        }

        devLog('GPU Leaderboard fetched:', data?.length || 0, 'entries');
        console.debug('[getGPULeaderboard] ✅ entries:', data?.length ?? 0);
        return data;
    } catch (error) {
        devError('Exception in getGPULeaderboard:', error);
        console.error('[getGPULeaderboard] ❌ Exception:', error);
        return null;
    }
}

/**
 * Get recent benchmark submissions
 */
export async function getRecentBenchmarks(limit: number = 10) {
    console.debug('[getRecentBenchmarks] limit:', limit);

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
            console.error('[getRecentBenchmarks] ❌', error);
            return null;
        }

        devLog('Recent benchmarks fetched:', data?.length || 0);
        console.debug('[getRecentBenchmarks] ✅ count:', data?.length ?? 0);
        return data;
    } catch (error) {
        devError('Exception in getRecentBenchmarks:', error);
        console.error('[getRecentBenchmarks] ❌ Exception:', error);
        return null;
    }
}

/**
 * Search GPUs by name
 */
export async function searchGPUs(searchTerm: string) {
    const sanitized = searchTerm.replace(/[^a-zA-Z0-9\s\-_.]/g, '').trim();
    console.debug('[searchGPUs] raw:', JSON.stringify(searchTerm), '→ sanitized:', JSON.stringify(sanitized));

    if (!sanitized) {
        console.warn('[searchGPUs] ⚠️ Empty after sanitization — returning []');
        return [];
    }

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
            console.error('[searchGPUs] ❌', error);
            return null;
        }

        devLog('GPU search completed:', data?.length || 0, 'results');
        console.debug('[searchGPUs] ✅ results:', data?.length ?? 0);
        return data;
    } catch (error) {
        devError('Exception in searchGPUs:', error);
        console.error('[searchGPUs] ❌ Exception:', error);
        return null;
    }
}

/**
 * Get statistics for a specific GPU across all models
 */
export async function getGPUStats(gpuName: string) {
    console.debug('[getGPUStats] gpuName:', gpuName);

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
            console.error('[getGPUStats] ❌', error);
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
            avg_first_token_latency_ms: data?.length > 0
                ? data.reduce((sum, d) => sum + (d.first_token_latency_ms || 0), 0) / data.length
                : 0,
            avg_total_benchmark_time: data?.length > 0
                ? data.reduce((sum, d) => sum + (d.total_benchmark_time || 0), 0) / data.length
                : 0,
            sessions: data
        };

        devLog('GPU stats calculated');
        console.debug('[getGPUStats] ✅ stats summary:', {
            total_tests: stats.total_tests,
            models_tested: stats.models_tested,
            avg_tokens_per_second: stats.avg_tokens_per_second,
            avg_first_token_latency_ms: stats.avg_first_token_latency_ms,
        });
        return stats;
    } catch (error) {
        devError('Exception in getGPUStats:', error);
        console.error('[getGPUStats] ❌ Exception:', error);
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
            console.debug(`[extractModelFamily] "${modelName}" → "${match[1]}"`);
            return match[1];
        }
    }

    console.warn(`[extractModelFamily] ⚠️ No family matched for "${modelName}"`);
    return null;
}

/**
 * Helper function to extract model size from model name
 */
function extractModelSize(modelName: string): string | null {
    const sizeMatch = modelName.match(/(\d+(?:\.\d+)?[BM])/i);
    const result = sizeMatch ? sizeMatch[1].toUpperCase() : null;
    console.debug(`[extractModelSize] "${modelName}" → "${result ?? 'null'}"`);
    return result;
}

/**
 * Helper function to normalize GPU name
 */
function normalizeGPUName(gpuName: string): string {
    const normalized = gpuName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
    console.debug(`[normalizeGPUName] "${gpuName}" → "${normalized}"`);
    return normalized;
}