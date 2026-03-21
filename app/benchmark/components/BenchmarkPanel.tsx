'use client'
// BenchmarkPanel.tsx
import { useMemo, useRef, useState } from 'react';
import { BENCHMARKS } from '../data/benchmarkTests';
import { BenchmarkResult, BenchmarkMode } from '../types/types';

const ITERATIONS_PER_TEST = 4;   // ≥4 so dropAndAverage can drop the worst outlier

interface Props {
    runPromptBenchmark: (prompt: string, maxTokens: number) => Promise<{
        firstTokenLatencyMs: number;
        tokensPerSecond: number;
        tokenCount: number;
        requestedMaxTokens: number;
        text: string;
    }>;
    disabled: boolean;
    onBenchmarkComplete?: (results: {
        tokensPerSecond: number;
        firstTokenLatencyMs: number;
        totalBenchmarkTime: number;
        score: number;
        benchmarks: BenchmarkResult[];
    }) => void;
    difficulty: string;
    onDifficultyChange: (d: string) => void;
}

export function BenchmarkPanel({ runPromptBenchmark, disabled, onBenchmarkComplete, difficulty, onDifficultyChange }: Props) {
    const mode = difficulty as BenchmarkMode;

    const [running, setRunning] = useState(false);
    const [results, setResults] = useState<BenchmarkResult[]>([]);
    const [current, setCurrent] = useState(0);
    const [phase, setPhase] = useState('');
    const resultsAccRef = useRef<BenchmarkResult[]>([]);

    const tests = BENCHMARKS[mode];

    const totalSuiteTokens = tests.reduce((sum, t) => sum + t.maxTokens, 0);

    const runBenchmark = async () => {
        setRunning(true);
        setResults([]);
        resultsAccRef.current = [];
        setCurrent(0);
        setPhase('');

        const benchmarkStartTime = performance.now();

        // Global warmup — prime the engine on the first test prompt
        setPhase('warmup');
        await runPromptBenchmark(tests[0].prompt, tests[0].maxTokens);

        const finalResults: BenchmarkResult[] = [];

        for (let i = 0; i < tests.length; i++) {
            setCurrent(i + 1);
            const test = tests[i];

            // Per-test warmup: primes the KV-cache for prompts that differ
            // significantly from the previous test (eliminates cold-cache bias
            // on tests 2..N which have no dedicated warmup otherwise).
            if (i > 0) {
                setPhase(`warmup test ${i + 1}/${tests.length} "${test.name}"`);
                await runPromptBenchmark(test.prompt, Math.min(test.maxTokens, 64));
            }

            const iterTPS: number[] = [];
            const iterFTL: number[] = [];
            const iterTokens: number[] = [];
            const iterTime: number[] = [];   // ← real wall-clock seconds per run
            const iterStart: number[] = [];  // ← real epoch ms start per run
            const iterEnd: number[] = [];    // ← real epoch ms end per run
            let lastText = '';

            for (let iter = 0; iter < ITERATIONS_PER_TEST; iter++) {
                setPhase(
                    `test ${i + 1}/${tests.length} "${test.name}" ` +
                    `(${test.maxTokens} max tokens) ` +
                    `iter ${iter + 1}/${ITERATIONS_PER_TEST}`
                );

                const wallStart = Date.now();
                const perfStart = performance.now();

                const { firstTokenLatencyMs, tokensPerSecond, tokenCount, text } =
                    await runPromptBenchmark(test.prompt, test.maxTokens);

                const wallEnd = Date.now();
                const elapsedSec = (performance.now() - perfStart) / 1000;

                iterTPS.push(tokensPerSecond);
                iterFTL.push(firstTokenLatencyMs);
                iterTokens.push(tokenCount);
                iterTime.push(elapsedSec);
                iterStart.push(wallStart);
                iterEnd.push(wallEnd);
                lastText = text;
            }

            const avgTPS = dropAndAverage(iterTPS);
            const avgFTL = dropAndAverage(iterFTL);
            const avgTokens = Math.round(dropAndAverage(iterTokens));
            // Use the real measured wall-clock time, NOT the circular tokens/tps estimate
            const avgTime = dropAndAverage(iterTime);
            // Representative timestamps: use the median iteration (index 1 after sort)
            const midIdx = Math.floor(iterStart.length / 2);
            const repStart = iterStart[midIdx];
            const repEnd = iterEnd[midIdx];

            finalResults.push({
                name: test.name,
                prompt: test.prompt,
                response: lastText,
                totalTime: avgTime,          // ← real wall-clock, not approximated
                tokenCount: avgTokens,
                maxTokens: test.maxTokens,
                wordCount: lastText.trim().split(/\s+/).length,
                charCount: lastText.length,
                tokensPerSecond: avgTPS,
                firstTokenLatencyMs: avgFTL,
                startTime: repStart,         // ← real epoch ms start
                endTime: repEnd,             // ← real epoch ms end
            });

            setResults([...finalResults]);
        }

        setPhase('');
        const totalBenchmarkTime = (performance.now() - benchmarkStartTime) / 1000;

        const totalTokens = finalResults.reduce((a, b) => a + b.tokenCount, 0);
        const totalTime = finalResults.reduce((a, b) => a + b.totalTime, 0);
        const avgTokensPerSec = totalTime > 0 ? totalTokens / totalTime : 0;
        const avgFTL =
            finalResults.reduce((a, b) => a + (b.firstTokenLatencyMs ?? 0), 0) /
            finalResults.length;

        if (onBenchmarkComplete) {
            onBenchmarkComplete({
                tokensPerSecond: avgTokensPerSec,
                firstTokenLatencyMs: avgFTL,
                totalBenchmarkTime,
                score: Math.round(avgTokensPerSec * 10),
                benchmarks: finalResults,
            });
        }

        resultsAccRef.current = finalResults;
        setRunning(false);
    };

    const summary = useMemo(() => {
        if (results.length === 0) return null;

        const totalTime = results.reduce((a, b) => a + b.totalTime, 0);
        const totalTokens = results.reduce((a, b) => a + b.tokenCount, 0);
        const avgFTL =
            results.reduce((a, b) => a + (b.firstTokenLatencyMs ?? 0), 0) / results.length;

        const fastest = [...results].sort((a, b) => b.tokensPerSecond - a.tokensPerSecond)[0];
        const slowest = [...results].sort((a, b) => a.tokensPerSecond - b.tokensPerSecond)[0];

        return {
            totalTime,
            totalTokens,
            avgTokensPerSec: totalTokens / totalTime,
            avgFirstTokenLatencyMs: avgFTL,
            fastest,
            slowest,
            score: Math.round((totalTokens / totalTime) * 10),
        };
    }, [results]);

    return (
        <div className="space-y-4">
            {/* Mode Selector */}
            <div className="flex gap-2 flex-wrap">
                {(['normal', 'hard', 'extreme'] as BenchmarkMode[]).map((m) => (
                    <button
                        key={m}
                        onClick={() => onDifficultyChange(m)}
                        disabled={running}
                        className={`px-4 py-2 rounded-lg transition-all text-sm font-medium capitalize ${mode === m
                            ? m === 'extreme'
                                ? 'bg-red-500 text-white'
                                : 'bg-[#4fbf8a] text-white'
                            : 'bg-[#232428] text-[#b0b4bb] border border-[#34363c] hover:border-[#4fbf8a] hover:text-[#4fbf8a]'
                            }`}
                    >
                        {m}
                    </button>
                ))}
            </div>

            {/* Suite Info */}
            <div className="text-xs text-[#b0b4bb] flex gap-4">
                <span>{tests.length} tests</span>
                <span>Up to {totalSuiteTokens.toLocaleString()} total tokens</span>
                <span>{ITERATIONS_PER_TEST} iterations each</span>
                {mode === 'extreme' && (
                    <span className="text-red-400 font-medium">
                        ⚠️ May crash on low-memory devices
                    </span>
                )}
            </div>

            {/* Test Preview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {tests.map((test, i) => (
                    <div
                        key={i}
                        className="rounded-lg bg-[#232428] border border-[#34363c] p-3"
                    >
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium text-[#f2f3f5]">
                                {test.name}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${test.maxTokens >= 2048
                                ? 'bg-red-500/20 text-red-400'
                                : test.maxTokens >= 1024
                                    ? 'bg-yellow-500/20 text-yellow-400'
                                    : 'bg-[#4fbf8a]/20 text-[#4fbf8a]'
                                }`}>
                                {test.maxTokens} tokens
                            </span>
                        </div>
                        <div className="text-xs text-[#b0b4bb]">{test.description}</div>
                    </div>
                ))}
            </div>

            {/* Run Button */}
            <button
                onClick={runBenchmark}
                disabled={disabled || running}
                className={`w-full py-3 rounded-lg font-medium transition-all
                    disabled:opacity-40 disabled:cursor-not-allowed
                    ${mode === 'extreme'
                        ? 'bg-red-500/10 hover:bg-red-500/20 border border-red-500 text-[#f2f3f5] disabled:hover:bg-red-500/10'
                        : 'bg-[#4fbf8a]/10 hover:bg-[#4fbf8a]/20 border border-[#4fbf8a] text-[#f2f3f5] disabled:hover:bg-[#4fbf8a]/10'
                    }`}
            >
                {running
                    ? phase
                        ? `Running (${phase})`
                        : `Running ${current}/${tests.length}`
                    : mode === 'extreme'
                        ? '🔥 Run Extreme Benchmark'
                        : 'Run Benchmark'}
            </button>

            {/* Summary */}
            {summary && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <Stat label="Total Time" value={`${summary.totalTime.toFixed(2)}s`} />
                    <Stat label="Total Tokens" value={summary.totalTokens.toLocaleString()} />
                    <Stat label="Avg Tokens/sec" value={summary.avgTokensPerSec.toFixed(1)} />
                    <Stat
                        label="Avg First Token"
                        value={`${summary.avgFirstTokenLatencyMs.toFixed(0)}ms`}
                    />
                    <Stat label="Score" value={summary.score} />
                </div>
            )}

            {/* Fastest / Slowest */}
            {summary && (
                <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-[#232428] border border-[#34363c] p-3">
                        <div className="text-xs text-[#4fbf8a]">🏆 Fastest</div>
                        <div className="text-sm font-medium text-[#f2f3f5]">
                            {summary.fastest.name}
                        </div>
                        <div className="text-xs text-[#b0b4bb]">
                            {summary.fastest.tokensPerSecond.toFixed(1)} tok/s
                            ({summary.fastest.maxTokens} max)
                        </div>
                    </div>
                    <div className="rounded-lg bg-[#232428] border border-[#34363c] p-3">
                        <div className="text-xs text-red-400">🐢 Slowest</div>
                        <div className="text-sm font-medium text-[#f2f3f5]">
                            {summary.slowest.name}
                        </div>
                        <div className="text-xs text-[#b0b4bb]">
                            {summary.slowest.tokensPerSecond.toFixed(1)} tok/s
                            ({summary.slowest.maxTokens} max)
                        </div>
                    </div>
                </div>
            )}

            {/* Results Table */}
            {results.length > 0 && (
                <div className="overflow-x-auto rounded-lg border border-[#34363c]">
                    <table className="w-full text-sm">
                        <thead className="bg-[#232428] text-left">
                            <tr>
                                <th className="p-3 text-[#b0b4bb] font-medium">Test</th>
                                <th className="p-3 text-[#b0b4bb] font-medium">Max</th>
                                <th className="p-3 text-[#b0b4bb] font-medium">Generated</th>
                                <th className="p-3 text-[#b0b4bb] font-medium">Time (s)</th>
                                <th className="p-3 text-[#b0b4bb] font-medium">Tok/s</th>
                                <th className="p-3 text-[#b0b4bb] font-medium">FTL (ms)</th>
                                <th className="p-3 text-[#b0b4bb] font-medium">Utilization</th>
                                <th className="p-3 text-[#b0b4bb] font-medium">Response</th>
                            </tr>
                        </thead>
                        <tbody>
                            {results.map((r, i) => {
                                const utilization = (r.tokenCount / (r.maxTokens ?? 0)) * 100;
                                return (
                                    <tr
                                        key={i}
                                        className="border-t border-[#34363c] hover:bg-[#232428]/30 transition-colors"
                                    >
                                        <td className="p-3 font-medium text-[#f2f3f5]">{r.name}</td>
                                        <td className="p-3 text-[#b0b4bb]">{r.maxTokens}</td>
                                        <td className="p-3 text-[#b0b4bb]">{r.tokenCount}</td>
                                        <td className="p-3 text-[#b0b4bb]">{r.totalTime.toFixed(2)}</td>
                                        <td className="p-3 text-[#4fbf8a] font-medium">{r.tokensPerSecond.toFixed(1)}</td>
                                        <td className="p-3 text-[#b0b4bb]">{r.firstTokenLatencyMs?.toFixed(0)}</td>
                                        <td className="p-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-16 h-2 bg-[#34363c] rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${utilization > 90
                                                            ? 'bg-[#4fbf8a]'
                                                            : utilization > 50
                                                                ? 'bg-yellow-400'
                                                                : 'bg-red-400'
                                                            }`}
                                                        style={{ width: `${Math.min(utilization, 100)}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs text-[#b0b4bb]">
                                                    {utilization.toFixed(0)}%
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-3 max-w-xs text-[#b0b4bb]">
                                            <div className="line-clamp-2 text-xs">{r.response}</div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

function Stat({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="rounded-lg bg-[#232428] border border-[#34363c] p-4">
            <div className="text-xs text-[#b0b4bb]">{label}</div>
            <div className="text-lg font-semibold text-[#f2f3f5]">{value}</div>
        </div>
    );
}

function dropAndAverage(values: number[]): number {
    if (values.length < 4) {
        return values.reduce((a, b) => a + b, 0) / values.length;
    }
    const sorted = [...values].sort((a, b) => a - b);
    const trimmed = sorted.slice(1, -1);
    return trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
}