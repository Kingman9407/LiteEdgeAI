'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

const BRAND_GREEN = '#4fbf8a';

// Sample blog data
const blogPosts = [
    {
        id: 1,
        title: 'Optimizing LLMs for Edge Devices: A Practical Guide',
        excerpt:
            'Learn how to deploy large language models on resource-constrained devices with quantization, pruning, and distillation techniques.',
        author: 'Sarah Chen',
        date: 'Feb 10, 2026',
        readTime: '8 min read',
        category: 'Tutorial',
        image: '/api/placeholder/400/250',
    },
    {
        id: 2,
        title: 'Benchmarking Mobile AI: What Really Matters',
        excerpt:
            'Beyond accuracy scores - exploring latency, power consumption, and real-world performance metrics that matter for production.',
        author: 'Marcus Rodriguez',
        date: 'Feb 8, 2026',
        readTime: '6 min read',
        category: 'Research',
        image: '/api/placeholder/400/250',
    },
    {
        id: 3,
        title: 'The Rise of On-Device AI: Privacy Meets Performance',
        excerpt:
            'Why edge AI is becoming the default for privacy-sensitive applications and how it compares to cloud-based solutions.',
        author: 'Emily Watson',
        date: 'Feb 5, 2026',
        readTime: '5 min read',
        category: 'Insights',
        image: '/api/placeholder/400/250',
    },
    {
        id: 4,
        title: 'Quantization Techniques: From FP32 to INT4',
        excerpt:
            'A deep dive into model quantization methods and their impact on accuracy, speed, and memory footprint.',
        author: 'Alex Kim',
        date: 'Feb 3, 2026',
        readTime: '10 min read',
        category: 'Technical',
        image: '/api/placeholder/400/250',
    },
    {
        id: 5,
        title: 'Edge AI Success Stories: Real-World Deployments',
        excerpt:
            'Case studies from companies successfully running AI models on smartphones, IoT devices, and embedded systems.',
        author: 'David Park',
        date: 'Jan 30, 2026',
        readTime: '7 min read',
        category: 'Case Study',
        image: '/api/placeholder/400/250',
    },
    {
        id: 6,
        title: 'Neural Architecture Search for Tiny Models',
        excerpt:
            'Exploring automated techniques to design efficient neural networks optimized for edge deployment constraints.',
        author: 'Lisa Anderson',
        date: 'Jan 28, 2026',
        readTime: '9 min read',
        category: 'Research',
        image: '/api/placeholder/400/250',
    },
    {
        id: 7,
        title: 'Memory-Efficient Transformers: Beyond Standard Attention',
        excerpt:
            'Novel attention mechanisms and architectural improvements that reduce memory requirements for transformer models.',
        author: 'James Liu',
        date: 'Jan 25, 2026',
        readTime: '8 min read',
        category: 'Technical',
        image: '/api/placeholder/400/250',
    },
    {
        id: 8,
        title: 'Battery Life vs AI Performance: Finding the Balance',
        excerpt:
            'Strategies for optimizing AI workloads to minimize power consumption while maintaining acceptable performance.',
        author: 'Rachel Green',
        date: 'Jan 22, 2026',
        readTime: '6 min read',
        category: 'Tutorial',
        image: '/api/placeholder/400/250',
    },
    {
        id: 9,
        title: 'The Future of Edge AI: Trends for 2026',
        excerpt:
            'Predictions and emerging trends in edge computing, from neuromorphic chips to federated learning at scale.',
        author: 'Michael Chen',
        date: 'Jan 20, 2026',
        readTime: '7 min read',
        category: 'Insights',
        image: '/api/placeholder/400/250',
    },
];

const categories = ['All', 'Tutorial', 'Research', 'Insights', 'Technical', 'Case Study'];

