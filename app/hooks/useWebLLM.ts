'use client';

import { useRef, useState } from 'react';
import * as webllm from '@mlc-ai/web-llm';

export function useWebLLM() {
    const engineRef = useRef<webllm.MLCEngine | null>(null);
    const [modelLoaded, setModelLoaded] = useState(false);
    const [status, setStatus] = useState('');

    const loadModel = async (modelId: string) => {
        if (!navigator.gpu) {
            setStatus('❌ WebGPU not supported');
            return;
        }

        setStatus('🔄 Initializing WebLLM…');
        setModelLoaded(false);

        const engine = new webllm.MLCEngine();
        engine.setInitProgressCallback((r) => {
            setStatus(`📥 ${r.text}`);
        });

        await engine.reload(modelId);
        engineRef.current = engine;
        setModelLoaded(true);
        setStatus('✅ Model loaded successfully!');
    };

    const generate = async (prompt: string) => {
        if (!engineRef.current) return '';

        const reply = await engineRef.current.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            max_tokens: 256,
        });

        return reply.choices[0].message.content || '';
    };

    return { engineRef, modelLoaded, status, loadModel, generate };
}
