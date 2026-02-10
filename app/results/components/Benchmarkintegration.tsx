import { useState, useEffect } from 'react';
import { BenchmarkDataProcessor } from './Benchmarkdataprocessor';
import { SystemAndBenchmarkCards } from './Systemandbenchmarkcards';
import type { PCSpecs, BenchmarkData, BenchmarkResults, GPUInfo } from './types';

// This component demonstrates how to connect the processor with the UI
export function BenchmarkIntegration() {
    const [systemSpecs, setSystemSpecs] = useState<PCSpecs | null>(null);
    const [benchmarkData, setBenchmarkData] = useState<BenchmarkData | undefined>(undefined);
    const [benchmarkResults, setBenchmarkResults] = useState<BenchmarkResults | undefined>(undefined);
    const [fullGPUInfo, setFullGPUInfo] = useState<GPUInfo | null>(null);
    const [isRunning, setIsRunning] = useState(false);

    // Function to collect system information
    const collectSystemInfo = () => {
        return {
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
        };
    };

    // Function to collect GPU information via WebGL
    const collectGPUInfo = () => {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext | null;

        if (!gl) {
            return {
                vendor: 'Unknown',
                renderer: 'Unknown',
            };
        }

        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        const extensions = gl.getSupportedExtensions() || [];
        const maxAnisotropyExt = gl.getExtension('EXT_texture_filter_anisotropic') ||
            gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic');

        return {
            vendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
            renderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
            version: gl.getParameter(gl.VERSION),
            shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
            maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
            maxViewportDims: gl.getParameter(gl.MAX_VIEWPORT_DIMS),
            maxAnisotropy: maxAnisotropyExt ? gl.getParameter(maxAnisotropyExt.MAX_TEXTURE_MAX_ANISOTROPY_EXT) : undefined,
            extensions,
            supportedExtensions: extensions,
        };
    };

    // Example benchmark run function
    const runBenchmark = async () => {
        setIsRunning(true);

        // Collect system info
        const systemInfo = collectSystemInfo();
        const gpuInfo = collectGPUInfo();

        // Parse initial data
        const specs = BenchmarkDataProcessor.parseSystemSpecs(systemInfo);
        const gpu = BenchmarkDataProcessor.parseGPUInfo(gpuInfo);
        const benchData = BenchmarkDataProcessor.parseBenchmarkData(gpuInfo, systemInfo);

        setSystemSpecs(specs);
        setFullGPUInfo(gpu);
        setBenchmarkData(benchData);

        // Simulate benchmark runs (replace with actual AI inference calls)
        const mockBenchmarkRuns = [
            {
                testName: 'Text Generation - Short',
                startTime: Date.now(),
                endTime: Date.now() + 2000,
                tokenCount: 100,
                wordCount: 75,
                modelUsed: 'Llama-3.2-1B',
                loadTimeMs: 1200,
            },
            {
                testName: 'Text Generation - Medium',
                startTime: Date.now(),
                endTime: Date.now() + 5000,
                tokenCount: 250,
                wordCount: 188,
                modelUsed: 'Llama-3.2-1B',
                loadTimeMs: 1200,
            },
            {
                testName: 'Text Generation - Long',
                startTime: Date.now(),
                endTime: Date.now() + 10000,
                tokenCount: 500,
                wordCount: 375,
                modelUsed: 'Llama-3.2-1B',
                loadTimeMs: 1200,
            },
        ];

        // Process complete session
        const completeSession = {
            systemInfo,
            gpuInfo,
            benchmarkRuns: mockBenchmarkRuns,
            timestamp: Date.now(),
        };

        const processed = BenchmarkDataProcessor.processCompleteSession(completeSession);

        // Update all states
        setSystemSpecs(processed.systemSpecs);
        setBenchmarkData(processed.benchmarkData);
        setBenchmarkResults(processed.benchmarkResults);
        setFullGPUInfo(processed.fullGPUInfo);

        setIsRunning(false);
    };

    // Auto-run on mount to collect system specs
    useEffect(() => {
        const systemInfo = collectSystemInfo();
        const gpuInfo = collectGPUInfo();

        const specs = BenchmarkDataProcessor.parseSystemSpecs(systemInfo);
        const gpu = BenchmarkDataProcessor.parseGPUInfo(gpuInfo);
        const benchData = BenchmarkDataProcessor.parseBenchmarkData(gpuInfo, systemInfo);

        setSystemSpecs(specs);
        setFullGPUInfo(gpu);
        setBenchmarkData(benchData);
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-emerald-900 to-gray-900 text-white p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="text-center space-y-4">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                        Browser AI Benchmark
                    </h1>
                    <p className="text-gray-400">
                        Test your system's performance for running AI models in the browser
                    </p>
                </div>

                {/* Run Benchmark Button */}
                <div className="flex justify-center">
                    <button
                        onClick={runBenchmark}
                        disabled={isRunning}
                        className={`
                            px-8 py-3 rounded-lg font-semibold text-lg
                            transition-all duration-200
                            ${isRunning
                                ? 'bg-gray-600 cursor-not-allowed'
                                : 'bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 shadow-lg hover:shadow-xl'
                            }
                        `}
                    >
                        {isRunning ? 'Running Benchmark...' : 'Run Benchmark'}
                    </button>
                </div>

                {/* System and Benchmark Cards */}
                <SystemAndBenchmarkCards
                    systemSpecs={systemSpecs}
                    benchmarkData={benchmarkData}
                    benchmarkResults={benchmarkResults}
                    fullGPUInfo={fullGPUInfo}
                />
            </div>
        </div>
    );
}