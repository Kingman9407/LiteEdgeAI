'use client';

import { useRef, useState } from 'react';
import * as webllm from '@mlc-ai/web-llm';

interface DeviceCapabilities {
    hasWebGPU: boolean;
    memoryGB: number;
    isMobile: boolean;
    isUnifiedMemory?: boolean;
}

const MODEL_CONTEXT_WINDOWS: Record<string, number> = {
    'Qwen2.5-0.5B-Instruct-q4f16_1-MLC': 4096,
    'TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC': 2048,
    'Llama-3.2-1B-Instruct-q4f16_1-MLC': 4096,
};

const DEFAULT_CONTEXT_WINDOW = 4096;
export const BENCHMARK_MAX_TOKENS = 3000;

export function useWebLLM() {
    const engineRef = useRef<webllm.MLCEngine | null>(null);
    const [modelLoaded, setModelLoaded] = useState(false);
    const [status, setStatus] = useState('');
    const [capabilities, setCapabilities] = useState<DeviceCapabilities | null>(null);
    const [contextWindowSize, setContextWindowSize] = useState<number | null>(null);

    const checkDeviceCapabilities = async (): Promise<DeviceCapabilities | null> => {
        const hasWebGPU = !!navigator.gpu;

        if (!hasWebGPU) {
            setStatus('❌ WebGPU not supported.');
            return null;
        }

        const adapter = await navigator.gpu.requestAdapter({
            powerPreference: 'high-performance',
        });

        if (!adapter) {
            setStatus('❌ No WebGPU adapter found.');
            return null;
        }

        const memoryGB = (navigator as any).deviceMemory || 4;

        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
            navigator.userAgent
        );

        // UMA detection via platform + user agent — no adapterInfo needed
        const isUnifiedMemory =
            /Mac|iPhone|iPad/i.test(navigator.platform) ||
            /Apple Silicon|arm64/i.test(navigator.userAgent) ||
            (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

        const caps: DeviceCapabilities = {
            hasWebGPU,
            memoryGB,
            isMobile,
            isUnifiedMemory,
        };

        setCapabilities(caps);
        return caps;
    };

    const recommendModel = (caps: DeviceCapabilities): string => {
        if (caps.memoryGB >= 4) {
            return 'Llama-3.2-1B-Instruct-q4f16_1-MLC';
        }

        if (caps.memoryGB >= 2) {
            return 'TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC';
        }

        return 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC';
    };

    const estimateTokens = (text: string): number => {
        if (!text.trim()) return 0;
        return Math.ceil(text.trim().split(/\s+/).length * 1.3);
    };

    const computeMaxTokensFor90PctCtx = (prompt: string): number => {
        const ctx = contextWindowSize ?? DEFAULT_CONTEXT_WINDOW;
        const promptTokens = estimateTokens(prompt);
        const targetTotal = Math.floor(ctx * 0.9);
        let budget = targetTotal - promptTokens - 32;
        budget = Math.max(16, budget);
        budget = Math.min(budget, ctx - promptTokens - 16);
        return budget;
    };

    const loadModel = async (modelId?: string) => {
        try {
            setStatus('🔍 Checking WebGPU support…');
            const caps = await checkDeviceCapabilities();

            if (!caps || !caps.hasWebGPU) {
                setStatus('❌ WebGPU is required. Please use Chrome 113+ or Edge 113+.');
                return;
            }

            const selectedModel = modelId || recommendModel(caps);
            setStatus(`🔄 Initializing WebLLM… (${caps.isUnifiedMemory ? 'Unified Memory' : 'Discrete GPU'})`);
            setModelLoaded(false);

            const engine = new webllm.MLCEngine();
            engine.setInitProgressCallback((r) => setStatus(`📥 ${r.text}`));

            const ctx = MODEL_CONTEXT_WINDOWS[selectedModel] ?? DEFAULT_CONTEXT_WINDOW;

            // UMA devices get full context freely — no PCIe overhead
            // Discrete GPUs get sliding window to reduce per-token PCIe transfers
            const engineConfig = caps.isUnifiedMemory
                ? {
                    context_window_size: ctx,
                }
                : {
                    context_window_size: ctx,
                    sliding_window_size: Math.floor(ctx / 2),
                    attention_sink_size: 4,
                };

            await engine.reload(selectedModel, engineConfig);

            engineRef.current = engine;
            setContextWindowSize(ctx);
            setModelLoaded(true);
            setStatus(`✅ ${selectedModel} loaded! ctx=${ctx} | ${caps.isUnifiedMemory ? 'UMA mode' : 'Discrete GPU mode'}`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            setStatus(`❌ Error loading model: ${errorMessage}`);
            console.error('WebLLM loading error:', error);
        }
    };

    const generate = async (
        prompt: string,
        options?: { temperature?: number; max_tokens?: number }
    ) => {
        if (!engineRef.current) throw new Error('Model not loaded.');

        try {
            const maxTokens = options?.max_tokens ?? computeMaxTokensFor90PctCtx(prompt);

            const reply = await engineRef.current.chat.completions.create({
                messages: [{ role: 'user', content: prompt }],
                temperature: options?.temperature ?? 0.7,
                max_tokens: maxTokens,
                stream: false,
            });

            return reply.choices[0].message.content || '';
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Generation failed: ${errorMessage}`);
        }
    };

    const generateStream = async function* (
        prompt: string,
        options?: { temperature?: number; max_tokens?: number }
    ) {
        if (!engineRef.current) throw new Error('Model not loaded.');

        const maxTokens = options?.max_tokens ?? computeMaxTokensFor90PctCtx(prompt);

        const stream = await engineRef.current.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            temperature: options?.temperature ?? 0.7,
            max_tokens: maxTokens,
            stream: true,
        });

        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) yield content;
        }
    };

    const generateStreamBenchmark = async (
        prompt: string,
        maxTokens: number,
        temperature = 0
    ): Promise<{
        firstTokenLatencyMs: number;
        tokensPerSecond: number;
        tokenCount: number;
        requestedMaxTokens: number;
        text: string;
        isUnifiedMemory: boolean;
    }> => {
        if (!engineRef.current) throw new Error('Model not loaded.');

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

        const stream = await engineRef.current.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            temperature,
            max_tokens: safeMax,
            stream: true,
        });

        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (!content) continue;

            if (streamStart === null) {
                // First token — record TTFT and start the throughput clock.
                // Count this token (fix: was previously excluded from tokenCount).
                firstTokenLatencyMs = performance.now() - requestStart;
                streamStart = performance.now();
                tokenCount = 1;
            } else {
                tokenCount++;
            }
            text += content;
        }

        const streamDurationSec = streamStart !== null ? (performance.now() - streamStart) / 1000 : 0;
        const tokensPerSecond = streamDurationSec > 0 ? tokenCount / streamDurationSec : 0;

        return {
            firstTokenLatencyMs,
            tokensPerSecond,
            tokenCount,
            requestedMaxTokens: safeMax,
            text,
            isUnifiedMemory: capabilities?.isUnifiedMemory ?? false,
        };
    };

    const unloadModel = async () => {
        if (engineRef.current) {
            await engineRef.current.unload();
            engineRef.current = null;
            setModelLoaded(false);
            setContextWindowSize(null);
            setStatus('Model unloaded');
        }
    };

    return {
        engineRef,
        modelLoaded,
        status,
        capabilities,
        contextWindowSize,
        loadModel,
        generate,
        generateStream,
        generateStreamBenchmark,
        unloadModel,
        recommendModel,
        checkDeviceCapabilities,
    };
}