'use client';

import Image from 'next/image';
import logo from '../../assets/icons/logo1w.png';

const BRAND_GREEN = '#4fbf8a';

export default function About1() {
    return (
        <div className="min-h-screen bg-[#0f1014] text-[#f2f3f5]">
            {/* Hero Section */}
            <section className="pt-32 pb-20 px-4">
                <div className="max-w-4xl mx-auto text-center">
                    <div className="flex justify-center mb-6">
                        <Image src={logo} alt="LiteEdgeAI Logo" width={80} height={80} />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold mb-6">
                        About{' '}
                        <span style={{ color: BRAND_GREEN }}>LiteEdgeAI</span>
                    </h1>
                    <p className="text-lg text-[#b0b4bb] leading-relaxed">
                        Empowering the future of edge computing with lightweight,
                        efficient AI models designed for real-world deployment.
                    </p>
                </div>
            </section>

            {/* Mission Section */}
            <section className="py-16 px-4">
                <div className="max-w-6xl mx-auto">
                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            {
                                title: 'Our Mission',
                                content:
                                    'To democratize AI by making state-of-the-art models accessible and deployable on edge devices, from smartphones to IoT sensors.',
                            },
                            {
                                title: 'Our Vision',
                                content:
                                    'A world where intelligent AI runs everywhere, enabling privacy-first, low-latency applications without relying on cloud infrastructure.',
                            },
                            {
                                title: 'Our Approach',
                                content:
                                    'Rigorous benchmarking, transparent rankings, and community-driven evaluation of lightweight models across diverse tasks.',
                            },
                        ].map((item, idx) => (
                            <div
                                key={idx}
                                className="bg-[#18191c] border border-[#34363c] rounded-xl p-6 hover:border-[#4fbf8a] transition-colors"
                            >
                                <h3
                                    className="text-xl font-semibold mb-4"
                                    style={{ color: BRAND_GREEN }}
                                >
                                    {item.title}
                                </h3>
                                <p className="text-[#b0b4bb] leading-relaxed">
                                    {item.content}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* What We Do Section */}
            <section className="py-16 px-4 bg-[#18191c]">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-3xl font-bold text-center mb-12">
                        What We Do
                    </h2>
                    <div className="space-y-6">
                        {[
                            {
                                title: 'Comprehensive Benchmarking',
                                desc: 'We evaluate AI models across multiple dimensions: accuracy, latency, memory footprint, and energy efficiency.',
                            },
                            {
                                title: 'Transparent Rankings',
                                desc: 'Our leaderboards provide clear, data-driven insights to help developers choose the right model for their use case.',
                            },
                            {
                                title: 'Edge-First Focus',
                                desc: 'Every benchmark is designed with real-world edge deployment scenarios in mind, not just theoretical performance.',
                            },
                            {
                                title: 'Open Community',
                                desc: 'We believe in open science. Our methodologies, datasets, and results are transparent and reproducible.',
                            },
                        ].map((item, idx) => (
                            <div
                                key={idx}
                                className="border-l-4 pl-6 py-2"
                                style={{ borderColor: BRAND_GREEN }}
                            >
                                <h3 className="text-xl font-semibold mb-2">
                                    {item.title}
                                </h3>
                                <p className="text-[#b0b4bb]">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Team Section */}
            <section className="py-16 px-4">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-3xl font-bold mb-6">Our Team</h2>
                    <p className="text-[#b0b4bb] mb-12 leading-relaxed">
                        We're a diverse group of AI researchers, engineers, and
                        enthusiasts passionate about making AI more accessible and
                        efficient. Our team combines expertise in machine learning,
                        embedded systems, and software engineering.
                    </p>
                    <div className="inline-block bg-[#18191c] border border-[#34363c] rounded-xl px-8 py-4">
                        <p className="text-[#b0b4bb]">
                            Interested in collaborating?{' '}
                            <a
                                href="mailto:contact@liteedgeai.com"
                                className="font-semibold transition-colors"
                                style={{ color: BRAND_GREEN }}
                                onMouseEnter={e =>
                                (e.currentTarget.style.textDecoration =
                                    'underline')
                                }
                                onMouseLeave={e =>
                                    (e.currentTarget.style.textDecoration = 'none')
                                }
                            >
                                Get in touch
                            </a>
                        </p>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-8 px-4 border-t border-[#34363c]">
                <div className="max-w-4xl mx-auto text-center text-[#b0b4bb] text-sm">
                    <p>
                        © {new Date().getFullYear()} LiteEdgeAI. All rights
                        reserved.
                    </p>
                </div>
            </footer>
        </div>
    );
}