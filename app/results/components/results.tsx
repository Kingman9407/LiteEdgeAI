'use client';

import { useState } from 'react';

type PCSpecs = {
    cpuCores: number;
    deviceMemory?: number;
    os: string;
    screen: string;
};

type BenchmarkResults = {
    // Add your actual benchmark result fields here
    modelName?: string;
    tokensPerSecond?: number;
    loadTime?: number;
    // ... other benchmark metrics
};

// Import the GPUInfo type from the hook
type PrecisionFormat = {
    rangeMin: number;
    rangeMax: number;
    precision: number;
};

type GPUInfo = {
    // Basic Info
    renderer: string;
    vendor: string;
    unmaskedRenderer?: string;
    unmaskedVendor?: string;

    // API Support
    webgl: boolean;
    webgl2: boolean;
    webgpu: boolean;
    webglVersion: string;
    shadingLanguageVersion: string;

    // Texture Limits
    maxTextureSize: number;
    maxCubeMapSize: number;
    maxRenderbufferSize: number;
    maxTextureImageUnits: number;
    maxCombinedTextureImageUnits: number;
    maxVertexTextureImageUnits: number;
    maxAnisotropy: number;

    // Rendering Limits
    maxViewportWidth: number;
    maxViewportHeight: number;
    maxVertexAttribs: number;
    maxVertexUniformVectors: number;
    maxFragmentUniformVectors: number;
    maxVaryingVectors: number;
    maxDrawBuffers: number;
    maxColorAttachments: number;

    // Precision
    vertexShaderHighFloat: PrecisionFormat;
    vertexShaderMediumFloat: PrecisionFormat;
    vertexShaderLowFloat: PrecisionFormat;
    fragmentShaderHighFloat: PrecisionFormat;
    fragmentShaderMediumFloat: PrecisionFormat;
    fragmentShaderLowFloat: PrecisionFormat;

    // Extensions
    extensions: string[];

    // WebGPU
    webgpuAdapter?: {
        architecture?: string;
        device?: string;
        vendor?: string;
        backend?: string;
    };

    // Additional
    aliasedPointSizeRange?: [number, number];
    aliasedLineWidthRange?: [number, number];
    subpixelBits: number;
    samples: number;

    // Predictions
    predictedTier: 'High-End' | 'Mid-Range' | 'Low-End' | 'Integrated' | 'Unknown';
    predictedVRAM: string;
    performanceScore: number;
    capabilities: string[];
};

type SubmitResultsPageProps = {
    onSubmit: () => void;
    onSkip: () => void;
    benchmarkData?: {
        normalizedGPU?: string;
        gpuBrand?: string;
        performanceScore?: number;
        performanceTier?: string;
        graphicsBackend?: string;
        platformType?: string;
    };
    systemSpecs?: PCSpecs | null;
    benchmarkResults?: BenchmarkResults;
    fullGPUInfo?: GPUInfo | null;
};