export default function BlogsPage() {
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');

    const filteredPosts = blogPosts.filter(post => {
        const matchesCategory =
            selectedCategory === 'All' || post.category === selectedCategory;
        const matchesSearch =
            post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            post.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    return (
        <div className="min-h-screen bg-[#0f1014] text-[#f2f3f5]">
            {/* Hero Section */}
            <section className="pt-32 pb-12 px-4">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4">
                        Latest from{' '}
                        <span style={{ color: BRAND_GREEN }}>LiteEdgeAI</span>
                    </h1>
                    <p className="text-lg text-[#b0b4bb] max-w-2xl">
                        Insights, tutorials, and research on edge AI, model optimization,
                        and efficient deployment strategies.
                    </p>
                </div>
            </section>

            {/* Filters Section */}
            <section className="pb-8 px-4">
                <div className="max-w-7xl mx-auto">
                    {/* Search Bar */}
                    <div className="mb-6">
                        <input
                            type="text"
                            placeholder="Search articles..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full md:w-96 px-4 py-3 bg-[#18191c] border border-[#34363c] rounded-lg text-[#f2f3f5] placeholder-[#b0b4bb] focus:outline-none focus:border-[#4fbf8a] transition-colors"
                        />
                    </div>

                    {/* Category Filters */}
                    <div className="flex flex-wrap gap-3">
                        {categories.map(category => (
                            <button
                                key={category}
                                onClick={() => setSelectedCategory(category)}
                                className="px-4 py-2 rounded-lg border transition-all"
                                style={{
                                    backgroundColor:
                                        selectedCategory === category
                                            ? BRAND_GREEN
                                            : '#18191c',
                                    borderColor:
                                        selectedCategory === category
                                            ? BRAND_GREEN
                                            : '#34363c',
                                    color:
                                        selectedCategory === category
                                            ? '#0f1014'
                                            : '#b0b4bb',
                                }}
                            >
                                {category}
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            {/* Blog Grid */}
            <section className="pb-20 px-4">
                <div className="max-w-7xl mx-auto">
                    {filteredPosts.length > 0 ? (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredPosts.map(post => (
                                <article
                                    key={post.id}
                                    className="bg-[#18191c] border border-[#34363c] rounded-xl overflow-hidden hover:border-[#4fbf8a] transition-all hover:transform hover:scale-[1.02] cursor-pointer"
                                >
                                    {/* Image Placeholder */}
                                    <div className="h-48 bg-gradient-to-br from-[#34363c] to-[#18191c] flex items-center justify-center">
                                        <svg
                                            className="w-16 h-16 text-[#4fbf8a] opacity-50"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                                            />
                                        </svg>
                                    </div>

                                    {/* Content */}
                                    <div className="p-6">
                                        {/* Category Badge */}
                                        <div className="mb-3">
                                            <span
                                                className="inline-block px-3 py-1 text-xs font-semibold rounded-full"
                                                style={{
                                                    backgroundColor: '#232428',
                                                    color: BRAND_GREEN,
                                                }}
                                            >
                                                {post.category}
                                            </span>
                                        </div>

                                        {/* Title */}
                                        <h2 className="text-xl font-bold mb-3 text-[#f2f3f5] hover:text-[#4fbf8a] transition-colors">
                                            {post.title}
                                        </h2>

                                        {/* Excerpt */}
                                        <p className="text-[#b0b4bb] text-sm mb-4 line-clamp-3">
                                            {post.excerpt}
                                        </p>

                                        {/* Meta Info */}
                                        <div className="flex items-center justify-between text-xs text-[#b0b4bb]">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">
                                                    {post.author}
                                                </span>
                                                <span>•</span>
                                                <span>{post.date}</span>
                                            </div>
                                            <span>{post.readTime}</span>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20">
                            <p className="text-[#b0b4bb] text-lg">
                                No articles found matching your criteria.
                            </p>
                        </div>
                    )}
                </div>
            </section>

            {/* Newsletter Section */}
            <section className="py-16 px-4 bg-[#18191c] border-t border-[#34363c]">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-3xl font-bold mb-4">
                        Stay Updated
                    </h2>
                    <p className="text-[#b0b4bb] mb-8">
                        Get the latest articles and insights delivered to your inbox.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                        <input
                            type="email"
                            placeholder="your@email.com"
                            className="flex-1 px-4 py-3 bg-[#0f1014] border border-[#34363c] rounded-lg text-[#f2f3f5] placeholder-[#b0b4bb] focus:outline-none focus:border-[#4fbf8a] transition-colors"
                        />
                        <button
                            className="px-6 py-3 rounded-lg font-semibold transition-all hover:opacity-90"
                            style={{
                                backgroundColor: BRAND_GREEN,
                                color: '#0f1014',
                            }}
                        >
                            Subscribe
                        </button>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-8 px-4 border-t border-[#34363c]">
                <div className="max-w-7xl mx-auto text-center text-[#b0b4bb] text-sm">
                    <p>
                        © {new Date().getFullYear()} LiteEdgeAI. All rights
                        reserved.
                    </p>
                </div>
            </footer>
        </div>
    );
}