"use client";

import { useEffect, useMemo, useState } from "react";

type Ranking = {
    id: string;
    name: string;
    category: string;
    score: number;
};

export default function RankingsPage() {
    const [data, setData] = useState<Ranking[]>([]);
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("all");

    useEffect(() => {
        setData([
            { id: "1", name: "John Doe", category: "Technology", score: 98 },
            { id: "2", name: "Jane Smith", category: "Business", score: 92 },
            { id: "3", name: "Alex Brown", category: "Technology", score: 89 },
            { id: "4", name: "Maria Garcia", category: "Design", score: 95 },
            { id: "5", name: "Rahul Kumar", category: "Business", score: 90 },
        ]);
    }, []);

    const filteredData = useMemo(() => {
        return data
            .filter(item =>
                item.name.toLowerCase().includes(search.toLowerCase())
            )
            .filter(item =>
                category === "all" ? true : item.category === category
            )
            .sort((a, b) => b.score - a.score);
    }, [data, search, category]);

    return (
        <main className="relative min-h-screen bg-black text-gray-200 overflow-hidden pt-24">
            {/* Green edge glow */}
            <div className="pointer-events-none absolute inset-0 
                bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.15)_0%,rgba(0,0,0,0)_45%)]" />

            <div className="relative z-10 max-w-6xl mx-auto px-6 py-16">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-extrabold text-white">
                        Rankings
                    </h1>
                    <p className="mt-3 text-gray-400">
                        Live performance leaderboard across categories
                    </p>
                </div>

                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-4 mb-8">
                    <input
                        type="text"
                        placeholder="Search name..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="flex-1 px-4 py-3 rounded-lg bg-black/60 
                                   border border-emerald-900 text-gray-200
                                   focus:outline-none focus:border-emerald-500"
                    />

                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="px-4 py-3 rounded-lg bg-black/60 
                                   border border-emerald-900 text-gray-200
                                   focus:outline-none focus:border-emerald-500"
                    >
                        <option value="all">All Categories</option>
                        <option value="Technology">Technology</option>
                        <option value="Business">Business</option>
                        <option value="Design">Design</option>
                    </select>
                </div>

                {/* Table */}
                <div className="overflow-x-auto rounded-xl border border-emerald-900 bg-black/60">
                    <table className="w-full text-left">
                        <thead className="border-b border-emerald-900 text-gray-400">
                            <tr>
                                <th className="p-4">Rank</th>
                                <th className="p-4">Name</th>
                                <th className="p-4">Category</th>
                                <th className="p-4">Score</th>
                            </tr>
                        </thead>

                        <tbody>
                            {filteredData.map((item, index) => (
                                <tr
                                    key={item.id}
                                    className="border-t border-emerald-900/40 
                                               hover:bg-emerald-900/10 transition"
                                >
                                    <td className="p-4 font-semibold text-emerald-400">
                                        #{index + 1}
                                    </td>
                                    <td className="p-4 text-white">{item.name}</td>
                                    <td className="p-4">{item.category}</td>
                                    <td className="p-4 font-medium">
                                        {item.score}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {filteredData.length === 0 && (
                        <p className="text-center text-gray-500 py-12">
                            No rankings found
                        </p>
                    )}
                </div>
            </div>
        </main>
    );
}
