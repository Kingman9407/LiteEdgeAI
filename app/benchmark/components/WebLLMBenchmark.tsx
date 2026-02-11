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

export default function WebLLMBenchmark() {
    const [model, setModel] = useState('Llama-3.2-1B-Instruct-q4f16_1-MLC');
    const [showGPU, setShowGPU] = useState(false);
    const [showSubmitPage, setShowSubmitPage] = useState(false);
    const [specs, setSpecs] = useState<PCSpecs | null>(null);

    const [benchmarkResults, setBenchmarkResults] = useState<{
        tokensPerSecond: number;
        loadTime: number;
        score: number;
        benchmarks: BenchmarkResult[];
    } | null>(null);

    const [rawBenchmarkRuns, setRawBenchmarkRuns] = useState<RawBenchmarkRun[]>([]);
    const [processedData, setProcessedData] = useState<ProcessedSession | null>(null);

    const { modelLoaded, status, loadModel, unloadModel, generate } = useWebLLM();

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

    const handleBenchmarkComplete = (results: {
        tokensPerSecond: number;
        loadTime: number;
        score: number;
        benchmarks: BenchmarkResult[];
    }) => {
        setBenchmarkResults(results);

        const rawRuns: RawBenchmarkRun[] = results.benchmarks.map(bench => ({
            testName: bench.name,
            startTime: Date.now() - (bench.totalTime * 1000),
            endTime: Date.now(),
            tokenCount: bench.tokenCount,
            wordCount: bench.wordCount,
            modelUsed: model,
            loadTimeMs: results.loadTime * 1000,
            prompt: bench.prompt,
            response: bench.response,
        }));

        setRawBenchmarkRuns(rawRuns);
    };

    const handleSubmitResults = () => {
        if (!gpuInfo) {
            console.error('GPU info not yet detected — waiting...');
            return;
        }

        if (rawBenchmarkRuns.length === 0) {
            console.error('No benchmark runs to submit');
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
                // Use unmasked values from hook detection
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
            // Pass the FULL pre-detected GPU info to avoid data loss
            detectedGPUInfo: gpuInfo,
        };

        const processed = BenchmarkDataProcessor.processCompleteSession(rawSession);
        setProcessedData(processed);

        console.log('=== Processed Session ===');
        console.log('System:', processed.systemSpecs);
        console.log('GPU:', processed.fullGPUInfo);
        console.log('Benchmark Data:', processed.benchmarkData);
        console.log('Results:', processed.benchmarkResults);

        setShowSubmitPage(true);
    };

    const handleActualSubmit = () => {
        if (!processedData) {
            console.error('No processed data available');
            return;
        }
        console.log('Submitting:', processedData);
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
        <div className="min-h-screen bg-black text-white p-6 pt-30">
            <div className="max-w-6xl mx-auto space-y-6">

                <h1 className="text-4xl font-bold text-center tracking-wide
                    drop-shadow-[0_0_14px_rgba(34,197,94,0.6)]">
                    WebLLM Benchmark Suite
                </h1>

                <div className="rounded-xl bg-black/80 backdrop-blur p-4
                    border border-emerald-500/20
                    shadow-[0_0_22px_rgba(16,185,129,0.15)]">
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
                        className="px-4 py-2 rounded-lg border transition
                            border-emerald-500/30 text-gray-300 
                            hover:bg-emerald-500/10 hover:border-emerald-400"
                    >
                        GPU Specs
                    </button>
                    {gpuInfo && (
                        <span className="text-xs text-gray-500">
                            ✓ {gpuInfo.unmaskedRenderer || gpuInfo.renderer || 'Detecting...'}
                        </span>
                    )}
                    {!gpuInfo && (
                        <span className="text-xs text-yellow-500 animate-pulse">
                            Detecting GPU...
                        </span>
                    )}
                </div>

                <div className="rounded-xl bg-black/80 p-4
                    border border-emerald-500/20
                    shadow-[0_0_22px_rgba(16,185,129,0.15)]">
                    <BenchmarkPanel
                        disabled={!modelLoaded}
                        runPrompt={generate}
                        onBenchmarkComplete={handleBenchmarkComplete}
                    />
                </div>

                <div className="flex justify-center">
                    <button
                        onClick={handleSubmitResults}
                        disabled={!modelLoaded || !gpuInfo || !benchmarkResults}
                        className="px-8 py-3 rounded-lg border transition
                            border-emerald-400 bg-emerald-500/10 text-white 
                            shadow-[0_0_12px_rgba(16,185,129,0.4)]
                            hover:bg-emerald-500/20
                            disabled:opacity-50 disabled:cursor-not-allowed
                            disabled:shadow-none font-medium"
                    >
                        Submit Results
                    </button>
                </div>

                {specs && (
                    <div className="rounded-xl bg-black/70 p-4 text-sm
                        border border-emerald-500/10 text-gray-400">
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