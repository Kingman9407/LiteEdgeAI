'use client';

import { useRef, useState } from 'react';

const DEFAULT_CONTEXT_WINDOW = 4096;

export function useONNXWeb() {
    const generatorRef = useRef<any>(null);
    const [modelLoaded, setModelLoaded] = useState(false);
    const [status, setStatus] = useState('');
    const [contextWindowSize, setContextWindowSize] = useState<number | null>(null);

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

    const loadModel = async (modelId?: string) => {
        try {
            setStatus('🔧 Initializing ONNX Runtime Web via Transformers.js…');
            setModelLoaded(false);

            // Dynamic import to prevent Next.js SSR build errors
            const { pipeline, env } = await import('@xenova/transformers');

            // Force remote loading via Hugging Face CDN
            env.allowLocalModels = false;

            const selectedModel = modelId || 'onnx-community/SmolLM2-135M-Instruct';
            setStatus(`📥 Loading ${selectedModel} (ONNX Runtime Web)…`);

            const generator = await pipeline('text-generation', selectedModel, {
                progress_callback: (data: any) => {
                    if (data.status === 'downloading') {
                        const progress = data.progress ? ` (${Math.round(data.progress)}%)` : '';
                        setStatus(`📥 [ONNX] Downloading ${data.file.split('/').pop()}${progress}`);
                    } else if (data.status === 'done') {
                        setStatus(`📥 [ONNX] Loaded ${data.file.split('/').pop()}`);
                    } else if (data.status === 'ready') {
                        setStatus(`📥 [ONNX] Compiling model shaders…`);
                    }
                }
            });

            generatorRef.current = generator;
            setContextWindowSize(DEFAULT_CONTEXT_WINDOW);
            setModelLoaded(true);
            setStatus(`✅ [ONNX Runtime] ${selectedModel} ready — WebGPU/WASM active`);
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            setStatus(`❌ [ONNX Error] ${msg}`);
            console.error('ONNX Web load error:', err);
        }
    };

    const unloadModel = async () => {
        if (generatorRef.current) {
            generatorRef.current = null;
            setModelLoaded(false);
            setContextWindowSize(null);
            setStatus('Model unloaded');
        }
    };

    const generate = async (
        prompt: string,
        options?: { temperature?: number; max_tokens?: number }
    ): Promise<string> => {
        if (!generatorRef.current) throw new Error('Model not loaded.');

        const maxTokens = options?.max_tokens ?? 256;
        const temperature = options?.temperature ?? 0.7;

        const output = await generatorRef.current(prompt, {
            max_new_tokens: maxTokens,
            temperature: temperature,
            do_sample: temperature > 0,
        });

        const generatedText = output[0]?.generated_text || '';
        if (generatedText.startsWith(prompt)) {
            return generatedText.slice(prompt.length);
        }
        return generatedText;
    };

    const generateStream = async function* (
        prompt: string,
        options?: { temperature?: number; max_tokens?: number }
    ) {
        if (!generatorRef.current) throw new Error('Model not loaded.');

        const maxTokens = options?.max_tokens ?? 256;
        const temperature = options?.temperature ?? 0.7;

        let lastLength = 0;
        let finished = false;

        const queue: string[] = [];
        let resolveNext: (() => void) | null = null;

        const pushToken = (text: string) => {
            queue.push(text);
            if (resolveNext) {
                resolveNext();
                resolveNext = null;
            }
        };

        generatorRef.current(prompt, {
            max_new_tokens: maxTokens,
            temperature: temperature,
            do_sample: temperature > 0,
            callback_function: (beams: any) => {
                const tokenIds = beams[0].output_token_ids;
                const decoded = generatorRef.current.tokenizer.decode(tokenIds, { skip_special_tokens: true });
                
                const newText = decoded.slice(lastLength);
                lastLength = decoded.length;

                if (newText) {
                    pushToken(newText);
                }
            }
        }).then(() => {
            finished = true;
            if (resolveNext) {
                resolveNext();
            }
        }).catch((err: any) => {
            finished = true;
            if (resolveNext) {
                resolveNext();
            }
            console.error('Streaming generation error:', err);
        });

        while (queue.length > 0 || !finished) {
            if (queue.length === 0) {
                await new Promise<void>((resolve) => {
                    resolveNext = resolve;
                });
            }
            while (queue.length > 0) {
                yield queue.shift()!;
            }
        }
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
        if (!generatorRef.current) throw new Error('Model not loaded.');

        let firstTokenLatencyMs = 0;
        let tokenCount = 0;
        let text = '';
        const requestStart = performance.now();
        let streamStart: number | null = null;

        let lastLength = 0;
        await generatorRef.current(prompt, {
            max_new_tokens: maxTokens,
            temperature: temperature,
            do_sample: temperature > 0,
            callback_function: (beams: any) => {
                const tokenIds = beams[0].output_token_ids;
                const decoded = generatorRef.current.tokenizer.decode(tokenIds, { skip_special_tokens: true });
                
                const newText = decoded.slice(lastLength);
                lastLength = decoded.length;

                if (newText) {
                    if (streamStart === null) {
                        firstTokenLatencyMs = performance.now() - requestStart;
                        streamStart = performance.now();
                        tokenCount = 1;
                    } else {
                        tokenCount++;
                    }
                    text += newText;
                }
            }
        });

        const streamDurationSec = streamStart !== null ? (performance.now() - streamStart) / 1000 : 0;
        const tokensPerSecond = streamDurationSec > 0 ? tokenCount / streamDurationSec : 0;

        return {
            firstTokenLatencyMs,
            tokensPerSecond,
            tokenCount,
            requestedMaxTokens: maxTokens,
            text,
            isUnifiedMemory: false,
        };
    };

    return {
        engineRef: generatorRef,
        modelLoaded,
        status,
        capabilities: null,
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
