'use client';

import { useRef, useState } from 'react';
import * as webllm from '@mlc-ai/web-llm';

interface DeviceCapabilities {
    hasWebGPU: boolean;
    memoryGB: number;
    isMobile: boolean;
}

export function useWebLLM() {
    const engineRef = useRef<webllm.MLCEngine | null>(null);
    const [modelLoaded, setModelLoaded] = useState(false);
    const [status, setStatus] = useState('');
    const [capabilities, setCapabilities] = useState<DeviceCapabilities | null>(null);

    // Check device capabilities (WebGPU ONLY - NO FALLBACK)
    const checkDeviceCapabilities = async (): Promise<DeviceCapabilities | null> => {
        const hasWebGPU = !!navigator.gpu;

        // STRICT: Stop immediately if no WebGPU
        if (!hasWebGPU) {
            setStatus('❌ WebGPU not supported. This application requires WebGPU.');
            return null;
        }

        // Estimate device memory
        const memoryGB = (navigator as any).deviceMemory || 4;

        // Check if mobile device
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

    // Recommend appropriate model based on device (WebGPU only)
    const recommendModel = (caps: DeviceCapabilities): string => {
        // High-end devices
        if (caps.memoryGB >= 8 && !caps.isMobile) {
            return 'Llama-3.2-3B-Instruct-q4f16_1-MLC';
        }

        // Mid-range devices or mobile
        if (caps.memoryGB >= 4) {
            return 'Llama-3.2-1B-Instruct-q4f16_1-MLC';
        }

        // Low-end devices - smallest model
        return 'TinyLlama-1.1B-Chat-v0.4-q4f16_1-MLC';
    };

    const loadModel = async (modelId?: string) => {
        try {
            setStatus('🔍 Checking WebGPU support…');
            const caps = await checkDeviceCapabilities();

            // STRICT: Stop if no WebGPU - NO FALLBACK
            if (!caps || !caps.hasWebGPU) {
                setStatus('❌ WebGPU is required. Please use a browser that supports WebGPU (Chrome 113+, Edge 113+).');
                return;
            }

            // Use provided model or recommend one
            const selectedModel = modelId || recommendModel(caps);

            setStatus(`🔄 Initializing WebLLM with WebGPU on ${caps.isMobile ? 'mobile' : 'desktop'} device…`);
            setModelLoaded(false);

            const engine = new webllm.MLCEngine();

            engine.setInitProgressCallback((r) => {
                setStatus(`📥 ${r.text}`);
            });

            await engine.reload(selectedModel, {
                // Adjust context window based on device memory
                context_window_size: caps.memoryGB >= 8 ? 4096 : caps.memoryGB >= 4 ? 2048 : 1024,
            });

            engineRef.current = engine;
            setModelLoaded(true);
            setStatus(`✅ Model loaded successfully with WebGPU! (${selectedModel})`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            setStatus(`❌ Error loading model: ${errorMessage}`);
            console.error('WebLLM loading error:', error);
        }
    };

    const generate = async (prompt: string, options?: {
        temperature?: number;
        max_tokens?: number;
    }) => {
        if (!engineRef.current) {
            throw new Error('Model not loaded. Please call loadModel first.');
        }

        try {
            // FIX: use ?? so options.max_tokens is respected when passed,
            // and only falls back to memory-based heuristic when truly undefined.
            // The old code used || which treated max_tokens as a boolean condition,
            // causing the ternary to always fire and ignore the passed value.
            const maxTokens = options?.max_tokens ?? ((capabilities?.memoryGB || 4) >= 8 ? 512 : 256);

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
        if (!engineRef.current) {
            throw new Error('Model not loaded. Please call loadModel first.');
        }

        // FIX: same fix as generate() above — ?? instead of ||
        const maxTokens = options?.max_tokens ?? ((capabilities?.memoryGB || 4) >= 8 ? 512 : 256);

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

    const unloadModel = async () => {
        if (engineRef.current) {
            await engineRef.current.unload();
            engineRef.current = null;
            setModelLoaded(false);
            setStatus('Model unloaded');
        }
    };

    return {
        engineRef,
        modelLoaded,
        status,
        capabilities,
        loadModel,
        generate,
        generateStream,
        unloadModel,
        recommendModel,
        checkDeviceCapabilities,
    };
}