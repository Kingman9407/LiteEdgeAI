import { useMemo, useRef, useState } from 'react';
import { BENCHMARKS } from '../data/benchmarkTests';
import { BenchmarkResult, BenchmarkMode } from '../types/types';
import { BENCHMARK_MAX_TOKENS } from '../hooks/useWebLLM'; // [NEW] fixed token budget import

// [NEW] How many iterations to run per test (results averaged; first is warmup)
const ITERATIONS_PER_TEST = 3;

interface Props {
    // [NEW] runPromptBenchmark replaces runPrompt — takes prompt, returns streaming metrics
    runPromptBenchmark: (prompt: string) => Promise<{
        firstTokenLatencyMs: number;
        tokensPerSecond: number;
        tokenCount: number;
        text: string;
    }>;
    disabled: boolean;
    onBenchmarkComplete?: (results: {
        tokensPerSecond: number;
        firstTokenLatencyMs: number; // [NEW] reported separately
        totalBenchmarkTime: number;  // [RENAMED] was loadTime — now accurately named
        score: number;
        benchmarks: BenchmarkResult[];
    }) => void;
}

export function BenchmarkPanel({ runPromptBenchmark, disabled, onBenchmarkComplete }: Props) {
    const [mode, setMode] = useState<BenchmarkMode>('normal');
    const [running, setRunning] = useState(false);
    const [results, setResults] = useState<BenchmarkResult[]>([]);
    const [current, setCurrent] = useState(0);
    const [phase, setPhase] = useState(''); // [NEW] shows warmup/iteration status

    // [NEW] Ref to accumulate results without triggering React re-renders during streaming
    const resultsAccRef = useRef<BenchmarkResult[]>([]);

    const tests = BENCHMARKS[mode];

    const runBenchmark = async () => {
        setRunning(true);
        setResults([]);
        resultsAccRef.current = [];
        setCurrent(0);
        setPhase('');

        const benchmarkStartTime = performance.now();

        // [NEW] Warmup run — discard result to prime GPU/JIT before real measurements
        setPhase('warmup');
        await runPromptBenchmark(tests[0].prompt);

        const finalResults: BenchmarkResult[] = [];

        for (let i = 0; i < tests.length; i++) {
            setCurrent(i + 1);
            const test = tests[i];

            // [NEW] Multiple iterations per test — collect raw numbers first
            const iterTPS: number[] = [];
            const iterFTL: number[] = [];
            const iterTokens: number[] = [];
            let lastText = '';

            for (let iter = 0; iter < ITERATIONS_PER_TEST; iter++) {
                setPhase(`test ${i + 1}/${tests.length}, iter ${iter + 1}/${ITERATIONS_PER_TEST}`);

                // [NEW] Call streaming benchmark — timing happens inside useWebLLM, not here
                // This means React state updates here do NOT pollute the timing measurements
                const { firstTokenLatencyMs, tokensPerSecond, tokenCount, text } =
                    await runPromptBenchmark(test.prompt);

                iterTPS.push(tokensPerSecond);
                iterFTL.push(firstTokenLatencyMs);
                iterTokens.push(tokenCount);
                lastText = text;
            }

            // [NEW] Drop highest and lowest TPS if we have enough iterations, then average
            const avgTPS = dropAndAverage(iterTPS);
            const avgFTL = dropAndAverage(iterFTL);
            const avgTokens = Math.round(dropAndAverage(iterTokens));

            // totalTime approximated from avg tokens / avg tps for the table display
            const approxTime = avgTokens / (avgTPS || 1);

            const wallStart = Date.now(); // approximate wall timestamps
            const wallEnd = Date.now() + Math.round(approxTime * 1000);

            finalResults.push({
                name: test.name,
                prompt: test.prompt,
                response: lastText,
                totalTime: approxTime,
                tokenCount: avgTokens,
                wordCount: lastText.trim().split(/\s+/).length,
                charCount: lastText.length,
                tokensPerSecond: avgTPS,
                firstTokenLatencyMs: avgFTL, // [NEW] field on BenchmarkResult
                startTime: wallStart,
                endTime: wallEnd,
            });

            // [NEW] Batch state update only after each test completes (not mid-stream)
            // This prevents React render overhead from interfering with timing
            setResults([...finalResults]);
        }

        setPhase('');
        const totalBenchmarkTime = (performance.now() - benchmarkStartTime) / 1000;

        const totalTokens = finalResults.reduce((a, b) => a + b.tokenCount, 0);
        const totalTime = finalResults.reduce((a, b) => a + b.totalTime, 0);
        const avgTokensPerSec = totalTokens / totalTime;
        const avgFTL =
            finalResults.reduce((a, b) => a + (b.firstTokenLatencyMs ?? 0), 0) /
            finalResults.length;

        if (onBenchmarkComplete) {
            onBenchmarkComplete({
                tokensPerSecond: avgTokensPerSec,
                firstTokenLatencyMs: avgFTL,         // [NEW]
                totalBenchmarkTime,                   // [RENAMED from loadTime]
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

        const fastest = [...results].sort((a, b) => a.totalTime - b.totalTime)[0];
        const slowest = [...results].sort((a, b) => b.totalTime - a.totalTime)[0];

        return {
            totalTime,
            avgTokensPerSec: totalTokens / totalTime,
            avgFirstTokenLatencyMs: avgFTL, // [NEW]
            fastest,
            slowest,
            score: Math.round((totalTokens / totalTime) * 10),
        };
    }, [results]);

    return (
        <div className="space-y-4">
            {/* Mode Selector */}
            <div className="flex gap-2">
                <button
                    onClick={() => setMode('normal')}
                    className={`px-4 py-2 rounded-lg transition-all text-sm font-medium ${mode === 'normal'
                        ? 'bg-[#4fbf8a] text-white'
                        : 'bg-[#232428] text-[#b0b4bb] border border-[#34363c] hover:border-[#4fbf8a] hover:text-[#4fbf8a]'
                        }`}
                >
                    Normal
                </button>
                <button
                    onClick={() => setMode('hard')}
                    className={`px-4 py-2 rounded-lg transition-all text-sm font-medium ${mode === 'hard'
                        ? 'bg-[#4fbf8a] text-white'
                        : 'bg-[#232428] text-[#b0b4bb] border border-[#34363c] hover:border-[#4fbf8a] hover:text-[#4fbf8a]'
                        }`}
                >
                    Hard
                </button>
            </div>

            {/* Run Button */}
            <button
                onClick={runBenchmark}
                disabled={disabled || running}
                className="w-full bg-[#4fbf8a]/10 hover:bg-[#4fbf8a]/20 
                    border border-[#4fbf8a] text-[#f2f3f5]
                    py-3 rounded-lg font-medium transition-all
                    disabled:opacity-40 disabled:cursor-not-allowed
                    disabled:hover:bg-[#4fbf8a]/10"
            >
                {/* [NEW] shows warmup/iteration phase in button label */}
                {running
                    ? phase
                        ? `Running (${phase})`
                        : `Running ${current}/${tests.length}`
                    : 'Run Benchmark'}
            </button>

            {/* Summary */}
            {summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Stat label="Total Time" value={`${summary.totalTime.toFixed(2)}s`} />
                    <Stat label="Avg Tokens/sec" value={summary.avgTokensPerSec.toFixed(1)} />
                    {/* [NEW] First-token latency stat */}
                    <Stat
                        label="Avg First Token"
                        value={`${summary.avgFirstTokenLatencyMs.toFixed(0)}ms`}
                    />
                    <Stat label="Score" value={summary.score} />
                </div>
            )}

            {/* Results Table */}
            {results.length > 0 && (
                <div className="overflow-x-auto rounded-lg border border-[#34363c]">
                    <table className="w-full text-sm">
                        <thead className="bg-[#232428] text-left">
                            <tr>
                                <th className="p-3 text-[#b0b4bb] font-medium">Test</th>
                                <th className="p-3 text-[#b0b4bb] font-medium">Time (s)</th>
                                <th className="p-3 text-[#b0b4bb] font-medium">Tokens/sec</th>
                                {/* [NEW] First-token latency column */}
                                <th className="p-3 text-[#b0b4bb] font-medium">First Token (ms)</th>
                                <th className="p-3 text-[#b0b4bb] font-medium">Tokens</th>
                                <th className="p-3 text-[#b0b4bb] font-medium">Chars</th>
                                <th className="p-3 text-[#b0b4bb] font-medium">Response</th>
                            </tr>
                        </thead>
                        <tbody>
                            {results.map((r, i) => (
                                <tr
                                    key={i}
                                    className="border-t border-[#34363c] hover:bg-[#232428]/30 transition-colors"
                                >
                                    <td className="p-3 font-medium text-[#f2f3f5]">{r.name}</td>
                                    <td className="p-3 text-[#b0b4bb]">{r.totalTime.toFixed(2)}</td>
                                    <td className="p-3 text-[#4fbf8a]">{r.tokensPerSecond.toFixed(2)}</td>
                                    {/* [NEW] */}
                                    <td className="p-3 text-[#b0b4bb]">
                                        {r.firstTokenLatencyMs?.toFixed(0) ?? '—'}
                                    </td>
                                    <td className="p-3 text-[#b0b4bb]">{r.tokenCount}</td>
                                    <td className="p-3 text-[#b0b4bb]">{r.charCount}</td>
                                    <td className="p-3 max-w-xl text-[#b0b4bb]">
                                        <div className="line-clamp-3">{r.response}</div>
                                    </td>
                                </tr>
                            ))}
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

// [NEW] Drops the highest and lowest value from an array before averaging.
// Falls back to simple average when array has < 4 elements.
function dropAndAverage(values: number[]): number {
    if (values.length < 4) {
        return values.reduce((a, b) => a + b, 0) / values.length;
    }
    const sorted = [...values].sort((a, b) => a - b);
    const trimmed = sorted.slice(1, -1); // drop lowest and highest
    return trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
}