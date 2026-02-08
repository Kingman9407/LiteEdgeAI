'use client';

import { useState } from 'react';
import { useWebLLM } from '../hooks/useWebLLM';
import { ModelSelector } from './ModelSelector';
import { ChatPanel } from './ChatPanel';
import { BenchmarkPanel } from './BenchmarkPanel';

export default function WebLLMBenchmark() {
    const [tab, setTab] = useState<'chat' | 'benchmark'>('chat');
    const [model, setModel] = useState('Llama-3.2-1B-Instruct-q4f16_1-MLC');

    const { modelLoaded, status, loadModel, generate } = useWebLLM();

    return (
        <div className="min-h-screen bg-slate-900 text-white p-6">
            <div className="max-w-6xl mx-auto space-y-6">
                <h1 className="text-4xl font-bold text-center">WebLLM Benchmark Suite</h1>

                <ModelSelector
                    selectedModel={model}
                    setSelectedModel={setModel}
                    loadModel={() => loadModel(model)}
                    modelLoaded={modelLoaded}
                    status={status}
                />

                <div className="flex gap-2">
                    <button onClick={() => setTab('chat')} className="px-4 py-2 bg-white/10 rounded">
                        Chat
                    </button>
                    <button onClick={() => setTab('benchmark')} className="px-4 py-2 bg-white/10 rounded">
                        Benchmark
                    </button>
                </div>

                {tab === 'chat' && (
                    <ChatPanel disabled={!modelLoaded} onGenerate={generate} />
                )}

                {tab === 'benchmark' && (
                    <BenchmarkPanel disabled={!modelLoaded} runPrompt={generate} />
                )}
            </div>
        </div>
    );
}
