"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../benchmark/services/supabase";

type GPURanking = {
    model_name: string;
    gpu_name: string;
    gpu_brand: string;
    normalized_gpu_name: string;
    performance_score: number;
    tokens_per_second: number;
    avg_benchmark_tps: number;
    first_token_latency_ms: number | null;
    total_benchmark_time: number | null;
    difficulty: string | null; // [ADDED]
};

const DIFFICULTY_COLORS: Record<string, string> = {
    easy: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
    medium: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
    hard: "bg-orange-500/20 text-orange-400 border border-orange-500/30",
    extreme: "bg-red-500/20 text-red-400 border border-red-500/30",
};

function DifficultyBadge({ difficulty }: { difficulty: string | null }) {
    if (!difficulty) return <span className="text-[#9ca0a8]">N/A</span>;
    const label = difficulty.charAt(0).toUpperCase() + difficulty.slice(1).toLowerCase();
    const cls = DIFFICULTY_COLORS[difficulty.toLowerCase()] ?? "bg-[#34363c] text-[#b0b4bb]";
    return (
        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${cls}`}>
            {label}
        </span>
    );
}

export default function RankingsPage() {
    const [data, setData] = useState<GPURanking[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [modelFilter, setModelFilter] = useState("all");
    const [brandFilter, setBrandFilter] = useState("all");
    const [difficultyFilter, setDifficultyFilter] = useState("all"); // [ADDED]

    useEffect(() => {
        async function fetchLeaderboard() {
            setLoading(true);
            const { data, error } = await supabase
                .from("gpu_leaderboard_live")
                .select(
                    "model_name, gpu_name, gpu_brand, normalized_gpu_name, performance_score, tokens_per_second, avg_benchmark_tps, first_token_latency_ms, total_benchmark_time, difficulty"
                )
                .order("tokens_per_second", { ascending: false });

            if (!error) setData(data || []);
            setLoading(false);
        }
        fetchLeaderboard();
    }, []);

    const uniqueModels = useMemo(
        () => [...new Set(data.map(i => i.model_name))].sort(),
        [data]
    );

    const uniqueBrands = useMemo(
        () => [...new Set(data.map(i => i.gpu_brand))].filter(Boolean).sort(),
        [data]
    );

    // [ADDED] unique difficulty values, ordered sensibly
    const uniqueDifficulties = useMemo(() => {
        const order = ["easy", "medium", "hard", "extreme"];
        const found = [...new Set(data.map(i => i.difficulty).filter(Boolean))] as string[];
        return found.sort((a, b) => {
            const ai = order.indexOf(a.toLowerCase());
            const bi = order.indexOf(b.toLowerCase());
            return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
        });
    }, [data]);

    const filteredData = useMemo(() => {
        return data
            .filter(i =>
                i.gpu_name.toLowerCase().includes(search.toLowerCase()) ||
                i.model_name.toLowerCase().includes(search.toLowerCase())
            )
            .filter(i => modelFilter === "all" || i.model_name === modelFilter)
            .filter(i => brandFilter === "all" || i.gpu_brand === brandFilter)
            // [ADDED] difficulty filter
            .filter(i =>
                difficultyFilter === "all" ||
                (i.difficulty ?? "").toLowerCase() === difficultyFilter.toLowerCase()
            )
            .sort((a, b) => b.tokens_per_second - a.tokens_per_second);
    }, [data, search, modelFilter, brandFilter, difficultyFilter]);

    const overallAvgBenchmark = useMemo(() => {
        const valid = filteredData.filter(i => i.avg_benchmark_tps != null);
        if (valid.length === 0) return 0;
        return valid.reduce((sum, i) => sum + i.avg_benchmark_tps, 0) / valid.length;
    }, [filteredData]);

    const avgFirstToken = useMemo(() => {
        const valid = filteredData.filter(i => i.first_token_latency_ms != null);
        if (valid.length === 0) return null;
        return valid.reduce((sum, i) => sum + (i.first_token_latency_ms ?? 0), 0) / valid.length;
    }, [filteredData]);


    return (
        <main className="relative min-h-screen bg-[#18191c] text-[#b0b4bb] overflow-hidden pt-24">
            {/* Green edge glow */}
            <div className="pointer-events-none absolute inset-0
                bg-[radial-gradient(ellipse_at_center,rgba(79,191,138,0.15)_0%,rgba(0,0,0,0)_45%)]" />

            <div className="relative z-10 max-w-7xl mx-auto px-6 py-16">

                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-extrabold text-[#f2f3f5]">
                        GPU Performance Leaderboard
                    </h1>
                    <p className="mt-3">
                        Live benchmarks showing fastest GPU for each AI model
                    </p>
                </div>

                {/* Filters — now 4 columns to include difficulty */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <input
                        placeholder="Search GPU or model..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="px-4 py-3 rounded-md bg-[#232428] border border-[#34363c] text-[#f2f3f5] placeholder-[#9ca0a8] focus:outline-none focus:border-[#4fbf8a]"
                    />
                    <select
                        value={modelFilter}
                        onChange={e => setModelFilter(e.target.value)}
                        className="px-4 py-3 rounded-md bg-[#232428] border border-[#34363c] text-[#f2f3f5] focus:outline-none focus:border-[#4fbf8a]"
                    >
                        <option value="all">All Models</option>
                        {uniqueModels.map(m => (
                            <option key={m} value={m}>{m}</option>
                        ))}
                    </select>
                    <select
                        value={brandFilter}
                        onChange={e => setBrandFilter(e.target.value)}
                        className="px-4 py-3 rounded-md bg-[#232428] border border-[#34363c] text-[#f2f3f5] focus:outline-none focus:border-[#4fbf8a]"
                    >
                        <option value="all">All Brands</option>
                        {uniqueBrands.map(b => (
                            <option key={b} value={b}>{b}</option>
                        ))}
                    </select>
                    {/* [ADDED] Difficulty filter */}
                    <select
                        value={difficultyFilter}
                        onChange={e => setDifficultyFilter(e.target.value)}
                        className="px-4 py-3 rounded-md bg-[#232428] border border-[#34363c] text-[#f2f3f5] focus:outline-none focus:border-[#4fbf8a]"
                    >
                        <option value="all">All Difficulties</option>
                        {uniqueDifficulties.map(d => (
                            <option key={d} value={d}>
                                {d.charAt(0).toUpperCase() + d.slice(1)}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Stats Cards */}
                {!loading && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <div className="bg-[#232428] border border-[#34363c] rounded-lg p-4">
                            <div className="text-[#9ca0a8] text-sm">Total Entries</div>
                            <div className="text-2xl font-bold text-[#f2f3f5] mt-1">
                                {filteredData.length}
                            </div>
                        </div>
                        <div className="bg-[#232428] border border-[#34363c] rounded-lg p-4">
                            <div className="text-[#9ca0a8] text-sm">Models Tested</div>
                            <div className="text-2xl font-bold text-[#f2f3f5] mt-1">
                                {uniqueModels.length}
                            </div>
                        </div>
                        <div className="bg-[#232428] border border-[#34363c] rounded-lg p-4">
                            <div className="text-[#9ca0a8] text-sm">Top Speed</div>
                            <div className="text-2xl font-bold text-[#4fbf8a] mt-1">
                                {filteredData[0]?.tokens_per_second.toFixed(1) || 0} t/s
                            </div>
                        </div>
                        <div className="bg-[#232428] border border-[#34363c] rounded-lg p-4">
                            <div className="text-[#9ca0a8] text-sm">Avg Benchmark</div>
                            <div className="text-2xl font-bold text-[#f2f3f5] mt-1">
                                {overallAvgBenchmark.toFixed(1)} t/s
                            </div>
                        </div>
                        {avgFirstToken != null && (
                            <div className="bg-[#232428] border border-[#34363c] rounded-lg p-4">
                                <div className="text-[#9ca0a8] text-sm">Avg First Token</div>
                                <div className="text-2xl font-bold text-[#f2f3f5] mt-1">
                                    {avgFirstToken.toFixed(0)}ms
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Loading */}
                {loading && (
                    <div className="text-center py-16">
                        <div className="h-8 w-8 mx-auto animate-spin rounded-full border-4 border-[#4fbf8a] border-r-transparent" />
                        <p className="mt-4">Loading leaderboard...</p>
                    </div>
                )}

                {/* Table */}
                {!loading && (
                    <div className="overflow-x-auto rounded-xl border border-[#34363c] bg-[#232428]">
                        <table className="w-full">
                            <thead className="border-b border-[#34363c] text-[#9ca0a8]">
                                <tr>
                                    <th className="p-4 text-left">Rank</th>
                                    <th className="p-4 text-left">GPU</th>
                                    <th className="p-4 text-left">Brand</th>
                                    <th className="p-4 text-left">Model</th>
                                    <th className="p-4 text-left">Difficulty</th>{/* [ADDED] */}
                                    <th className="p-4 text-left">Speed (t/s)</th>
                                    <th className="p-4 text-left">Avg Test (t/s)</th>
                                    <th className="p-4 text-left">First Token</th>
                                    <th className="p-4 text-left">Run Time</th>
                                </tr>
                            </thead>

                            <tbody>
                                {filteredData.map((item, i) => (
                                    <tr
                                        key={item.normalized_gpu_name + i}
                                        className="border-t border-[#34363c] hover:bg-[#3fa77a]/25 transition"
                                    >
                                        <td className="p-4 font-semibold text-[#4fbf8a]">
                                            #{i + 1}
                                        </td>
                                        <td className="p-4 text-[#f2f3f5] font-medium">
                                            {item.gpu_name}
                                        </td>
                                        <td className="p-4">{item.gpu_brand || "N/A"}</td>
                                        <td className="p-4">
                                            <span className="px-2 py-1 rounded text-sm bg-[#3fa77a]/25 text-[#f2f3f5]">
                                                {item.model_name}
                                            </span>
                                        </td>
                                        {/* [ADDED] Difficulty badge */}
                                        <td className="p-4">
                                            <DifficultyBadge difficulty={item.difficulty} />
                                        </td>
                                        <td className="p-4 font-bold text-[#4fbf8a]">
                                            {item.tokens_per_second.toFixed(2)}
                                        </td>
                                        <td className="p-4">
                                            {item.avg_benchmark_tps != null
                                                ? item.avg_benchmark_tps.toFixed(2)
                                                : "N/A"}
                                        </td>
                                        <td className="p-4">
                                            {item.first_token_latency_ms != null
                                                ? `${item.first_token_latency_ms.toFixed(0)}ms`
                                                : "N/A"}
                                        </td>
                                        <td className="p-4">
                                            {item.total_benchmark_time != null
                                                ? `${item.total_benchmark_time.toFixed(2)}s`
                                                : "N/A"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {filteredData.length === 0 && (
                            <p className="py-12 text-center text-[#9ca0a8]">
                                No GPUs found matching your filters
                            </p>
                        )}
                    </div>
                )}
            </div>
        </main>
    );
}