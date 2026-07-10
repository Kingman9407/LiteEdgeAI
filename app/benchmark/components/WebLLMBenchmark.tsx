'use client';

import { useEffect, useState } from 'react';
import { useInferisML }  from '../hooks/useInferisML';
import { useONNXWeb }    from '../hooks/useONNXWeb';
import { useGPUInfo }    from '../hooks/useGPUInfo';
import { ModelSelector, type ModelChoice } from './ModelSelector';
import { BenchmarkPanel }    from './BenchmarkPanel';
import { GPUInfoModal }      from './GPUInfoModal';
import { SubmitResultsPage } from '../results/components/results';
import type { BenchmarkResult, PCSpecs } from '../../benchmark/types/types';
import { BenchmarkDataProcessor, type ProcessedSession } from '../results/components/Benchmarkdataprocessor';

interface RawBenchmarkRun {
    testName:            string;
    startTime:           number;
    endTime:             number;
    tokenCount:          number;
    wordCount:           number;
    modelUsed?:          string;
    loadTimeMs?:         number;
    prompt?:             string;
    response?:           string;
}

const BRAND_GREEN = '#4fbf8a';

/** Detect mobile/tablet at runtime */
function detectMobile() {
    if (typeof navigator === 'undefined') return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export default function WebLLMBenchmark() {
    const [choice, setChoice]         = useState<ModelChoice>('inferis'); // default: inferis-ml
    const [isMobile, setIsMobile]     = useState(false);
    const [showGPU, setShowGPU]       = useState(false);
    const [showSubmitPage, setShowSubmitPage] = useState(false);
    const [specs, setSpecs]           = useState<PCSpecs | null>(null);
    const [currentDifficulty, setCurrentDifficulty] = useState<string>('normal');

    const [benchmarkResults, setBenchmarkResults] = useState<{
        tokensPerSecond:      number;
        firstTokenLatencyMs:  number;
        totalBenchmarkTime:   number;
        score:                number;
        benchmarks:           BenchmarkResult[];
    } | null>(null);

    const [rawBenchmarkRuns, setRawBenchmarkRuns] = useState<RawBenchmarkRun[]>([]);
    const [processedData,    setProcessedData]    = useState<ProcessedSession | null>(null);

    // Two hooks — Hornet (ONNX) and inferis-ml
    const onnxWeb   = useONNXWeb();
    const inferisML = useInferisML();

    // Active hook determined by user's card selection
    const active = choice === 'hornet' ? onnxWeb : inferisML;
    const { modelLoaded, status, loadModel, unloadModel, generateStreamBenchmark } = active;

    const gpuInfo = useGPUInfo(true);

    // Detect device on mount + force hornet → inferis if on desktop
    useEffect(() => {
        const mobile = detectMobile();
        setIsMobile(mobile);

        setSpecs({
            cpuCores:     navigator.hardwareConcurrency || 0,
            deviceMemory: (navigator as any).deviceMemory,
            os:           navigator.platform,
            screen:       `${window.screen.width} × ${window.screen.height}`,
        });

        // On mobile, default to hornet; on desktop, force inferis
        if (mobile) {
            setChoice('hornet');
        } else {
            setChoice('inferis');
        }
    }, []);

    // Track difficulty from chosen model
    useEffect(() => {
        setCurrentDifficulty(choice === 'hornet' ? 'hornet' : 'normal');
    }, [choice]);

    // When model choice changes and a model is loaded, unload before switching
    const handleChoiceChange = (newChoice: ModelChoice) => {
        if (modelLoaded) return; // prevent switching while loaded
        setChoice(newChoice);
    };

    const modelDisplayName = choice === 'hornet'
        ? 'Kingman9407/hornet'
        : 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC';

    const handleLoad = () => {
        if (choice === 'hornet') {
            onnxWeb.loadModel('Kingman9407/hornet');
        } else {
            inferisML.loadModel('Qwen2.5-0.5B-Instruct-q4f16_1-MLC');
        }
    };

    const handleBenchmarkComplete = (results: {
        tokensPerSecond:     number;
        firstTokenLatencyMs: number;
        totalBenchmarkTime:  number;
        score:               number;
        benchmarks:          BenchmarkResult[];
    }) => {
        setBenchmarkResults(results);

        const rawRuns: RawBenchmarkRun[] = results.benchmarks.map(bench => ({
            testName:   bench.name,
            startTime:  bench.startTime,
            endTime:    bench.endTime,
            tokenCount: bench.tokenCount,
            wordCount:  bench.wordCount,
            modelUsed:  modelDisplayName,
            loadTimeMs: results.totalBenchmarkTime * 1000,
            prompt:     bench.prompt,
            response:   bench.response,
            maxTokens:              bench.maxTokens,
            firstTokenLatencyMs:    bench.firstTokenLatencyMs,
        }));

        setRawBenchmarkRuns(rawRuns);
    };

    const handleSubmitResults = () => {
        if (!gpuInfo || rawBenchmarkRuns.length === 0) return;

        const rawSession = {
            systemInfo: {
                navigator: {
                    hardwareConcurrency: navigator.hardwareConcurrency,
                    deviceMemory:        (navigator as any).deviceMemory,
                    platform:            navigator.platform,
                    userAgent:           navigator.userAgent,
                },
                screen: {
                    width:  window.screen.width,
                    height: window.screen.height,
                },
            },
            gpuInfo: {
                vendor:                 gpuInfo.unmaskedVendor || gpuInfo.vendor,
                renderer:               gpuInfo.unmaskedRenderer || gpuInfo.renderer,
                version:                gpuInfo.webglVersion || (gpuInfo.webgl2 ? 'WebGL 2' : 'WebGL 1'),
                shadingLanguageVersion: gpuInfo.shadingLanguageVersion,
                maxTextureSize:         gpuInfo.maxTextureSize,
                maxViewportDims:
                    (gpuInfo.maxViewportWidth != null && gpuInfo.maxViewportHeight != null)
                        ? [gpuInfo.maxViewportWidth, gpuInfo.maxViewportHeight] as [number, number]
                        : undefined,
                maxAnisotropy:       gpuInfo.maxAnisotropy,
                extensions:          gpuInfo.extensions,
                supportedExtensions: gpuInfo.extensions,
            },
            benchmarkRuns: rawBenchmarkRuns,
            timestamp:     Date.now(),
            detectedGPUInfo: gpuInfo,
        };

        const processed = BenchmarkDataProcessor.processCompleteSession(rawSession);
        setProcessedData(processed);
        setShowSubmitPage(true);
    };

    const handleActualSubmit = () => { if (!processedData) return; setShowSubmitPage(false); };
    const handleSkip         = () => setShowSubmitPage(false);

    if (showSubmitPage && processedData) {
        return (
            <SubmitResultsPage
                {...processedData}
                onSubmit={handleActualSubmit}
                onSkip={handleSkip}
                firstTokenLatencyMs={benchmarkResults?.firstTokenLatencyMs ?? null}
                totalBenchmarkTime={benchmarkResults?.totalBenchmarkTime ?? null}
                modelName={modelDisplayName}
                difficulty={currentDifficulty}
            />
        );
    }

    return (
        <div className="bg-[#0a0b0d] text-white p-6 pt-24">
            <div className="max-w-6xl mx-auto space-y-6">

                <h1
                    className="text-4xl font-bold text-center tracking-wide text-[#f2f3f5]"
                    style={{ textShadow: `0 0 20px ${BRAND_GREEN}40, 0 0 40px ${BRAND_GREEN}20` }}
                >
                    WebLLM Benchmark
                </h1>

                <div className="text-center text-sm text-[#b0b4bb]">
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#18191c] border border-[#34363c]">
                        Best experienced on Chrome or browsers with WebGPU support
                    </span>
                </div>

                {/* ─── Model Selector ─── */}
                <div className="rounded-xl bg-[#18191c] backdrop-blur p-4 border border-[#34363c] shadow-lg hover:shadow-xl transition-shadow">
                    <ModelSelector
                        choice={choice}
                        setChoice={handleChoiceChange}
                        loadModel={handleLoad}
                        unloadModel={unloadModel}
                        modelLoaded={modelLoaded}
                        status={status}
                        isMobile={isMobile}
                    />
                </div>

                {/* ─── GPU info row ─── */}
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

                    {gpuInfo ? (
                        <span className="text-xs text-[#b0b4bb]">
                            ✓ {gpuInfo.unmaskedRenderer || gpuInfo.renderer}
                        </span>
                    ) : (
                        <span className="text-xs text-[#4fbf8a] animate-pulse">
                            Detecting GPU...
                        </span>
                    )}
                </div>

                {/* ─── Benchmark Panel ─── */}
                <div className="rounded-xl bg-[#18191c] p-4 border border-[#34363c] shadow-lg hover:shadow-xl transition-shadow">
                    <BenchmarkPanel
                        disabled={!modelLoaded}
                        runPromptBenchmark={generateStreamBenchmark}
                        onBenchmarkComplete={handleBenchmarkComplete}
                        difficulty={currentDifficulty}
                        onDifficultyChange={setCurrentDifficulty}
                    />
                </div>

                {/* ─── Submit button ─── */}
                <div className="flex justify-center">
                    <button
                        onClick={handleSubmitResults}
                        disabled={!modelLoaded || !gpuInfo || !benchmarkResults}
                        className="px-8 py-3 rounded-lg border transition-all font-medium
                            border-[#4fbf8a] bg-[#4fbf8a]/10 text-[#f2f3f5]
                            hover:bg-[#4fbf8a]/20 hover:shadow-lg
                            hover:shadow-[#4fbf8a]/20
                            disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        Submit Results
                    </button>
                </div>

                {/* ─── System specs ─── */}
                {specs && (
                    <div className="rounded-xl bg-[#18191c] p-4 text-sm border border-[#34363c] text-[#b0b4bb]">
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