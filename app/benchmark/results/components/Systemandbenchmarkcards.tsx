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

/* ------------------ COLOR SYSTEM ------------------ */
const BRAND_GREEN = '#4fbf8a';

export function SystemAndBenchmarkCards({
    systemSpecs,
    benchmarkData,
    benchmarkResults,
    fullGPUInfo
}: SystemAndBenchmarkCardsProps) {

    const getTierColor = (tier?: string) => {
        switch (tier) {
            case 'High-End': return 'text-[#4fbf8a]';
            case 'Mid-Range': return 'text-yellow-400';
            case 'Low-End': return 'text-orange-400';
            case 'Integrated': return 'text-blue-400';
            default: return 'text-[#f2f3f5]';
        }
    };

    return (
        <div className="grid md:grid-cols-2 gap-6">

            {/* ================= LEFT: SYSTEM SPECS ================= */}
            <div
                className="rounded-xl p-6 space-y-4"
                style={{
                    backgroundColor: '#18191c',
                    border: `1px solid ${BRAND_GREEN}33`,
                }}
            >
                <h2 className="text-xl font-semibold flex items-center gap-2 text-[#4fbf8a]">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    System Specifications
                </h2>

                {systemSpecs && (
                    <div className="space-y-3">
                        <SpecItem label="CPU" value={`${systemSpecs.cpuCores} cores`} />
                        <SpecItem
                            label="RAM"
                            value={systemSpecs.deviceMemory ? `${systemSpecs.deviceMemory} GB` : 'N/A'}
                        />
                        <SpecItem label="Operating System" value={systemSpecs.os} />
                        <SpecItem label="Screen Resolution" value={systemSpecs.screen} />
                    </div>
                )}

                {benchmarkData && (
                    <div className="space-y-3 pt-3 border-t border-[#4fbf8a]/20">
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

                {fullGPUInfo?.capabilities?.length && (
                    <div className="space-y-3 pt-3 border-t border-[#4fbf8a]/20">
                        <div className="rounded-lg bg-[#4fbf8a]/10 border border-[#4fbf8a]/20 p-3">
                            <div className="text-xs text-[#7d818a] uppercase tracking-wide mb-2">
                                GPU Capabilities
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {fullGPUInfo.capabilities.slice(0, 6).map((cap, i) => (
                                    <span
                                        key={i}
                                        className="text-xs px-2 py-1 rounded bg-[#4fbf8a]/20 text-[#bfe7d6]"
                                    >
                                        {cap}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {fullGPUInfo && (
                    <div className="space-y-3 pt-3 border-t border-[#4fbf8a]/20">
                        <div className="rounded-lg bg-[#4fbf8a]/10 border border-[#4fbf8a]/20 p-3">
                            <div className="text-xs text-[#7d818a] uppercase tracking-wide mb-2">
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

            {/* ================= RIGHT: BENCHMARK RESULTS ================= */}
            <div
                className="rounded-xl p-6 space-y-4"
                style={{
                    backgroundColor: '#18191c',
                    border: `1px solid ${BRAND_GREEN}33`,
                }}
            >
                <h2 className="text-xl font-semibold flex items-center gap-2 text-[#4fbf8a]">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Benchmark Results
                </h2>

                {benchmarkData && (
                    <div className="space-y-3">
                        {benchmarkData.performanceScore != null && (
                            <div className="rounded-lg bg-[#4fbf8a]/10 border border-[#4fbf8a]/20 p-3">
                                <div className="text-xs text-[#7d818a] uppercase tracking-wide mb-1">
                                    Performance Score
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-bold text-[#4fbf8a]">
                                        {benchmarkData.performanceScore}
                                    </span>
                                    <span className="text-[#7d818a]">/100</span>
                                </div>
                            </div>
                        )}

                        {benchmarkData.performanceTier && (
                            <div className="rounded-lg bg-[#4fbf8a]/10 border border-[#4fbf8a]/20 p-3">
                                <div className="text-xs text-[#7d818a] uppercase tracking-wide mb-1">
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
                    <div className="space-y-3 pt-3 border-t border-[#4fbf8a]/20">
                        {benchmarkResults.modelName && (
                            <SpecItem label="Model" value={benchmarkResults.modelName} />
                        )}
                        {benchmarkResults.tokensPerSecond != null && (
                            <SpecItem
                                label="Tokens / Second"
                                value={benchmarkResults.tokensPerSecond.toFixed(2)}
                            />
                        )}
                        {benchmarkResults.loadTime != null && (
                            <SpecItem
                                label="Load Time"
                                value={`${benchmarkResults.loadTime.toFixed(2)}s`}
                            />
                        )}
                    </div>
                )}

                {benchmarkResults?.benchmarks?.length && (
                    <div className="space-y-3 pt-3 border-t border-[#4fbf8a]/20">
                        <div className="rounded-lg bg-[#4fbf8a]/10 border border-[#4fbf8a]/20 p-3">
                            <div className="text-xs text-[#7d818a] uppercase tracking-wide mb-3">
                                Individual Test Results
                            </div>
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {benchmarkResults.benchmarks.map((bench, i) => (
                                    <div
                                        key={i}
                                        className="rounded bg-[#232428] border border-[#34363c] p-3"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[#f2f3f5] font-medium text-sm">
                                                {bench.name}
                                            </span>
                                            <span className="text-[#4fbf8a] text-xs">
                                                {bench.tokensPerSecond.toFixed(1)} tok/s
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 text-xs">
                                            <MiniStat label="Time" value={`${bench.totalTime.toFixed(2)}s`} />
                                            <MiniStat label="Tokens" value={bench.tokenCount} />
                                            <MiniStat label="Words" value={bench.wordCount} />
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

/* ------------------ SUB COMPONENTS ------------------ */

function SpecItem({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="rounded-lg bg-[#4fbf8a]/10 border border-[#4fbf8a]/20 p-3">
            <div className="text-xs text-[#7d818a] uppercase tracking-wide mb-1">
                {label}
            </div>
            <div className="text-[#f2f3f5] font-medium">
                {value}
            </div>
        </div>
    );
}

function TechItem({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="rounded bg-[#4fbf8a]/10 border border-[#4fbf8a]/20 p-2">
            <div className="text-[#7d818a] mb-1">
                {label}
            </div>
            <div className="text-[#f2f3f5] font-mono">
                {value}
            </div>
        </div>
    );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
    return (
        <div>
            <div className="text-[#7d818a]">{label}</div>
            <div className="text-[#f2f3f5] font-mono">{value}</div>
        </div>
    );
}
