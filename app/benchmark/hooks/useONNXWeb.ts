'use client';

import { useEdgeLLM } from './useEdgeLLM';
import { useState, useEffect } from 'react';

const DEFAULT_CONTEXT_WINDOW = 4096;

export function useONNXWeb() {
    const edgeLLM = useEdgeLLM();
    const [contextWindowSize, setContextWindowSize] = useState<number | null>(null);

    // Sync contextWindowSize state when model loads/unloads
    useEffect(() => {
        if (edgeLLM.modelLoaded) {
            setContextWindowSize(DEFAULT_CONTEXT_WINDOW);
        } else {
            setContextWindowSize(null);
        }
    }, [edgeLLM.modelLoaded]);

    const checkDeviceCapabilities = async () => {
        const hasWebGPU = typeof navigator !== 'undefined' && !!navigator.gpu;
        return {
            hasWebGPU,
            memoryGB: (navigator as any).deviceMemory || 4,
            isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
            hasShaderF16: false,
        };
    };

    const recommendModel = () => 'onnx-community/SmolLM2-135M-Instruct';

    const generateStream = async function* (
        prompt: string,
        options?: { temperature?: number; max_tokens?: number }
    ) {
        const text = await edgeLLM.generate(prompt);
        yield text;
    };

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
        const requestStart = performance.now();
        const text = await edgeLLM.generate(prompt);
        const totalTimeMs = performance.now() - requestStart;
        
        // Estimate token count based on typical SmolLM2 subword ratio
        const tokenCount = Math.max(1, Math.ceil(text.length / 4));
        const tokensPerSecond = tokenCount / (totalTimeMs / 1000);

        return {
            firstTokenLatencyMs: totalTimeMs / 2, // approximation
            tokensPerSecond: tokensPerSecond,
            tokenCount: tokenCount,
            requestedMaxTokens: maxTokens,
            text: text,
            isUnifiedMemory: false,
        };
    };

    return {
        engineRef: edgeLLM.workerRef,
        modelLoaded: edgeLLM.modelLoaded,
        status: edgeLLM.status,
        capabilities: null,
        contextWindowSize,
        loadModel: (modelId?: string) => edgeLLM.loadModel(modelId),
        unloadModel: edgeLLM.unloadModel,
        generate: edgeLLM.generate,
        generateStream,
        generateStreamBenchmark,
        recommendModel,
        checkDeviceCapabilities,
    };
}
