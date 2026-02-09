'use client';

import { useEffect, useState } from 'react';
import { useWebLLM } from '../hooks/useWebLLM';
import { ModelSelector } from './ModelSelector';
import { ChatPanel } from './ChatPanel';
import { BenchmarkPanel } from './BenchmarkPanel';
import { GPUInfoModal } from './GPUInfoModal';

type PCSpecs = {
    cpuCores: number;
    deviceMemory?: number;
    os: string;
    screen: string;
};

export default function WebLLMBenchmark() {
    const [tab, setTab] = useState<'chat' | 'benchmark'>('chat');
    const [model, setModel] = useState(
        'Llama-3.2-1B-Instruct-q4f16_1-MLC'
    );

    const [showGPU, setShowGPU] = useState(false);
    const [specs, setSpecs] = useState<PCSpecs | null>(null);

    const { modelLoaded, status, loadModel, generate } = useWebLLM();

    useEffect(() => {
        setSpecs({
            cpuCores: navigator.hardwareConcurrency || 0,
            deviceMemory: (navigator as any).deviceMemory,
            os: navigator.platform,
            screen: `${window.screen.width} × ${window.screen.height}`
        });
    }, []);

    return (
        <div className="min-h-screen bg-black text-white p-6">
            <div className="max-w-6xl mx-auto space-y-6">

                {/* Header */}
                <h1 className="text-4xl font-bold text-center tracking-wide
                    drop-shadow-[0_0_14px_rgba(34,197,94,0.6)]">
                    WebLLM Benchmark Suite
                </h1>

                {/* Model Selector */}
                <div className="rounded-xl bg-black/80 backdrop-blur p-4
                    border border-emerald-500/20
                    shadow-[0_0_22px_rgba(16,185,129,0.15)]">
                    <ModelSelector
                        selectedModel={model}
                        setSelectedModel={setModel}
                        loadModel={() => loadModel(model)}
                        modelLoaded={modelLoaded}
                        status={status}
                    />
                </div>

                {/* Tabs + GPU Button */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setTab('chat')}
                        className={`px-4 py-2 rounded-lg border transition
                            ${tab === 'chat'
                                ? 'border-emerald-400 bg-emerald-500/10 text-white shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                                : 'border-emerald-500/30 text-gray-300 hover:bg-emerald-500/10'
                            }`}
                    >
                        Chat
                    </button>

                    <button
                        onClick={() => setTab('benchmark')}
                        className={`px-4 py-2 rounded-lg border transition
                            ${tab === 'benchmark'
                                ? 'border-emerald-400 bg-emerald-500/10 text-white shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                                : 'border-emerald-500/30 text-gray-300 hover:bg-emerald-500/10'
                            }`}
                    >
                        Benchmark
                    </button>

                    <button
                        onClick={() => setShowGPU(true)}
                        className="ml-auto px-4 py-2 rounded-lg border transition
                            border-emerald-500/30 text-gray-300 
                            hover:bg-emerald-500/10 hover:border-emerald-400"
                    >
                        GPU Specs
                    </button>
                </div>

                {/* Panels */}
                {tab === 'chat' && (
                    <div className="rounded-xl bg-black/80 p-4
                        border border-emerald-500/20
                        shadow-[0_0_22px_rgba(16,185,129,0.15)]">
                        <ChatPanel
                            disabled={!modelLoaded}
                            onGenerate={generate}
                        />
                    </div>
                )}

                {tab === 'benchmark' && (
                    <div className="rounded-xl bg-black/80 p-4
                        border border-emerald-500/20
                        shadow-[0_0_22px_rgba(16,185,129,0.15)]">
                        <BenchmarkPanel
                            disabled={!modelLoaded}
                            runPrompt={generate}
                        />
                    </div>
                )}

                {/* Local System Specs */}
                {specs && (
                    <div className="rounded-xl bg-black/70 p-4 text-sm
                        border border-emerald-500/10 text-gray-400">
                        <div className="flex flex-wrap gap-4">
                            <span>CPU: {specs.cpuCores} cores</span>
                            <span>
                                RAM:{' '}
                                {specs.deviceMemory
                                    ? `${specs.deviceMemory} GB`
                                    : 'N/A'}
                            </span>
                            <span>OS: {specs.os}</span>
                            <span>Screen: {specs.screen}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* GPU POPUP */}
            <GPUInfoModal
                open={showGPU}
                onClose={() => setShowGPU(false)}
            />
        </div>
    );
}