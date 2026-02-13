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
                        About <span style={{ color: BRAND_GREEN }}>LiteEdgeAI</span>
                    </h1>
                    <p className="text-lg text-[#b0b4bb] leading-relaxed">
                        LiteEdgeAI is a benchmarking and exploration platform focused on
                        lightweight AI models and their behavior on edge oriented hardware.
                        The goal is to provide clarity through measurement rather than claims.
                    </p>
                </div>
            </section>

            {/* Mission Section */}
            <section className="py-16 px-4">
                <div className="max-w-6xl mx-auto">
                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            {
                                title: 'Purpose',
                                content:
                                    'To study and compare lightweight AI models in practical, constrained environments such as edge devices and local systems.',
                            },
                            {
                                title: 'Perspective',
                                content:
                                    'We view edge AI as a trade-off space involving performance, efficiency, and hardware limits rather than a one-size-fits-all solution.',
                            },
                            {
                                title: 'Method',
                                content:
                                    'Models are evaluated using consistent benchmarks and clearly defined metrics so results can be interpreted in context.',
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
                        What We Focus On
                    </h2>
                    <div className="space-y-6">
                        {[
                            {
                                title: 'Benchmarking',
                                desc: 'We measure model behavior across latency, throughput, memory usage, and energy consumption.',
                            },
                            {
                                title: 'Comparative Analysis',
                                desc: 'Results are presented side-by-side to highlight relative differences rather than absolute rankings.',
                            },
                            {
                                title: 'Hardware Awareness',
                                desc: 'Benchmarks are run with specific hardware constraints in mind, including CPUs, GPUs, and NPUs.',
                            },
                            {
                                title: 'Transparency',
                                desc: 'Benchmark setups, assumptions, and limitations are documented to avoid misleading conclusions.',
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

        </div>
    );
}