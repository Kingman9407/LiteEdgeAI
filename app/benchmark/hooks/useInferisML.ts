'use client';

import { useRef, useState } from 'react';

// Matches the return shape of useWebLLM so components are interchangeable.
const DEFAULT_CONTEXT_WINDOW = 4096;
export const INFERIS_BENCHMARK_MAX_TOKENS = 3000;

export function useInferisML() {
    const poolRef   = useRef<any>(null);
    const handleRef = useRef<any>(null);

    const [modelLoaded,      setModelLoaded]      = useState(false);
    const [status,           setStatus]           = useState('');
    const [contextWindowSize, setContextWindowSize] = useState<number | null>(null);

    /* ─── helpers ─────────────────────────────────────────── */
    const estimateTokens = (text: string) =>
        Math.ceil(text.trim().split(/\s+/).length * 1.3);

    /* ─── loadModel ────────────────────────────────────────── */
    const loadModel = async (modelId?: string) => {
        try {
            setStatus('🔧 Starting inferis-ml worker pool…');
            setModelLoaded(false);

            // Dynamic imports so Next.js SSR doesn't choke
            const { createPool }    = await import('inferis-ml');
            const { webLlmAdapter } = await import('inferis-ml/adapters/web-llm');

            const selectedModel = modelId ?? 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC';

            // Use a static worker URL from /public to bypass Turbopack worker resolution.
            const pool = await createPool({
                adapter:       webLlmAdapter(),
                workerUrl:     new URL('/inferis-worker.js', location.origin),
                defaultDevice: 'auto',   // WebGPU → WASM auto-fallback
                maxWorkers:    1,
                taskTimeout:   180_000,
            });

            poolRef.current = pool;
            setStatus(`📥 Loading ${selectedModel} via inferis-ml worker pool…`);

            // pool.load() resolves only after the model is fully ready.
            // onProgress fires incremental download/compile status updates.
            const handle = await pool.load<string>('text-generation', {
                model:      selectedModel,
                onProgress: ({ phase }: { phase: string }) =>
                    setStatus(`📥 [inferis-ml] ${phase}`),
            });

            handleRef.current = handle;

            // ✅ Model is confirmed ready at this point (pool.load resolved).
            // We attach onStateChange only for FUTURE events (error / dispose).
            handle.onStateChange((state: string) => {
                if (state === 'error') {
                    setModelLoaded(false);
                    setStatus('❌ [inferis-ml] Model error — try reloading');
                }
                if (state === 'disposed') {
                    setModelLoaded(false);
                    setStatus('Model disposed');
                }
            });

            setContextWindowSize(DEFAULT_CONTEXT_WINDOW);
            setModelLoaded(true);
            setStatus(`✅ [inferis-ml] ${selectedModel} ready — worker pool active`);

        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            setStatus(`❌ [inferis-ml] ${msg}`);
            console.error('inferis-ml load error:', err);
        }
    };

    /* ─── unloadModel ──────────────────────────────────────── */
    const unloadModel = async () => {
        if (handleRef.current) {
            await handleRef.current.dispose().catch(() => {});
            handleRef.current = null;
        }
        poolRef.current = null;
        setModelLoaded(false);
        setContextWindowSize(null);
        setStatus('Model unloaded');
    };

    /* ─── generate (non-streaming) ─────────────────────────── */
    const generate = async (
        prompt: string,
        options?: { temperature?: number; max_tokens?: number }
    ): Promise<string> => {
        if (!handleRef.current) throw new Error('Model not loaded.');
        const result = await handleRef.current.run({
            messages:    [{ role: 'user', content: prompt }],
            temperature: options?.temperature ?? 0.7,
            max_tokens:  options?.max_tokens  ?? 512,
        });
        return typeof result === 'string' ? result : String(result);
    };

    /* ─── generateStream (async generator) ─────────────────── */
    const generateStream = async function* (
        prompt: string,
        options?: { temperature?: number; max_tokens?: number }
    ) {
        if (!handleRef.current) throw new Error('Model not loaded.');

        const stream = handleRef.current.stream({
            messages:    [{ role: 'user', content: prompt }],
            temperature: options?.temperature ?? 0.7,
            max_tokens:  options?.max_tokens  ?? 512,
        });

        for await (const token of stream) {
            yield token as string;
        }
    };

    /* ─── generateStreamBenchmark ───────────────────────────── */
    const generateStreamBenchmark = async (
        prompt: string,
        maxTokens: number,
        temperature = 0
    ): Promise<{
        firstTokenLatencyMs: number;
        tokensPerSecond:     number;
        tokenCount:          number;
        requestedMaxTokens:  number;
        text:                string;
        isUnifiedMemory:     boolean;
    }> => {
        if (!handleRef.current) throw new Error('Model not loaded.');

        const ctx = contextWindowSize ?? DEFAULT_CONTEXT_WINDOW;
        const promptTokens = estimateTokens(prompt);
        const safeMax = Math.min(maxTokens, ctx - promptTokens - 64);

        if (safeMax < 16) {
            throw new Error(
                `Prompt too long. ctx=${ctx}, prompt≈${promptTokens} tokens, ${ctx - promptTokens} left`
            );
        }

        let firstTokenLatencyMs = 0;
        let tokenCount = 0;
        let text = '';
        const requestStart = performance.now();
        let streamStart: number | null = null;

        const stream = handleRef.current.stream({
            messages:    [{ role: 'user', content: prompt }],
            temperature,
            max_tokens:  safeMax,
        });

        for await (const token of stream) {
            const content = token as string;
            if (!content) continue;

            if (streamStart === null) {
                firstTokenLatencyMs = performance.now() - requestStart;
                streamStart = performance.now();
                tokenCount = 1;
            } else {
                tokenCount++;
            }
            text += content;
        }

        const streamDurationSec =
            streamStart !== null ? (performance.now() - streamStart) / 1000 : 0;
        const tokensPerSecond =
            streamDurationSec > 0 ? tokenCount / streamDurationSec : 0;

        return {
            firstTokenLatencyMs,
            tokensPerSecond,
            tokenCount,
            requestedMaxTokens: safeMax,
            text,
            isUnifiedMemory: false, // inferis-ml handles device internally
        };
    };

    /* ─── recommendModel ────────────────────────────────────── */
    const recommendModel = () => 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC';

    /* ─── checkDeviceCapabilities ───────────────────────────── */
    const checkDeviceCapabilities = async () => null;

    return {
        engineRef:              handleRef, // alias for compat
        modelLoaded,
        status,
        capabilities:           null,
        contextWindowSize,
        loadModel,
        unloadModel,
        generate,
        generateStream,
        generateStreamBenchmark,
        recommendModel,
        checkDeviceCapabilities,
    };
}
