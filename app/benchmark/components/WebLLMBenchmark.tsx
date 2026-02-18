// components/WebLLMBenchmark.tsx
'use client';

import { useEffect, useState } from 'react';
import { useWebLLM } from '../hooks/useWebLLM';
import { useGPUInfo } from '../hooks/useGPUInfo';
import { ModelSelector } from './ModelSelector';
import { BenchmarkPanel } from './BenchmarkPanel';
import { GPUInfoModal } from './GPUInfoModal';
import { SubmitResultsPage } from '../results/components/results';
import type {
    BenchmarkResult,
    PCSpecs,
    BenchmarkData,
    BenchmarkResults,
    GPUInfo
} from '../../benchmark/types/types';
import {
    BenchmarkDataProcessor,
    type ProcessedSession
} from '../results/components/Benchmarkdataprocessor';

interface RawBenchmarkRun {
    testName: string;
    startTime: number;
    endTime: number;
    tokenCount: number;
    wordCount: number;
    modelUsed?: string;
    loadTimeMs?: number;
    prompt?: string;
    response?: string;
}

const BRAND_GREEN = '#4fbf8a';

export default function WebLLMBenchmark() {
    const [model, setModel] = useState('Llama-3.2-1B-Instruct-q4f16_1-MLC');
    const [showGPU, setShowGPU] = useState(false);
    const [showSubmitPage, setShowSubmitPage] = useState(false);
    const [specs, setSpecs] = useState<PCSpecs | null>(null);

    // [UPDATED] state shape — loadTime renamed, firstTokenLatencyMs added
    const [benchmarkResults, setBenchmarkResults] = useState<{
        tokensPerSecond: number;
        firstTokenLatencyMs: number;
        totalBenchmarkTime: number;
        score: number;
        benchmarks: BenchmarkResult[];
    } | null>(null);

    const [rawBenchmarkRuns, setRawBenchmarkRuns] = useState<RawBenchmarkRun[]>([]);
    const [processedData, setProcessedData] = useState<ProcessedSession | null>(null);

    // [UPDATED] destructure generateStreamBenchmark instead of generate
    const { modelLoaded, status, loadModel, unloadModel, generateStreamBenchmark } = useWebLLM();

    // Always detect GPU — not just when modal opens
    const gpuInfo = useGPUInfo(true);

    useEffect(() => {
        setSpecs({
            cpuCores: navigator.hardwareConcurrency || 0,
            deviceMemory: (navigator as any).deviceMemory,
            os: navigator.platform,
            screen: `${window.screen.width} × ${window.screen.height}`,
        });
    }, []);

    // [UPDATED] handler now receives firstTokenLatencyMs and totalBenchmarkTime
    const handleBenchmarkComplete = (results: {
        tokensPerSecond: number;
        firstTokenLatencyMs: number;
        totalBenchmarkTime: number;
        score: number;
        benchmarks: BenchmarkResult[];
    }) => {
        setBenchmarkResults(results);

        const rawRuns: RawBenchmarkRun[] = results.benchmarks.map(bench => ({
            testName: bench.name,
            startTime: bench.startTime,
            endTime: bench.endTime,
            tokenCount: bench.tokenCount,
            wordCount: bench.wordCount,
            modelUsed: model,
            loadTimeMs: results.totalBenchmarkTime * 1000, // [RENAMED from results.loadTime]
            prompt: bench.prompt,
            response: bench.response,
        }));

        setRawBenchmarkRuns(rawRuns);
    };

    const handleSubmitResults = () => {
        if (!gpuInfo) {
            return;
        }

        if (rawBenchmarkRuns.length === 0) {
            return;
        }

        const rawSession = {
            systemInfo: {
                navigator: {
                    hardwareConcurrency: navigator.hardwareConcurrency,
                    deviceMemory: (navigator as any).deviceMemory,
                    platform: navigator.platform,
                    userAgent: navigator.userAgent,
                },
                screen: {
                    width: window.screen.width,
                    height: window.screen.height,
                },
            },
            gpuInfo: {
                vendor: gpuInfo.unmaskedVendor || gpuInfo.vendor,
                renderer: gpuInfo.unmaskedRenderer || gpuInfo.renderer,
                version: gpuInfo.webglVersion || (gpuInfo.webgl2 ? 'WebGL 2' : 'WebGL 1'),
                shadingLanguageVersion: gpuInfo.shadingLanguageVersion,
                maxTextureSize: gpuInfo.maxTextureSize,
                maxViewportDims: (gpuInfo.maxViewportWidth != null && gpuInfo.maxViewportHeight != null)
                    ? [gpuInfo.maxViewportWidth, gpuInfo.maxViewportHeight] as [number, number]
                    : undefined,
                maxAnisotropy: gpuInfo.maxAnisotropy,
                extensions: gpuInfo.extensions,
                supportedExtensions: gpuInfo.extensions,
            },
            benchmarkRuns: rawBenchmarkRuns,
            timestamp: Date.now(),
            detectedGPUInfo: gpuInfo,
        };

        const processed = BenchmarkDataProcessor.processCompleteSession(rawSession);
        setProcessedData(processed);

        setShowSubmitPage(true);
    };

    const handleActualSubmit = () => {
        if (!processedData) {
            return;
        }
        // TODO: fetch('/api/submit-benchmark', { method: 'POST', body: JSON.stringify(processedData) })
        setShowSubmitPage(false);
    };

    const handleSkip = () => setShowSubmitPage(false);

    if (showSubmitPage && processedData) {
        return (
            <SubmitResultsPage
                onSubmit={handleActualSubmit}
                onSkip={handleSkip}
                benchmarkData={processedData.benchmarkData}
                systemSpecs={processedData.systemSpecs}
                benchmarkResults={processedData.benchmarkResults}
                fullGPUInfo={processedData.fullGPUInfo}
                modelName={model}
            />
        );
    }

    return (
        <div className=" bg-[#0a0b0d] text-white p-6 pt-24">
            <div className="max-w-6xl mx-auto space-y-6">

                <h1 className="text-4xl font-bold text-center tracking-wide text-[#f2f3f5]"
                    style={{
                        textShadow: `0 0 20px ${BRAND_GREEN}40, 0 0 40px ${BRAND_GREEN}20`
                    }}>
                    WebLLM Benchmark
                </h1>

                <div className="text-center text-sm text-[#b0b4bb]">
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#18191c] border border-[#34363c]">
                        Best experienced on Chrome or browsers with WebGPU support
                    </span>
                </div>

                <div className="rounded-xl bg-[#18191c] backdrop-blur p-4
                    border border-[#34363c]
                    shadow-lg hover:shadow-xl transition-shadow">
                    <ModelSelector
                        selectedModel={model}
                        setSelectedModel={setModel}
                        loadModel={() => loadModel(model)}
                        unloadModel={unloadModel}
                        modelLoaded={modelLoaded}
                        status={status}
                    />
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowGPU(true)}
                        className="px-4 py-2 rounded-lg border transition-all
                            border-[#34363c] text-[#b0b4bb] bg-[#18191c]
                            hover:border-[#4fbf8a] hover:text-[#4fbf8a] 
                            hover:bg-[#4fbf8a]/5"
                    >
                        GPU Specs
                    </button>
                    {gpuInfo && (
                        <span className="text-xs text-[#b0b4bb]">
                            ✓ {gpuInfo.unmaskedRenderer || gpuInfo.renderer || 'Detecting...'}
                        </span>
                    )}
                    {!gpuInfo && (
                        <span className="text-xs text-[#4fbf8a] animate-pulse">
                            Detecting GPU...
                        </span>
                    )}
                </div>

                <div className="rounded-xl bg-[#18191c] p-4
                    border border-[#34363c]
                    shadow-lg hover:shadow-xl transition-shadow">
                    {/* [UPDATED] runPrompt → runPromptBenchmark, passing generateStreamBenchmark */}
                    <BenchmarkPanel
                        disabled={!modelLoaded}
                        runPromptBenchmark={generateStreamBenchmark}
                        onBenchmarkComplete={handleBenchmarkComplete}
                    />
                </div>

                <div className="flex justify-center">
                    <button
                        onClick={handleSubmitResults}
                        disabled={!modelLoaded || !gpuInfo || !benchmarkResults}
                        className="px-8 py-3 rounded-lg border transition-all font-medium
                            border-[#4fbf8a] bg-[#4fbf8a]/10 text-[#f2f3f5]
                            hover:bg-[#4fbf8a]/20 hover:shadow-lg
                            hover:shadow-[#4fbf8a]/20
                            disabled:opacity-40 disabled:cursor-not-allowed
                            disabled:hover:bg-[#4fbf8a]/10 disabled:hover:shadow-none"
                    >
                        Submit Results
                    </button>
                </div>

                {specs && (
                    <div className="rounded-xl bg-[#18191c] p-4 text-sm
                        border border-[#34363c] text-[#b0b4bb]">
                        <div className="flex flex-wrap gap-4">
                            <span>CPU: {specs.cpuCores} cores</span>
                            <span>RAM: {specs.deviceMemory ? `${specs.deviceMemory} GB` : 'N/A'}</span>
                            <span>OS: {specs.os}</span>
                            <span>Screen: {specs.screen}</span>
                        </div>
                    </div>
                )}
            </div>

            <GPUInfoModal open={showGPU} onClose={() => setShowGPU(false)} />
        </div>
    );
}