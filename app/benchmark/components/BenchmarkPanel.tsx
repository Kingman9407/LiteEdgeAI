import { useMemo, useState } from 'react';
import { BENCHMARKS } from '../data/benchmarkTests';
import { BenchmarkResult, BenchmarkMode } from '../types/types';

interface Props {
    runPrompt: (p: string) => Promise<string>;
    disabled: boolean;
    onBenchmarkComplete?: (results: {
        tokensPerSecond: number;
        loadTime: number;
        score: number;
        benchmarks: BenchmarkResult[];
    }) => void;
}

const BRAND_GREEN = '#4fbf8a';

export function BenchmarkPanel({ runPrompt, disabled, onBenchmarkComplete }: Props) {
    const [mode, setMode] = useState<BenchmarkMode>('normal');
    const [running, setRunning] = useState(false);
    const [results, setResults] = useState<BenchmarkResult[]>([]);
    const [current, setCurrent] = useState(0);

    const tests = BENCHMARKS[mode];

    const runBenchmark = async () => {
        setRunning(true);
        setResults([]);
        setCurrent(0);

        const temp: BenchmarkResult[] = [];
        const benchmarkStartTime = performance.now();

        for (let i = 0; i < tests.length; i++) {
            setCurrent(i + 1);
            const test = tests[i];

            const start = performance.now();
            const res = await runPrompt(test.prompt);
            const time = (performance.now() - start) / 1000;

            const words = res.trim().split(/\s+/).length;
            const chars = res.length;
            const tokens = Math.round(words * 1.3); // rough token estimate

            temp.push({
                name: test.name,
                prompt: test.prompt,
                response: res,
                totalTime: time,
                tokenCount: tokens,
                wordCount: words,
                charCount: chars,
                tokensPerSecond: tokens / time,
            });

            setResults([...temp]);
        }

        const totalLoadTime = (performance.now() - benchmarkStartTime) / 1000;

        // Calculate average tokens per second and pass to parent
        const totalTime = temp.reduce((a, b) => a + b.totalTime, 0);
        const totalTokens = temp.reduce((a, b) => a + b.tokenCount, 0);
        const avgTokensPerSec = totalTokens / totalTime;

        if (onBenchmarkComplete) {
            onBenchmarkComplete({
                tokensPerSecond: avgTokensPerSec,
                loadTime: totalLoadTime,
                score: Math.round(avgTokensPerSec * 10),
                benchmarks: temp,
            });
        }

        setRunning(false);
    };

    /* ---------- Summary stats ---------- */
    const summary = useMemo(() => {
        if (results.length === 0) return null;

        const totalTime = results.reduce((a, b) => a + b.totalTime, 0);
        const totalTokens = results.reduce((a, b) => a + b.tokenCount, 0);

        const fastest = [...results].sort((a, b) => a.totalTime - b.totalTime)[0];
        const slowest = [...results].sort((a, b) => b.totalTime - a.totalTime)[0];

        return {
            totalTime,
            avgTokensPerSec: totalTokens / totalTime,
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
                {running
                    ? `Running ${current}/${tests.length}`
                    : 'Run Benchmark'}
            </button>

            {/* Summary */}
            {summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Stat label="Total Time" value={`${summary.totalTime.toFixed(2)}s`} />
                    <Stat
                        label="Avg Tokens/sec"
                        value={summary.avgTokensPerSec.toFixed(1)}
                    />
                    <Stat label="Fastest Test" value={summary.fastest.name} />
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
                                <th className="p-3 text-[#b0b4bb] font-medium">Tokens</th>
                                <th className="p-3 text-[#b0b4bb] font-medium">Chars</th>
                                <th className="p-3 text-[#b0b4bb] font-medium">Response</th>
                            </tr>
                        </thead>
                        <tbody>
                            {results.map((r, i) => (
                                <tr key={i} className="border-t border-[#34363c] hover:bg-[#232428]/30 transition-colors">
                                    <td className="p-3 font-medium text-[#f2f3f5]">{r.name}</td>
                                    <td className="p-3 text-[#b0b4bb]">{r.totalTime.toFixed(2)}</td>
                                    <td className="p-3 text-[#4fbf8a]">
                                        {r.tokensPerSecond.toFixed(2)}
                                    </td>
                                    <td className="p-3 text-[#b0b4bb]">{r.tokenCount}</td>
                                    <td className="p-3 text-[#b0b4bb]">{r.charCount}</td>
                                    <td className="p-3 max-w-xl text-[#b0b4bb]">
                                        <div className="line-clamp-3">
                                            {r.response}
                                        </div>
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

/* ---------- Small stat card ---------- */
function Stat({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="rounded-lg bg-[#232428] border border-[#34363c] p-4">
            <div className="text-xs text-[#b0b4bb]">{label}</div>
            <div className="text-lg font-semibold text-[#f2f3f5]">{value}</div>
        </div>
    );
}