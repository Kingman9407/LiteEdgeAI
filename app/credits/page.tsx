'use client';

import Navbar from '../components/navbar';
import Footer from '../components/footer';

const BRAND_GREEN = '#4fbf8a';

export default function CreditsPage() {
    return (
        <main className="min-h-screen bg-[#0f1014] text-[#f2f3f5]">
            <Navbar />

            <div className="pt-32 pb-20 px-4">
                <div className="max-w-4xl mx-auto">

                    {/* Header */}
                    <h1 className="text-4xl md:text-5xl font-bold mb-6">
                        Credits & Acknowledgments
                    </h1>
                    <p className="text-lg text-[#b0b4bb] mb-12">
                        LiteEdgeAI is made possible by two essential open-source projects. Without them, browser-based AI benchmarking would not exist.
                    </p>

                    {/* Top 2 Essential Contributors */}
                    <section className="space-y-8">

                        {/* #1 - WebLLM */}
                        <div className="bg-[#18191c] border-2 border-[#4fbf8a]/30 rounded-xl p-8">
                            <div className="flex items-start justify-between mb-4">
                                <h2 className="text-2xl font-bold text-[#4fbf8a]">
                                    <a
                                        href="https://github.com/mlc-ai/web-llm"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="hover:underline"
                                    >
                                        MLC-AI / WebLLM ↗
                                    </a>
                                </h2>
                                <span className="text-sm px-3 py-1 bg-[#4fbf8a]/20 text-[#4fbf8a] rounded-full font-medium">
                                    #1 Core Engine
                                </span>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-lg font-semibold text-[#f2f3f5] mb-2">
                                        What it does:
                                    </h3>
                                    <p className="text-[#b0b4bb] leading-relaxed">
                                        WebLLM is the entire foundation of this project. It enables running large language models
                                        completely in your browser using WebGPU for GPU acceleration. Without WebLLM, none of the
                                        benchmarking, model loading, or inference would be possible.
                                    </p>
                                </div>

                                <div>
                                    <h3 className="text-lg font-semibold text-[#f2f3f5] mb-2">
                                        How we use it:
                                    </h3>
                                    <ul className="space-y-2 text-[#b0b4bb]">
                                        <li className="flex items-start gap-2">
                                            <span className="text-[#4fbf8a] mt-1">•</span>
                                            <span>Loading quantized LLM models directly in the browser</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-[#4fbf8a] mt-1">•</span>
                                            <span>Running GPU-accelerated inference using WebGPU</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-[#4fbf8a] mt-1">•</span>
                                            <span>Measuring tokens per second, load times, and performance metrics</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-[#4fbf8a] mt-1">•</span>
                                            <span>Detecting GPU capabilities and system specifications</span>
                                        </li>
                                    </ul>
                                </div>

                                <div className="pt-4 border-t border-[#34363c]">
                                    <div className="flex gap-6 text-sm text-[#7d818a]">
                                        <span><strong className="text-[#f2f3f5]">License:</strong> Apache 2.0</span>
                                        <span><strong className="text-[#f2f3f5]">Version:</strong> 0.2.80</span>
                                        <span><strong className="text-[#f2f3f5]">Creators:</strong> MLC-AI Team</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* #2 - Hugging Face */}
                        <div className="bg-[#18191c] border-2 border-[#4fbf8a]/30 rounded-xl p-8">
                            <div className="flex items-start justify-between mb-4">
                                <h2 className="text-2xl font-bold text-[#4fbf8a]">
                                    <a
                                        href="https://huggingface.co"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="hover:underline"
                                    >
                                        Hugging Face ↗
                                    </a>
                                </h2>
                                <span className="text-sm px-3 py-1 bg-[#4fbf8a]/20 text-[#4fbf8a] rounded-full font-medium">
                                    #2 Model Platform
                                </span>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-lg font-semibold text-[#f2f3f5] mb-2">
                                        What it does:
                                    </h3>
                                    <p className="text-[#b0b4bb] leading-relaxed">
                                        Hugging Face is the platform hosting and distributing all the AI models used in our benchmarks.
                                        They provide the infrastructure to access pre-quantized models optimized for browser execution.
                                        Without their model repository and CDN, we couldn't load models efficiently.
                                    </p>
                                </div>

                                <div>
                                    <h3 className="text-lg font-semibold text-[#f2f3f5] mb-2">
                                        How we use it:
                                    </h3>
                                    <ul className="space-y-2 text-[#b0b4bb]">
                                        <li className="flex items-start gap-2">
                                            <span className="text-[#4fbf8a] mt-1">•</span>
                                            <span>Downloading MLC-quantized model files on-demand</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-[#4fbf8a] mt-1">•</span>
                                            <span>Accessing models from Meta, Microsoft, Alibaba, and others</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-[#4fbf8a] mt-1">•</span>
                                            <span>Leveraging their global CDN for fast model delivery</span>
                                        </li>
                                    </ul>
                                </div>

                                <div>
                                    <h3 className="text-lg font-semibold text-[#f2f3f5] mb-2">
                                        Models we benchmark:
                                    </h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-[#232428] border border-[#34363c] rounded-lg p-3">
                                            <div className="font-medium text-[#f2f3f5]">TinyLlama 1.1B</div>
                                            <div className="text-xs text-[#7d818a]">TinyLlama team</div>
                                        </div>
                                        <div className="bg-[#232428] border border-[#34363c] rounded-lg p-3">
                                            <div className="font-medium text-[#f2f3f5]">Llama 3.2 1B</div>
                                            <div className="text-xs text-[#7d818a]">Meta AI</div>
                                        </div>
                                        <div className="bg-[#232428] border border-[#34363c] rounded-lg p-3">
                                            <div className="font-medium text-[#f2f3f5]">Phi-3 Mini</div>
                                            <div className="text-xs text-[#7d818a]">Microsoft</div>
                                        </div>
                                        <div className="bg-[#232428] border border-[#34363c] rounded-lg p-3">
                                            <div className="font-medium text-[#f2f3f5]">Qwen 2.5 1.5B</div>
                                            <div className="text-xs text-[#7d818a]">Alibaba Cloud</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-[#34363c]">
                                    <div className="flex gap-6 text-sm text-[#7d818a]">
                                        <span><strong className="text-[#f2f3f5]">Platform:</strong> Model hosting & distribution</span>
                                        <span><strong className="text-[#f2f3f5]">Founded:</strong> 2016</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </section>

                    {/* Footer Note */}
                    <section className="mt-16 pt-8 border-t border-[#34363c]">
                        <p className="text-center text-[#7d818a] leading-relaxed">
                            These two projects are the backbone of LiteEdgeAI. We are deeply grateful to the MLC-AI
                            team and Hugging Face for building and maintaining the infrastructure that makes
                            browser-based AI benchmarking possible. All open-source licenses are respected and followed.
                        </p>
                    </section>

                </div>
            </div>

            <Footer />
        </main>
    );
}
