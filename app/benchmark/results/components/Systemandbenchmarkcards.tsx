// results/components/SystemAndBenchmarkCards.tsx
import type {
    PCSpecs,
    BenchmarkData,
    BenchmarkResults,
    GPUInfo
} from '../../types/types';

type SystemAndBenchmarkCardsProps = {
    systemSpecs?: PCSpecs | null;
    benchmarkData?: BenchmarkData;
    benchmarkResults?: BenchmarkResults;
    fullGPUInfo?: GPUInfo | null;
};

export function SystemAndBenchmarkCards({
    systemSpecs,
    benchmarkData,
    benchmarkResults,
    fullGPUInfo
}: SystemAndBenchmarkCardsProps) {

    const getTierColor = (tier?: string) => {
        switch (tier) {
            case 'High-End': return 'text-green-400';
            case 'Mid-Range': return 'text-yellow-400';
            case 'Low-End': return 'text-orange-400';
            case 'Integrated': return 'text-blue-400';
            default: return 'text-white';
        }
    };

    return (
        <div className="grid md:grid-cols-2 gap-6">

            {/* LEFT COLUMN: SYSTEM SPECS */}
            <div className="rounded-xl bg-black/80 backdrop-blur p-6
                border border-emerald-500/20
                shadow-[0_0_22px_rgba(16,185,129,0.15)]
                space-y-4">

                <h2 className="text-xl font-semibold text-emerald-400 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    System Specifications
                </h2>

                {systemSpecs && (
                    <div className="space-y-3">
                        <SpecItem label="CPU" value={`${systemSpecs.cpuCores} cores`} />
                        <SpecItem label="RAM"
                            value={systemSpecs.deviceMemory ? `${systemSpecs.deviceMemory} GB` : 'N/A'} />
                        <SpecItem label="Operating System" value={systemSpecs.os} />
                        <SpecItem label="Screen Resolution" value={systemSpecs.screen} />
                    </div>
                )}

                {benchmarkData && (
                    <div className="space-y-3 pt-2 border-t border-emerald-500/10">
                        {benchmarkData.normalizedGPU && (
                            <SpecItem label="GPU" value={benchmarkData.normalizedGPU} />
                        )}
                        {benchmarkData.gpuBrand && (
                            <SpecItem label="GPU Brand" value={benchmarkData.gpuBrand} />
                        )}
                        {fullGPUInfo?.predictedVRAM && (
                            <SpecItem label="Estimated VRAM" value={fullGPUInfo.predictedVRAM} />
                        )}
                        {benchmarkData.graphicsBackend && (
                            <SpecItem label="Graphics Backend" value={benchmarkData.graphicsBackend} />
                        )}
                        {benchmarkData.platformType && (
                            <SpecItem label="Platform" value={benchmarkData.platformType} />
                        )}
                    </div>
                )}

                {fullGPUInfo?.capabilities && fullGPUInfo.capabilities.length > 0 && (
                    <div className="space-y-3 pt-2 border-t border-emerald-500/10">
                        <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/10 p-3">
                            <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">
                                GPU Capabilities
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {fullGPUInfo.capabilities.slice(0, 6).map((cap, i) => (
                                    <span key={i}
                                        className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded">
                                        {cap}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {fullGPUInfo && (
                    <div className="space-y-3 pt-2 border-t border-emerald-500/10">
                        <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/10 p-3">
                            <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">
                                Technical Details
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                {fullGPUInfo.maxTextureSize != null && (
                                    <TechItem label="Max Texture Size" value={`${fullGPUInfo.maxTextureSize}px`} />
                                )}
                                {fullGPUInfo.maxViewportWidth != null && (
                                    <TechItem label="Max Viewport" value={`${fullGPUInfo.maxViewportWidth}px`} />
                                )}
                                {fullGPUInfo.maxAnisotropy != null && (
                                    <TechItem label="Max Anisotropy" value={`${fullGPUInfo.maxAnisotropy}x`} />
                                )}
                                {fullGPUInfo.extensions && (
                                    <TechItem label="Extensions" value={fullGPUInfo.extensions.length} />
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* RIGHT COLUMN: BENCHMARK RESULTS */}
            <div className="rounded-xl bg-black/80 backdrop-blur p-6
                border border-emerald-500/20
                shadow-[0_0_22px_rgba(16,185,129,0.15)]
                space-y-4">

                <h2 className="text-xl font-semibold text-emerald-400 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Benchmark Results
                </h2>

                {benchmarkData && (
                    <div className="space-y-3">
                        {benchmarkData.performanceScore != null && (
                            <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/10 p-3">
                                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                                    Performance Score
                                </div>
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
                                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                                    Performance Tier
                                </div>
                                <div className={`font-medium ${getTierColor(benchmarkData.performanceTier)}`}>
                                    {benchmarkData.performanceTier}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {benchmarkResults && (
                    <div className="space-y-3 pt-2 border-t border-emerald-500/10">
                        {benchmarkResults.modelName && (
                            <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/10 p-3">
                                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Model</div>
                                <div className="text-white font-medium text-sm">
                                    {benchmarkResults.modelName}
                                </div>
                            </div>
                        )}

                        {benchmarkResults.tokensPerSecond != null && benchmarkResults.tokensPerSecond > 0 && (
                            <SpecItem label="Tokens / Second"
                                value={benchmarkResults.tokensPerSecond.toFixed(2)} />
                        )}

                        {benchmarkResults.loadTime != null && benchmarkResults.loadTime > 0 && (
                            <SpecItem label="Load Time"
                                value={`${benchmarkResults.loadTime.toFixed(2)}s`} />
                        )}
                    </div>
                )}

                {benchmarkResults?.benchmarks && benchmarkResults.benchmarks.length > 0 && (
                    <div className="space-y-3 pt-2 border-t border-emerald-500/10">
                        <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/10 p-3">
                            <div className="text-xs text-gray-500 uppercase tracking-wide mb-3">
                                Individual Test Results
                            </div>
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {benchmarkResults.benchmarks.map((bench, i) => (
                                    <div key={i}
                                        className="rounded bg-black/30 border border-emerald-500/10 p-3">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-white font-medium text-sm">
                                                {bench.name}
                                            </span>
                                            <span className="text-emerald-400 text-xs">
                                                {bench.tokensPerSecond.toFixed(1)} tok/s
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 text-xs">
                                            <div>
                                                <div className="text-gray-500">Time</div>
                                                <div className="text-white font-mono">
                                                    {bench.totalTime.toFixed(2)}s
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-gray-500">Tokens</div>
                                                <div className="text-white font-mono">
                                                    {bench.tokenCount}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-gray-500">Words</div>
                                                <div className="text-white font-mono">
                                                    {bench.wordCount}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function SpecItem({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/10 p-3">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</div>
            <div className="text-white font-medium">{value}</div>
        </div>
    );
}

function TechItem({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="rounded bg-emerald-500/5 border border-emerald-500/10 p-2">
            <div className="text-gray-500 mb-1">{label}</div>
            <div className="text-white font-mono">{value}</div>
        </div>
    );
}