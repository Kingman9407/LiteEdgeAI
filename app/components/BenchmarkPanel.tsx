import { useState } from 'react';
import { BENCHMARKS } from '../data/benchmarkTests';
import { BenchmarkResult, BenchmarkMode } from '../types/types';

interface Props {
    runPrompt: (p: string) => Promise<string>;
    disabled: boolean;
}

export function BenchmarkPanel({ runPrompt, disabled }: Props) {
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

        for (let i = 0; i < tests.length; i++) {
            setCurrent(i + 1);
            const test = tests[i];

            const start = performance.now();
            const res = await runPrompt(test.prompt);
            const time = (performance.now() - start) / 1000;

            temp.push({
                name: test.name,
                prompt: test.prompt,
                response: res,
                tokensPerSecond: (res.split(/\s+/).length * 1.3) / time,
                totalTime: time,
            });

            setResults([...temp]);
        }

        setRunning(false);
    };

    return (
        <div className="space-y-6">
            {/* Mode Selector */}
            <div className="flex gap-3">
                <button
                    onClick={() => setMode('normal')}
                    className={`px-4 py-2 rounded ${mode === 'normal'
                            ? 'bg-blue-600'
                            : 'bg-white/10 hover:bg-white/20'
                        }`}
                >
                    Normal
                </button>
                <button
                    onClick={() => setMode('hard')}
                    className={`px-4 py-2 rounded ${mode === 'hard'
                            ? 'bg-red-600'
                            : 'bg-white/10 hover:bg-white/20'
                        }`}
                >
                    Hard (GPU Stress)
                </button>
            </div>

            {/* Run Button */}
            <button
                onClick={runBenchmark}
                disabled={disabled || running}
                className="w-full bg-blue-600 hover:bg-blue-700 py-3 rounded font-semibold disabled:opacity-50"
            >
                {running
                    ? `Running ${current}/${tests.length}`
                    : 'Run Benchmark'}
            </button>

            {/* Results table unchanged */}
            {results.length > 0 && (
                <div className="overflow-x-auto rounded-lg border border-white/10">
                    <table className="w-full text-sm">
                        <thead className="bg-white/10 text-left">
                            <tr>
                                <th className="p-3">Test</th>
                                <th className="p-3">Time (s)</th>
                                <th className="p-3">Tokens/sec</th>
                                <th className="p-3">Response</th>
                            </tr>
                        </thead>
                        <tbody>
                            {results.map((r, i) => (
                                <tr key={i} className="border-t border-white/10">
                                    <td className="p-3 font-medium">{r.name}</td>
                                    <td className="p-3">{r.totalTime.toFixed(2)}</td>
                                    <td className="p-3">
                                        {r.tokensPerSecond.toFixed(2)}
                                    </td>
                                    <td className="p-3 max-w-xl">
                                        <div className="line-clamp-3 opacity-90">
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
