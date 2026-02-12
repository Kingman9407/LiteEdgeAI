"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
);

type GPURanking = {
    model_name: string;
    gpu_name: string;
    gpu_brand: string;
    normalized_gpu_name: string;
    performance_score: number;
    tokens_per_second: number;
    avg_benchmark_tps: number;
    load_time: number;
};

export default function RankingsPage() {
    const [data, setData] = useState<GPURanking[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [modelFilter, setModelFilter] = useState("all");
    const [brandFilter, setBrandFilter] = useState("all");

    useEffect(() => {
        async function fetchLeaderboard() {
            setLoading(true);
            const { data, error } = await supabase
                .from("gpu_leaderboard_live")
                .select("*")
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

    const filteredData = useMemo(() => {
        return data
            .filter(i =>
                i.gpu_name.toLowerCase().includes(search.toLowerCase()) ||
                i.model_name.toLowerCase().includes(search.toLowerCase())
            )
            .filter(i => modelFilter === "all" || i.model_name === modelFilter)
            .filter(i => brandFilter === "all" || i.gpu_brand === brandFilter)
            .sort((a, b) => b.tokens_per_second - a.tokens_per_second);
    }, [data, search, modelFilter, brandFilter]);

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

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <input
                        placeholder="Search GPU or model..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="
                            px-4 py-3 rounded-md
                            bg-[#232428]
                            border border-[#34363c]
                            text-[#f2f3f5]
                            placeholder-[#7d818a]
                            focus:outline-none
                            focus:border-[#4fbf8a]
                        "
                    />

                    <select
                        value={modelFilter}
                        onChange={e => setModelFilter(e.target.value)}
                        className="
                            px-4 py-3 rounded-md
                            bg-[#232428]
                            border border-[#34363c]
                            text-[#f2f3f5]
                            focus:outline-none
                            focus:border-[#4fbf8a]
                        "
                    >
                        <option value="all">All Models</option>
                        {uniqueModels.map(m => (
                            <option key={m} value={m}>{m}</option>
                        ))}
                    </select>

                    <select
                        value={brandFilter}
                        onChange={e => setBrandFilter(e.target.value)}
                        className="
                            px-4 py-3 rounded-md
                            bg-[#232428]
                            border border-[#34363c]
                            text-[#f2f3f5]
                            focus:outline-none
                            focus:border-[#4fbf8a]
                        "
                    >
                        <option value="all">All Brands</option>
                        {uniqueBrands.map(b => (
                            <option key={b} value={b}>{b}</option>
                        ))}
                    </select>
                </div>

                {/* Stats Cards */}
                {!loading && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                        <div className="bg-[#232428] border border-[#34363c] rounded-lg p-4">
                            <div className="text-[#7d818a] text-sm">Total GPUs</div>
                            <div className="text-2xl font-bold text-[#f2f3f5] mt-1">
                                {filteredData.length}
                            </div>
                        </div>
                        <div className="bg-[#232428] border border-[#34363c] rounded-lg p-4">
                            <div className="text-[#7d818a] text-sm">Models Tested</div>
                            <div className="text-2xl font-bold text-[#f2f3f5] mt-1">
                                {uniqueModels.length}
                            </div>
                        </div>
                        <div className="bg-[#232428] border border-[#34363c] rounded-lg p-4">
                            <div className="text-[#7d818a] text-sm">Top Speed</div>
                            <div className="text-2xl font-bold text-[#4fbf8a] mt-1">
                                {filteredData[0]?.tokens_per_second.toFixed(1) || 0} t/s
                            </div>
                        </div>
                        <div className="bg-[#232428] border border-[#34363c] rounded-lg p-4">
                            <div className="text-[#7d818a] text-sm">Avg Benchmark</div>
                            <div className="text-2xl font-bold text-[#f2f3f5] mt-1">
                                {(filteredData.reduce((sum, item) => sum + (item.avg_benchmark_tps || 0), 0) / filteredData.length || 0).toFixed(1)} t/s
                            </div>
                        </div>
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
                            <thead className="border-b border-[#34363c] text-[#7d818a]">
                                <tr>
                                    <th className="p-4 text-left">Rank</th>
                                    <th className="p-4 text-left">GPU</th>
                                    <th className="p-4 text-left">Brand</th>
                                    <th className="p-4 text-left">Model</th>
                                    <th className="p-4 text-left">Speed (t/s)</th>
                                    <th className="p-4 text-left">Avg Benchmark</th>
                                    <th className="p-4 text-left">Load Time</th>
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
                                        <td className="p-4 font-bold text-[#4fbf8a]">
                                            {item.tokens_per_second.toFixed(2)}
                                        </td>
                                        <td className="p-4">
                                            {item.avg_benchmark_tps?.toFixed(2) || "N/A"}
                                        </td>
                                        <td className="p-4">
                                            {item.load_time?.toFixed(2)}s
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {filteredData.length === 0 && (
                            <p className="py-12 text-center text-[#7d818a]">
                                No GPUs found matching your filters
                            </p>
                        )}
                    </div>
                )}
            </div>
        </main>
    );
}