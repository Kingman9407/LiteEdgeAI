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
        try {
            setStatus('Initializing ONNX Web Worker…');
            setModelLoaded(false);
            setDownloadProgress(0);

            if (workerRef.current) {
                workerRef.current.terminate();
                workerRef.current = null;
            }

            // Create worker pointing to compiled static worker file
            const worker = new Worker('/edge-llm.worker.js', { type: 'module' });
            workerRef.current = worker;

            return new Promise<void>((resolve, reject) => {
                const handleMessage = (e: MessageEvent) => {
                    const { type, status: loadStatus, progress, error } = e.data;
                    
                    if (type === 'STATUS') {
                        if (loadStatus === 'downloading') {
                            setDownloadProgress(progress || 0);
                            const pct = progress ? ` (${Math.round(progress * 100)}%)` : '';
                            setStatus(`Downloading model${pct}`);
                        } else if (loadStatus === 'loading') {
                            setDownloadProgress(1);
                            setStatus(`Compiling WebAssembly session…`);
                        } else if (loadStatus === 'ready') {
                            setStatus(`Model ready — WASM active`);
                            setModelLoaded(true);
                            worker.removeEventListener('message', handleMessage);
                            resolve();
                        } else if (loadStatus === 'idle') {
                            setStatus('Idle');
                        }
                    } else if (type === 'ERROR') {
                        setStatus(`Error: ${error}`);
                        worker.removeEventListener('message', handleMessage);
                        reject(new Error(error));
                    }
                };

                worker.addEventListener('message', handleMessage);
                worker.postMessage({ type: 'LOAD', payload: { modelId } });
            });
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            setStatus(`Error: ${msg}`);
            console.error('EdgeLLM load error:', err);
        }
    };

    const unloadModel = async () => {
        if (workerRef.current) {
            workerRef.current.postMessage({ type: 'RESET' });
            workerRef.current.terminate();
            workerRef.current = null;
            setModelLoaded(false);
            setDownloadProgress(0);
            setStatus('Model unloaded');
        }
    };

    const generate = async (prompt: string): Promise<string> => {
        if (!workerRef.current) throw new Error('Model not loaded.');

        const reqId = nextReqId.current++;
        const worker = workerRef.current;

        return new Promise<string>((resolve, reject) => {
            const handleMessage = (e: MessageEvent) => {
                if (e.data.reqId === reqId) {
                    if (e.data.type === 'DONE') {
                        worker.removeEventListener('message', handleMessage);
                        resolve(e.data.text);
                    } else if (e.data.type === 'ERROR') {
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