export function SubmitResultsPage({
    onSubmit,
    onSkip,
    benchmarkData,
    systemSpecs,
    benchmarkResults,
    fullGPUInfo
}: SubmitResultsPageProps) {
    const [agreed, setAgreed] = useState(false);

    const handleSubmit = () => {
        if (agreed) {
            onSubmit();
        }
    };

    return (
        <div className="min-h-screen bg-black text-white p-6 flex items-center justify-center">
            <div className="max-w-4xl w-full space-y-6">

                {/* Header */}
                <div className="text-center space-y-3">
                    <h1 className="text-4xl font-bold tracking-wide
                        drop-shadow-[0_0_14px_rgba(34,197,94,0.6)]">
                        Submit Your Results
                    </h1>
                    <p className="text-gray-400 text-lg">
                        Help build a community benchmark database
                    </p>
                </div>

                {/* System Information & Results - Two Column Layout */}
                <div className="grid md:grid-cols-2 gap-6">

                    {/* Left Column: System Specs */}
                    <div className="rounded-xl bg-black/80 backdrop-blur p-6
                        border border-emerald-500/20
                        shadow-[0_0_22px_rgba(16,185,129,0.15)]
                        space-y-4">

                        <h2 className="text-xl font-semibold text-emerald-400 flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            System Specifications
                        </h2>

                        {/* CPU & RAM */}
                        {systemSpecs && (
                            <div className="space-y-3">
                                <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/10 p-3">
                                    <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">CPU</div>
                                    <div className="text-white font-medium">{systemSpecs.cpuCores} cores</div>
                                </div>

                                <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/10 p-3">
                                    <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">RAM</div>
                                    <div className="text-white font-medium">
                                        {systemSpecs.deviceMemory ? `${systemSpecs.deviceMemory} GB` : 'N/A'}
                                    </div>
                                </div>

                                <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/10 p-3">
                                    <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Operating System</div>
                                    <div className="text-white font-medium">{systemSpecs.os}</div>
                                </div>

                                <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/10 p-3">
                                    <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Screen Resolution</div>
                                    <div className="text-white font-medium">{systemSpecs.screen}</div>
                                </div>
                            </div>
                        )}

                        {/* GPU Info */}
                        {benchmarkData && (
                            <div className="space-y-3 pt-2 border-t border-emerald-500/10">
                                {benchmarkData.normalizedGPU && (
                                    <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/10 p-3">
                                        <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">GPU</div>
                                        <div className="text-white font-medium">{benchmarkData.normalizedGPU}</div>
                                    </div>
                                )}

                                {benchmarkData.graphicsBackend && (
                                    <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/10 p-3">
                                        <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Graphics Backend</div>
                                        <div className="text-white font-medium">{benchmarkData.graphicsBackend}</div>
                                    </div>
                                )}

                                {benchmarkData.platformType && (
                                    <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/10 p-3">
                                        <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Platform</div>
                                        <div className="text-white font-medium">{benchmarkData.platformType}</div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Additional GPU Capabilities */}
                        {fullGPUInfo && fullGPUInfo.capabilities && fullGPUInfo.capabilities.length > 0 && (
                            <div className="space-y-3 pt-2 border-t border-emerald-500/10">
                                <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/10 p-3">
                                    <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">GPU Capabilities</div>
                                    <div className="flex flex-wrap gap-2">
                                        {fullGPUInfo.capabilities.slice(0, 6).map((cap, i) => (
                                            <span key={i} className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded">
                                                {cap}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Benchmark Results */}
                    <div className="rounded-xl bg-black/80 backdrop-blur p-6
                        border border-emerald-500/20
                        shadow-[0_0_22px_rgba(16,185,129,0.15)]
                        space-y-4">

                        <h2 className="text-xl font-semibold text-emerald-400 flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            Benchmark Results
                        </h2>

                        {benchmarkData && (
                            <div className="space-y-3">
                                {benchmarkData.performanceScore !== undefined && (
                                    <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/10 p-3">
                                        <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Performance Score</div>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-3xl font-bold text-emerald-400">
                                                {benchmarkData.performanceScore}
                                            </span>
                                            <span className="text-gray-500">/100</span>
                                        </div>
                                    </div>
                                )}

                                {benchmarkData.performanceTier && (
                                    <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/10 p-3">
                                        <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Performance Tier</div>
                                        <div className={`font-medium ${benchmarkData.performanceTier === 'High-End' ? 'text-green-400' :
                                                benchmarkData.performanceTier === 'Mid-Range' ? 'text-yellow-400' :
                                                    benchmarkData.performanceTier === 'Low-End' ? 'text-orange-400' :
                                                        benchmarkData.performanceTier === 'Integrated' ? 'text-blue-400' :
                                                            'text-white'
                                            }`}>
                                            {benchmarkData.performanceTier}
                                        </div>
                                    </div>
                                )}

                                {benchmarkData.gpuBrand && (
                                    <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/10 p-3">
                                        <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">GPU Brand</div>
                                        <div className="text-white font-medium">{benchmarkData.gpuBrand}</div>
                                    </div>
                                )}

                                {fullGPUInfo?.predictedVRAM && (
                                    <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/10 p-3">
                                        <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Estimated VRAM</div>
                                        <div className="text-white font-medium">{fullGPUInfo.predictedVRAM}</div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Additional Benchmark Metrics */}
                        {benchmarkResults && (
                            <div className="space-y-3 pt-2 border-t border-emerald-500/10">
                                {benchmarkResults.modelName && (
                                    <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/10 p-3">
                                        <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Model</div>
                                        <div className="text-white font-medium text-sm">{benchmarkResults.modelName}</div>
                                    </div>
                                )}

                                {benchmarkResults.tokensPerSecond !== undefined && benchmarkResults.tokensPerSecond > 0 && (
                                    <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/10 p-3">
                                        <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Tokens/Second</div>
                                        <div className="text-white font-medium">{benchmarkResults.tokensPerSecond.toFixed(2)}</div>
                                    </div>
                                )}

                                {benchmarkResults.loadTime !== undefined && benchmarkResults.loadTime > 0 && (
                                    <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/10 p-3">
                                        <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Load Time</div>
                                        <div className="text-white font-medium">{benchmarkResults.loadTime.toFixed(2)}s</div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* GPU Technical Details */}
                        {fullGPUInfo && (
                            <div className="space-y-3 pt-2 border-t border-emerald-500/10">
                                <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Technical Details</div>

                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="rounded bg-emerald-500/5 border border-emerald-500/10 p-2">
                                        <div className="text-gray-500 mb-1">Max Texture Size</div>
                                        <div className="text-white font-mono">{fullGPUInfo.maxTextureSize}px</div>
                                    </div>

                                    <div className="rounded bg-emerald-500/5 border border-emerald-500/10 p-2">
                                        <div className="text-gray-500 mb-1">Max Viewport</div>
                                        <div className="text-white font-mono">{fullGPUInfo.maxViewportWidth}px</div>
                                    </div>

                                    <div className="rounded bg-emerald-500/5 border border-emerald-500/10 p-2">
                                        <div className="text-gray-500 mb-1">Max Anisotropy</div>
                                        <div className="text-white font-mono">{fullGPUInfo.maxAnisotropy}x</div>
                                    </div>

                                    <div className="rounded bg-emerald-500/5 border border-emerald-500/10 p-2">
                                        <div className="text-gray-500 mb-1">Extensions</div>
                                        <div className="text-white font-mono">{fullGPUInfo.extensions.length}</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Content Card - Privacy & Consent */}
                <div className="rounded-xl bg-black/80 backdrop-blur p-8
                    border border-emerald-500/20
                    shadow-[0_0_22px_rgba(16,185,129,0.15)]
                    space-y-6">

                    {/* What We Collect */}
                    <div className="space-y-4">
                        <h2 className="text-xl font-semibold text-emerald-400">
                            What data is collected?
                        </h2>

                        <div className="grid gap-3 text-sm text-gray-300">
                            <div className="flex items-start gap-2">
                                <span className="text-emerald-500 mt-1">•</span>
                                <span><strong className="text-white">Normalized GPU name</strong> (e.g., Apple M4, NVIDIA RTX 3060)</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <span className="text-emerald-500 mt-1">•</span>
                                <span><strong className="text-white">GPU brand</strong></span>
                            </div>
                            <div className="flex items-start gap-2">
                                <span className="text-emerald-500 mt-1">•</span>
                                <span><strong className="text-white">Performance score</strong> (0–100)</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <span className="text-emerald-500 mt-1">•</span>
                                <span><strong className="text-white">Performance tier</strong> (High-End, Mid-Range, Low-End, Integrated)</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <span className="text-emerald-500 mt-1">•</span>
                                <span><strong className="text-white">Graphics backend</strong> (WebGPU, WebGL2, or WebGL1)</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <span className="text-emerald-500 mt-1">•</span>
                                <span><strong className="text-white">Platform type</strong> (Desktop or Mobile)</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <span className="text-emerald-500 mt-1">•</span>
                                <span><strong className="text-white">GPU capabilities</strong> (WebGL extensions, texture limits, etc.)</span>
                            </div>
                        </div>
                    </div>

                    {/* Privacy Guarantee */}
                    <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-4 space-y-3">
                        <h3 className="text-lg font-semibold text-emerald-400 flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            Your privacy is protected
                        </h3>

                        <div className="text-sm text-gray-300 space-y-2">
                            <p>
                                All data is collected locally in your browser using standard WebGL/WebGPU APIs.
                            </p>
                            <p className="font-medium text-white">
                                We do NOT collect or store:
                            </p>
                            <div className="grid gap-1 pl-4">
                                <span>✗ Raw hardware identifiers</span>
                                <span>✗ Driver details</span>
                                <span>✗ IP addresses</span>
                                <span>✗ Cookies</span>
                                <span>✗ Account data</span>
                                <span>✗ Any personal information</span>
                            </div>
                        </div>
                    </div>

                    {/* Consent Checkbox */}
                    <label className="flex items-start gap-3 cursor-pointer group">
                        <input
                            type="checkbox"
                            checked={agreed}
                            onChange={(e) => setAgreed(e.target.checked)}
                            className="mt-1 w-5 h-5 rounded border-emerald-500/30 
                                bg-black/50 text-emerald-500 
                                focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-0
                                cursor-pointer"
                        />
                        <span className="text-sm text-gray-300 group-hover:text-white transition">
                            I agree to share anonymous GPU performance data for benchmarking and a public leaderboard as described above.
                        </span>
                    </label>

                    {/* Action Buttons */}
                    <div className="flex gap-4 pt-4">
                        <button
                            onClick={handleSubmit}
                            disabled={!agreed}
                            className="flex-1 px-6 py-3 rounded-lg border transition
                                border-emerald-400 bg-emerald-500/10 text-white 
                                shadow-[0_0_12px_rgba(16,185,129,0.4)]
                                hover:bg-emerald-500/20 hover:shadow-[0_0_18px_rgba(16,185,129,0.6)]
                                disabled:opacity-50 disabled:cursor-not-allowed
                                disabled:shadow-none disabled:hover:bg-emerald-500/10
                                font-medium"
                        >
                            Submit Results
                        </button>

                        <button
                            onClick={onSkip}
                            className="px-6 py-3 rounded-lg border transition
                                border-gray-600 bg-gray-800/30 text-gray-300
                                hover:bg-gray-700/30 hover:border-gray-500 hover:text-white
                                font-medium"
                        >
                            Skip
                        </button>
                    </div>
                </div>

                {/* Footer Note */}
                <p className="text-center text-sm text-gray-500">
                    You can choose to submit or skip at any time
                </p>
            </div>
        </div>
    );
}