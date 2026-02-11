"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client (matching your existing config)
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

    // Fetch data from Supabase
    useEffect(() => {
        async function fetchLeaderboard() {
            setLoading(true);
            try {
                const { data: leaderboardData, error } = await supabase
                    .from('gpu_leaderboard_live')
                    .select('*')
                    .order('tokens_per_second', { ascending: false });

                if (error) {
                    console.error('Supabase error:', error);
                    throw error;
                }

                console.log('Fetched data:', leaderboardData);
                setData(leaderboardData || []);
            } catch (error) {
                console.error('Error fetching leaderboard:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchLeaderboard();
    }, []);

    // Get unique models and brands for filters
    const uniqueModels = useMemo(() => {
        return [...new Set(data.map(item => item.model_name))].sort();
    }, [data]);

    const uniqueBrands = useMemo(() => {
        return [...new Set(data.map(item => item.gpu_brand))].filter(Boolean).sort();
    }, [data]);

    // Filter and sort data
    const filteredData = useMemo(() => {
        return data
            .filter(item =>
                item.gpu_name.toLowerCase().includes(search.toLowerCase()) ||
                item.model_name.toLowerCase().includes(search.toLowerCase())
            )
            .filter(item =>
                modelFilter === "all" ? true : item.model_name === modelFilter
            )
            .filter(item =>
                brandFilter === "all" ? true : item.gpu_brand === brandFilter
            )
            .sort((a, b) => b.tokens_per_second - a.tokens_per_second);
    }, [data, search, modelFilter, brandFilter]);

    // Get rank within filtered results
    const getRank = (index: number) => index + 1;

    // Performance tier badge color
    const getTierColor = (score: number) => {
        if (score >= 9000) return "text-yellow-400";
        if (score >= 7000) return "text-emerald-400";
        if (score >= 5000) return "text-blue-400";
        return "text-gray-400";
    };

    return (
        <main className="relative min-h-screen bg-black text-gray-200 overflow-hidden pt-24">
            {/* Green edge glow */}
            <div className="pointer-events-none absolute inset-0 
                bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.15)_0%,rgba(0,0,0,0)_45%)]" />

            <div className="relative z-10 max-w-7xl mx-auto px-6 py-16">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-extrabold text-white">
                        GPU Performance Leaderboard
                    </h1>
                    <p className="mt-3 text-gray-400">
                        Live benchmarks showing fastest GPU for each AI model
                    </p>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <input
                        type="text"
                        placeholder="Search GPU or model..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="px-4 py-3 rounded-lg bg-black/60 
                                   border border-emerald-900 text-gray-200
                                   focus:outline-none focus:border-emerald-500"
                    />

                    <select
                        value={modelFilter}
                        onChange={(e) => setModelFilter(e.target.value)}
                        className="px-4 py-3 rounded-lg bg-black/60 
                                   border border-emerald-900 text-gray-200
                                   focus:outline-none focus:border-emerald-500"
                    >
                        <option value="all">All Models</option>
                        {uniqueModels.map(model => (
                            <option key={model} value={model}>{model}</option>
                        ))}
                    </select>

                    <select
                        value={brandFilter}
                        onChange={(e) => setBrandFilter(e.target.value)}
                        className="px-4 py-3 rounded-lg bg-black/60 
                                   border border-emerald-900 text-gray-200
                                   focus:outline-none focus:border-emerald-500"
                    >
                        <option value="all">All Brands</option>
                        {uniqueBrands.map(brand => (
                            <option key={brand} value={brand}>{brand}</option>
                        ))}
                    </select>
                </div>

                {/* Stats Cards */}
                {!loading && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                        <div className="bg-black/60 border border-emerald-900 rounded-lg p-4">
                            <div className="text-gray-400 text-sm">Total GPUs</div>
                            <div className="text-2xl font-bold text-white mt-1">
                                {filteredData.length}
                            </div>
                        </div>
                        <div className="bg-black/60 border border-emerald-900 rounded-lg p-4">
                            <div className="text-gray-400 text-sm">Models Tested</div>
                            <div className="text-2xl font-bold text-white mt-1">
                                {uniqueModels.length}
                            </div>
                        </div>
                        <div className="bg-black/60 border border-emerald-900 rounded-lg p-4">
                            <div className="text-gray-400 text-sm">Top Speed</div>
                            <div className="text-2xl font-bold text-emerald-400 mt-1">
                                {filteredData[0]?.tokens_per_second.toFixed(1) || 0} t/s
                            </div>
                        </div>
                        <div className="bg-black/60 border border-emerald-900 rounded-lg p-4">
                            <div className="text-gray-400 text-sm">Avg Speed</div>
                            <div className="text-2xl font-bold text-white mt-1">
                                {(filteredData.reduce((sum, item) => sum + item.tokens_per_second, 0) / filteredData.length || 0).toFixed(1)} t/s
                            </div>
                        </div>
                    </div>
                )}

                {/* Loading State */}
                {loading && (
                    <div className="text-center py-12">
                        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-emerald-500 border-r-transparent"></div>
                        <p className="mt-4 text-gray-400">Loading leaderboard...</p>
                    </div>
                )}

                {/* Table */}
                {!loading && (
                    <div className="overflow-x-auto rounded-xl border border-emerald-900 bg-black/60">
                        <table className="w-full text-left">
                            <thead className="border-b border-emerald-900 text-gray-400">
                                <tr>
                                    <th className="p-4">Rank</th>
                                    <th className="p-4">GPU</th>
                                    <th className="p-4">Brand</th>
                                    <th className="p-4">Model</th>
                                    <th className="p-4">Speed (t/s)</th>
                                    <th className="p-4">Avg Benchmark</th>
                                    <th className="p-4">Load Time</th>
                                    <th className="p-4">Score</th>
                                </tr>
                            </thead>

                            <tbody>
                                {filteredData.map((item, index) => (
                                    <tr
                                        key={`${item.model_name}-${item.normalized_gpu_name}`}
                                        className="border-t border-emerald-900/40 
                                                   hover:bg-emerald-900/10 transition"
                                    >
                                        <td className="p-4 font-semibold text-emerald-400">
                                            #{getRank(index)}
                                        </td>
                                        <td className="p-4 text-white font-medium">
                                            {item.gpu_name}
                                        </td>
                                        <td className="p-4 text-gray-300">
                                            {item.gpu_brand || 'N/A'}
                                        </td>
                                        <td className="p-4 text-gray-300">
                                            <span className="px-2 py-1 bg-emerald-900/20 rounded text-sm">
                                                {item.model_name}
                                            </span>
                                        </td>
                                        <td className="p-4 font-bold text-emerald-400">
                                            {item.tokens_per_second.toFixed(2)}
                                        </td>
                                        <td className="p-4 text-gray-300">
                                            {item.avg_benchmark_tps?.toFixed(2) || 'N/A'}
                                        </td>
                                        <td className="p-4 text-gray-300">
                                            {item.load_time?.toFixed(2)}s
                                        </td>
                                        <td className={`p-4 font-semibold ${getTierColor(item.performance_score)}`}>
                                            {item.performance_score}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {filteredData.length === 0 && !loading && (
                            <p className="text-center text-gray-500 py-12">
                                No GPUs found matching your filters
                            </p>
                        )}
                    </div>
                )}
            </div>
        </main>
    );
}