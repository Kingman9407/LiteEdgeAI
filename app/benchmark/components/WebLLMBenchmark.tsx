'use client';

import { useEffect, useState } from 'react';
import { useWebLLM } from '../hooks/useWebLLM';
import { useGPUInfo } from '../hooks/useGPUInfo';
import { ModelSelector } from './ModelSelector';
import { BenchmarkPanel } from './BenchmarkPanel';
import { GPUInfoModal } from './GPUInfoModal';
import { SubmitResultsPage } from '../../results/components/results';

type PCSpecs = {
    cpuCores: number;
    deviceMemory?: number;
    os: string;
    screen: string;
};

export default function WebLLMBenchmark() {
    const [model, setModel] = useState(
        'Llama-3.2-1B-Instruct-q4f16_1-MLC'
    );

    const [showGPU, setShowGPU] = useState(false);
    const [showSubmitPage, setShowSubmitPage] = useState(false);
    const [specs, setSpecs] = useState<PCSpecs | null>(null);

    const {
        modelLoaded,
        status,
        loadModel,
        unloadModel,
        generate,
    } = useWebLLM();

    // Fetch GPU info on component mount
    const gpuInfo = useGPUInfo(true);

    useEffect(() => {
        setSpecs({
            cpuCores: navigator.hardwareConcurrency || 0,
            deviceMemory: (navigator as any).deviceMemory,
            os: navigator.platform,
            screen: `${window.screen.width} × ${window.screen.height}`,
        });
    }, []);

    const handleSubmitResults = () => {
        setShowSubmitPage(true);
    };

    const handleActualSubmit = () => {
        // TODO: Implement actual results submission logic
        console.log('Submitting benchmark results...');
        console.log('GPU Info:', gpuInfo);
        console.log('System Specs:', specs);
        // You can add your API submission logic here
        setShowSubmitPage(false);
        // Maybe show a success message
    };

    const handleSkip = () => {
        setShowSubmitPage(false);
    };

    // Helper function to determine platform type
    const getPlatformType = (): string => {
        const platform = navigator.platform.toLowerCase();
        if (platform.includes('win')) return 'Windows Desktop';
        if (platform.includes('mac')) return 'macOS Desktop';
        if (platform.includes('linux')) return 'Linux Desktop';
        if (platform.includes('iphone') || platform.includes('ipad')) return 'iOS Mobile';
        if (platform.includes('android')) return 'Android Mobile';
        return 'Desktop';
    };

    // Helper function to determine graphics backend
    const getGraphicsBackend = (): string => {
        if (!gpuInfo) return 'Unknown';
        if (gpuInfo.webgpu) return 'WebGPU';
        if (gpuInfo.webgl2) return 'WebGL 2.0';
        if (gpuInfo.webgl) return 'WebGL 1.0';
        return 'Unknown';
    };

    if (showSubmitPage) {
        return (
            <SubmitResultsPage
                onSubmit={handleActualSubmit}
                onSkip={handleSkip}
                benchmarkData={{
                    normalizedGPU: gpuInfo?.unmaskedRenderer || gpuInfo?.renderer || 'Unknown GPU',
                    performanceScore: gpuInfo?.performanceScore || 0,
                    performanceTier: gpuInfo?.predictedTier || 'Unknown',
                    graphicsBackend: getGraphicsBackend(),
                    gpuBrand: gpuInfo?.unmaskedVendor || gpuInfo?.vendor || 'Unknown',
                    platformType: getPlatformType(),
                }}
                systemSpecs={specs}
                benchmarkResults={{
                    modelName: model,
                    // Add your actual benchmark results here
                    tokensPerSecond: 0, // Replace with actual value from BenchmarkPanel
                    loadTime: 0, // Replace with actual value from BenchmarkPanel
                }}
            />
        );
    }

    return (
        <div className="min-h-screen bg-black text-white p-6 pt-30">
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
                        unloadModel={unloadModel}
                        modelLoaded={modelLoaded}
                        status={status}
                    />
                </div>

                {/* GPU Info Preview & Button */}
                <div className="flex items-center gap-3">

                    <button
                        onClick={() => setShowGPU(true)}
                        className="px-4 py-2 rounded-lg border transition
                            border-emerald-500/30 text-gray-300 
                            hover:bg-emerald-500/10 hover:border-emerald-400"
                    >
                        GPU Specs
                    </button>
                </div>

                {/* Benchmark Panel */}
                <div className="rounded-xl bg-black/80 p-4
                    border border-emerald-500/20
                    shadow-[0_0_22px_rgba(16,185,129,0.15)]">
                    <BenchmarkPanel
                        disabled={!modelLoaded}
                        runPrompt={generate}
                    />
                </div>

                {/* Submit Results Button */}
                <div className="flex justify-center">
                    <button
                        onClick={handleSubmitResults}
                        disabled={!modelLoaded || !gpuInfo}
                        className="px-8 py-3 rounded-lg border transition
                            border-emerald-400 bg-emerald-500/10 text-white 
                            shadow-[0_0_12px_rgba(16,185,129,0.4)]
                            hover:bg-emerald-500/20
                            disabled:opacity-50 disabled:cursor-not-allowed
                            disabled:shadow-none
                            font-medium"
                    >
                        Submit Results
                    </button>
                </div>

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