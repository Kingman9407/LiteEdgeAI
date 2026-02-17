'use client';

import { useRef, useState } from 'react';
import * as webllm from '@mlc-ai/web-llm';

interface DeviceCapabilities {
    hasWebGPU: boolean;
    memoryGB: number;
    isMobile: boolean;
}

// Fixed context window per model (not based on RAM)
const MODEL_CONTEXT_WINDOWS: Record<string, number> = {
    'TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC': 2048,
    'Llama-3.2-1B-Instruct-q4f16_1-MLC': 4096,
    'Llama-3.2-3B-Instruct-q4f16_1-MLC': 4096,
    'Phi-3-mini-4k-instruct-q4f16_1-MLC': 4096,
    'Qwen2.5-1.5B-Instruct-q4f16_1-MLC': 4096,
    'Mistral-7B-Instruct-v0.2-q4f16_1-MLC': 4096,
};

const DEFAULT_CONTEXT_WINDOW = 4096;

export function useWebLLM() {
    const engineRef = useRef<webllm.MLCEngine | null>(null);
    const [modelLoaded, setModelLoaded] = useState(false);
    const [status, setStatus] = useState('');
    const [capabilities, setCapabilities] = useState<DeviceCapabilities | null>(null);
    const [contextWindowSize, setContextWindowSize] = useState<number | null>(null);

    // -------- Device capability check (WebGPU only) --------
    const checkDeviceCapabilities = async (): Promise<DeviceCapabilities | null> => {
        const hasWebGPU = !!navigator.gpu;

        if (!hasWebGPU) {
            setStatus('❌ WebGPU not supported. This application requires WebGPU.');
            return null;
        }

        const memoryGB = (navigator as any).deviceMemory || 4;

        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
            navigator.userAgent
        );

        const caps: DeviceCapabilities = {
            hasWebGPU,
            memoryGB,
            isMobile,
        };

        setCapabilities(caps);
        return caps;
    };

    // -------- Model recommendation based on device --------
    const recommendModel = (caps: DeviceCapabilities): string => {
        if (caps.memoryGB >= 8 && !caps.isMobile) {
            return 'Llama-3.2-3B-Instruct-q4f16_1-MLC';
        }

        if (caps.memoryGB >= 4) {
            return 'Llama-3.2-1B-Instruct-q4f16_1-MLC';
        }

        return 'TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC';
    };

    // -------- Context / token helpers --------
    const estimateTokens = (text: string): number => {
        if (!text.trim()) return 0;
        return Math.ceil(text.trim().split(/\s+/).length * 1.3);
    };

    // Use up to ~90% of the context window for (prompt + completion)
    // FIX: Uses fixed contextWindowSize (set per model), NOT memoryGB
    const computeMaxTokensFor90PctCtx = (prompt: string): number => {
        // Use model-specific context window, not RAM-based fallback
        const ctx = contextWindowSize ?? DEFAULT_CONTEXT_WINDOW;

        const promptTokens = estimateTokens(prompt);

        // Target total tokens (prompt + completion) = 90% of ctx
        const targetTotal = Math.floor(ctx * 0.9);

        let budget = targetTotal - promptTokens;

        // Safety margin for tokenizer mismatch
        budget -= 32;

        // Clamp budget
        budget = Math.max(16, budget);
        budget = Math.min(budget, ctx - promptTokens - 16);

        return budget;
    };

    // -------- Load model --------
    const loadModel = async (modelId?: string) => {
        try {
            setStatus('🔍 Checking WebGPU support…');
            const caps = await checkDeviceCapabilities();

            if (!caps || !caps.hasWebGPU) {
                setStatus(
                    '❌ WebGPU is required. Please use a browser that supports WebGPU (Chrome 113+, Edge 113+).'
                );
                return;
            }

            const selectedModel = modelId || recommendModel(caps);

            setStatus(
                `🔄 Initializing WebLLM with WebGPU on ${caps.isMobile ? 'mobile' : 'desktop'} device…`
            );
            setModelLoaded(false);

            const engine = new webllm.MLCEngine();

            engine.setInitProgressCallback((r) => {
                setStatus(`📥 ${r.text}`);
            });

            // FIX: Use model-specific context window, not RAM-based
            const ctx = MODEL_CONTEXT_WINDOWS[selectedModel] ?? DEFAULT_CONTEXT_WINDOW;

            await engine.reload(selectedModel, {
                context_window_size: ctx,
            });

            engineRef.current = engine;
            setContextWindowSize(ctx);
            setModelLoaded(true);
            setStatus(`✅ Model loaded successfully with WebGPU! (${selectedModel}, ctx=${ctx})`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            setStatus(`❌ Error loading model: ${errorMessage}`);
            console.error('WebLLM loading error:', error);
        }
    };

    // -------- Non-streaming generation --------
    const generate = async (
        prompt: string,
        options?: {
            temperature?: number;
            max_tokens?: number;
        }
    ) => {
        if (!engineRef.current) {
            throw new Error('Model not loaded. Please call loadModel first.');
        }

        try {
            const maxTokens =
                options?.max_tokens ?? computeMaxTokensFor90PctCtx(prompt);

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

    // -------- Streaming generation --------
    const generateStream = async function* (
        prompt: string,
        options?: { temperature?: number; max_tokens?: number }
    ) {
        if (!engineRef.current) {
            throw new Error('Model not loaded. Please call loadModel first.');
        }

        const maxTokens =
            options?.max_tokens ?? computeMaxTokensFor90PctCtx(prompt);

        const stream = await engineRef.current.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            temperature: options?.temperature ?? 0.7,
            max_tokens: maxTokens,
            stream: true,
        });

        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
                yield content;
            }
        }
    };

    // -------- Unload model --------
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
        unloadModel,
        recommendModel,
        checkDeviceCapabilities,
    };
}