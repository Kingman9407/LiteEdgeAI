'use client';

import { useRef, useState } from 'react';

const DEFAULT_CONTEXT_WINDOW = 4096;

export function useEdgeLLM() {
    const workerRef = useRef<Worker | null>(null);
    const nextReqId = useRef(0);
    const [modelLoaded, setModelLoaded] = useState(false);
    const [status, setStatus] = useState('');
    const [downloadProgress, setDownloadProgress] = useState(0);

    const loadModel = async (modelId?: string) => {
        console.log(`[useEdgeLLM] 📣 loadModel() called — modelId: "${modelId ?? 'default'}"`);
        try {
            setStatus('Initializing ONNX Web Worker…');
            setModelLoaded(false);
            setDownloadProgress(0);

            if (workerRef.current) {
                console.log('[useEdgeLLM] ♻️  Terminating existing worker before creating a new one.');
                workerRef.current.terminate();
                workerRef.current = null;
            }

            // Create worker pointing to compiled static worker file
            console.log('[useEdgeLLM] 🔧 Spawning new Worker from /edge-llm.worker.js...');
            const worker = new Worker('/edge-llm.worker.js', { type: 'module' });
            workerRef.current = worker;
            console.log('[useEdgeLLM] ✅ Worker spawned successfully. Sending LOAD message...');

            worker.onerror = (e) => {
                console.error('[useEdgeLLM] 🔥 Worker onerror fired (worker failed to boot):', e.message, e);
            };

            return new Promise<void>((resolve, reject) => {
                const handleMessage = (e: MessageEvent) => {
                    const { type, status: loadStatus, progress, error } = e.data;
                    console.log(`[useEdgeLLM] 📨 Worker message received: type=${type}`, loadStatus ? `status=${loadStatus}` : '', progress != null ? `progress=${(progress * 100).toFixed(0)}%` : '', error ? `error=${error}` : '');
                    
                    if (type === 'STATUS') {
                        if (loadStatus === 'downloading') {
                            setDownloadProgress(progress || 0);
                            const pct = progress ? ` (${Math.round(progress * 100)}%)` : '';
                            setStatus(`Downloading model${pct}`);
                        } else if (loadStatus === 'loading') {
                            setDownloadProgress(1);
                            setStatus(`Compiling WebAssembly session…`);
                        } else if (loadStatus === 'ready') {
                            console.log('[useEdgeLLM] 🎉 Model is READY!');
                            setStatus(`Model ready — WASM active`);
                            setModelLoaded(true);
                            worker.removeEventListener('message', handleMessage);
                            resolve();
                        } else if (loadStatus === 'idle') {
                            setStatus('Idle');
                        }
                    } else if (type === 'ERROR') {
                        console.error('[useEdgeLLM] ❌ Worker reported ERROR:', error);
                        setStatus(`Error: ${error}`);
                        worker.removeEventListener('message', handleMessage);
                        reject(new Error(error));
                    }
                };

                worker.addEventListener('message', handleMessage);
                console.log(`[useEdgeLLM] 📤 Posting LOAD message to worker with modelId: "${modelId ?? 'default'}".`);
                worker.postMessage({ type: 'LOAD', payload: { modelId } });
            });
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error('[useEdgeLLM] 💥 loadModel() caught an unexpected error:', err);
            setStatus(`Error: ${msg}`);
            console.error('EdgeLLM load error:', err);
        }
    };

    const unloadModel = async () => {
        console.log('[useEdgeLLM] 🔴 unloadModel() called.');
        if (workerRef.current) {
            workerRef.current.postMessage({ type: 'RESET' });
            workerRef.current.terminate();
            workerRef.current = null;
            setModelLoaded(false);
            setDownloadProgress(0);
            setStatus('Model unloaded');
            console.log('[useEdgeLLM] ✅ Worker terminated and state reset.');
        } else {
            console.warn('[useEdgeLLM] ⚠️  unloadModel() called but no worker was running.');
        }
    };

    const generate = async (prompt: string): Promise<string> => {
        console.log(`[useEdgeLLM] 💬 generate() called. Prompt length: ${prompt.length} chars.`);
        if (!workerRef.current) {
            console.error('[useEdgeLLM] ❌ generate() called but worker is null — model not loaded!');
            throw new Error('Model not loaded.');
        }

        const reqId = nextReqId.current++;
        const worker = workerRef.current;
        console.log(`[useEdgeLLM] 📤 Posting GENERATE to worker (reqId: ${reqId})`);

        return new Promise<string>((resolve, reject) => {
            const handleMessage = (e: MessageEvent) => {
                if (e.data.reqId === reqId) {
                    if (e.data.type === 'DONE') {
                        console.log(`[useEdgeLLM] ✅ DONE received (reqId: ${reqId}). Output length: ${e.data.text?.length} chars.`);
                        worker.removeEventListener('message', handleMessage);
                        resolve(e.data.text);
                    } else if (e.data.type === 'ERROR') {
                        console.error(`[useEdgeLLM] ❌ ERROR received (reqId: ${reqId}):`, e.data.error);
                        worker.removeEventListener('message', handleMessage);
                        reject(new Error(e.data.error));
                    }
                }
            };
            worker.addEventListener('message', handleMessage);
            worker.postMessage({
                type: 'GENERATE',
                payload: { prompt, reqId }
            });
        });
    };

    return {
        workerRef,
        modelLoaded,
        status,
        downloadProgress,
        loadModel,
        unloadModel,
        generate,
    };
}
