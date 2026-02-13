'use client';

import { useState } from 'react';

const BRAND_GREEN = '#4fbf8a';

export default function HowItWorksPage() {
    const [activeSection, setActiveSection] = useState<string | null>(null);

    const toggleSection = (section: string) => {
        setActiveSection(activeSection === section ? null : section);
    };

    return (
        <div className="min-h-screen bg-[#0a0b0d] text-white p-6 pt-24">
            <div className="max-w-4xl mx-auto space-y-8">

                {/* Header */}
                <div className="text-center space-y-4">
                    <h1
                        className="text-5xl font-bold tracking-wide text-[#f2f3f5]"
                        style={{
                            textShadow: `0 0 20px ${BRAND_GREEN}40, 0 0 40px ${BRAND_GREEN}20`
                        }}
                    >
                        How It Works
                    </h1>
                    <p className="text-lg text-[#b0b4bb] max-w-2xl mx-auto">
                        Learn how the WebLLM Benchmark Suite tests AI model performance
                        entirely in your browser using cutting-edge WebGPU technology.
                    </p>
                </div>

                {/* Overview Card */}
                <div className="rounded-xl bg-gradient-to-br from-[#4fbf8a]/10 to-transparent 
                    border border-[#4fbf8a]/30 p-6 shadow-lg">
                    <h2 className="text-2xl font-semibold mb-3 text-[#4fbf8a]">
                        Overview
                    </h2>
                    <p className="text-[#b0b4bb] leading-relaxed">
                        This benchmark runs large language models (LLMs) completely in your browser
                        using WebGPU — no server, no cloud, no data leaving your device.
                        We measure how fast your hardware can generate AI responses across
                        different types of tasks.
                    </p>
                </div>

                {/* Main Sections */}
                <div className="space-y-4">

                    {/* Section 1: WebGPU */}
                    <Section
                        title="WebGPU: Your Browser's GPU Power"
                        number="01"
                        isActive={activeSection === 'webgpu'}
                        onToggle={() => toggleSection('webgpu')}
                    >
                        <div className="space-y-4">
                            <p className="text-[#b0b4bb]">
                                <strong className="text-[#f2f3f5]">WebGPU</strong> is a modern web
                                standard that lets browsers access your graphics card (GPU) for
                                high-performance computing — not just graphics.
                            </p>

                            <div className="bg-[#232428] rounded-lg p-4 border border-[#34363c]">
                                <h4 className="font-semibold text-[#4fbf8a] mb-2">Why GPU?</h4>
                                <ul className="space-y-2 text-sm text-[#b0b4bb]">
                                    <li>• CPUs are fast at sequential tasks</li>
                                    <li>• GPUs excel at parallel operations (thousands at once)</li>
                                    <li>• AI models require massive matrix math = perfect for GPUs</li>
                                    <li>• 10-100x faster inference compared to CPU-only approaches</li>
                                </ul>
                            </div>

                            <div className="bg-[#18191c] rounded-lg p-4 border border-[#4fbf8a]/20">
                                <h4 className="font-semibold text-[#f2f3f5] mb-2">Requirements</h4>
                                <p className="text-sm text-[#b0b4bb]">
                                    Chrome 113+, Edge 113+, or other Chromium-based browsers.
                                    Safari and Firefox support coming soon.
                                </p>
                            </div>
                        </div>
                    </Section>

                    {/* Section 2: Model Loading */}
                    <Section
                        title="Loading the AI Model"
                        number="02"
                        isActive={activeSection === 'loading'}
                        onToggle={() => toggleSection('loading')}
                    >
                        <div className="space-y-4">
                            <p className="text-[#b0b4bb]">
                                When you click "Load Model," here's what happens:
                            </p>

                            <div className="space-y-3">
                                <Step number={1} title="Model Selection">
                                    Choose from models like Llama 3.2 (1B params), Phi-3, or TinyLlama.
                                    Smaller = faster download, larger = better quality.
                                </Step>

                                <Step number={2} title="Download & Cache">
                                    The model is downloaded (typically 500MB-1.5GB) and cached in your browser.
                                    Next time, it loads instantly from cache.
                                </Step>

                                <Step number={3} title="WebGPU Compilation">
                                    The model is compiled into GPU-optimized shaders. This is the
                                    "magic" that makes it run fast on your hardware.
                                </Step>

                                <Step number={4} title="Memory Allocation">
                                    Model weights are loaded into GPU memory (VRAM). Your device needs
                                    4-8GB RAM for smooth operation.
                                </Step>
                            </div>

                            <div className="bg-[#232428] rounded-lg p-4 border border-[#34363c]">
                                <p className="text-sm text-[#b0b4bb]">
                                    <strong className="text-[#4fbf8a]">Pro Tip:</strong> First load
                                    takes 30-60 seconds. Subsequent loads are nearly instant thanks
                                    to browser caching.
                                </p>
                            </div>
                        </div>
                    </Section>

                    {/* Section 3: Benchmark Tests */}
                    <Section
                        title="Running Benchmarks"
                        number="03"
                        isActive={activeSection === 'benchmarks'}
                        onToggle={() => toggleSection('benchmarks')}
                    >
                        <div className="space-y-4">
                            <p className="text-[#b0b4bb]">
                                We test your system with two difficulty modes:
                            </p>

                            <div className="grid md:grid-cols-2 gap-4">
                                <ModeCard
                                    title="Normal Mode"
                                    color="#4fbf8a"
                                    tests={[
                                        'Speed Test: Count 1-20',
                                        'Math: Simple word problem',
                                        'Logic: Basic deduction'
                                    ]}
                                />
                                <ModeCard
                                    title="Hard Mode"
                                    color="#f59e0b"
                                    tests={[
                                        'Stress: Count 1-1000',
                                        'Heavy Math: 10-day calculation',
                                        'Creative: 500-word story'
                                    ]}
                                />
                            </div>

                            <div className="bg-[#18191c] rounded-lg p-4 border border-[#34363c]">
                                <h4 className="font-semibold text-[#f2f3f5] mb-3">What We Measure</h4>
                                <div className="grid md:grid-cols-2 gap-3 text-sm">
                                    <Metric
                                        label="Tokens/Second"
                                        description="How fast the model generates text (higher = better)"
                                    />
                                    <Metric
                                        label="Total Time"
                                        description="End-to-end completion time for all tests"
                                    />
                                    <Metric
                                        label="Load Time"
                                        description="How long initialization takes"
                                    />
                                    <Metric
                                        label="Score"
                                        description="Composite performance metric (tokens/sec × 10)"
                                    />
                                </div>
                            </div>
                        </div>
                    </Section>

                    {/* Section 4: GPU Detection */}
                    <Section
                        title="System Detection"
                        number="04"
                        isActive={activeSection === 'detection'}
                        onToggle={() => toggleSection('detection')}
                    >
                        <div className="space-y-4">
                            <p className="text-[#b0b4bb]">
                                We automatically detect your hardware to understand performance context:
                            </p>

                            <div className="space-y-3">
                                <DetectionItem
                                    title="GPU Information"
                                    items={[
                                        'Vendor (NVIDIA, AMD, Intel, Apple)',
                                        'Model (e.g., RTX 4090, M3 Max)',
                                        'WebGL capabilities and extensions',
                                        'VRAM and shader support'
                                    ]}
                                />

                                <DetectionItem
                                    title="System Specs"
                                    items={[
                                        'CPU cores (via hardwareConcurrency)',
                                        'RAM estimation (deviceMemory API)',
                                        'Operating system',
                                        'Screen resolution'
                                    ]}
                                />
                            </div>

                            <div className="bg-[#232428] rounded-lg p-4 border border-[#34363c]">
                                <p className="text-sm text-[#b0b4bb]">
                                    <strong className="text-[#4fbf8a]">Privacy Note:</strong> All
                                    detection happens locally. No data is sent anywhere unless you
                                    choose to submit results.
                                </p>
                            </div>
                        </div>
                    </Section>

                    {/* Section 5: Results */}
                    <Section
                        title="Understanding Your Results"
                        number="05"
                        isActive={activeSection === 'results'}
                        onToggle={() => toggleSection('results')}
                    >
                        <div className="space-y-4">
                            <div className="bg-[#18191c] rounded-lg p-4 border border-[#34363c]">
                                <h4 className="font-semibold text-[#f2f3f5] mb-3">
                                    Performance Expectations
                                </h4>
                                <div className="space-y-2 text-sm text-[#b0b4bb]">
                                    <div className="flex justify-between">
                                        <span>High-End Desktop (RTX 4090):</span>
                                        <span className="text-[#4fbf8a]">50-100+ tokens/sec</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Mid-Range (GTX 1660, M2):</span>
                                        <span className="text-[#4fbf8a]">20-40 tokens/sec</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Entry-Level (Intel iGPU):</span>
                                        <span className="text-[#f59e0b]">5-15 tokens/sec</span>
                                    </div>
                                </div>
                            </div>

                            <p className="text-[#b0b4bb]">
                                Your results show how well your hardware handles on-device AI.
                                Higher tokens/second means faster, more responsive AI interactions.
                            </p>

                            <div className="bg-gradient-to-r from-[#4fbf8a]/10 to-transparent 
                                rounded-lg p-4 border border-[#4fbf8a]/30">
                                <h4 className="font-semibold text-[#4fbf8a] mb-2">
                                    Want to Compare?
                                </h4>
                                <p className="text-sm text-[#b0b4bb]">
                                    Submit your results to see how your system stacks up against
                                    other users with similar hardware configurations.
                                </p>
                            </div>
                        </div>
                    </Section>

                </div>

                {/* Technical Deep Dive */}
                <div className="rounded-xl bg-[#18191c] border border-[#34363c] p-6">
                    <h2 className="text-2xl font-semibold mb-4 text-[#f2f3f5]">
                        Technical Deep Dive
                    </h2>

                    <div className="space-y-4 text-sm text-[#b0b4bb]">
                        <div>
                            <h3 className="font-semibold text-[#4fbf8a] mb-2">
                                Model Quantization
                            </h3>
                            <p>
                                We use 4-bit quantization (q4f16_1) to compress models from
                                16-bit floats. This reduces size by ~75% while maintaining
                                95%+ quality. Essential for browser deployment.
                            </p>
                        </div>

                        <div>
                            <h3 className="font-semibold text-[#4fbf8a] mb-2">
                                WebLLM & MLC Framework
                            </h3>
                            <p>
                                Built on Apache TVM's MLC (Machine Learning Compilation) stack.
                                Compiles PyTorch/ONNX models to WebGPU shaders with aggressive
                                optimization for maximum throughput.
                            </p>
                        </div>

                        <div>
                            <h3 className="font-semibold text-[#4fbf8a] mb-2">
                                Context Window
                            </h3>
                            <p>
                                Dynamically adjusted: 4096 tokens for 8GB+ RAM, 2048 for 4-8GB,
                                1024 for low-memory devices. Larger windows = better long-context
                                understanding but slower performance.
                            </p>
                        </div>
                    </div>
                </div>

                {/* CTA */}
                <div className="text-center py-8">
                    <a
                        href="/"
                        className="inline-block px-8 py-4 rounded-lg 
                            bg-[#4fbf8a] text-white font-semibold
                            hover:bg-[#3fa77a] transition-all
                            shadow-lg hover:shadow-xl hover:shadow-[#4fbf8a]/20"
                    >
                        Try the Benchmark →
                    </a>
                </div>

            </div>
        </div>
    );
}

/* ========== Components ========== */

interface SectionProps {
    title: string;
    number: string;
    isActive: boolean;
    onToggle: () => void;
    children: React.ReactNode;
}

function Section({ title, number, isActive, onToggle, children }: SectionProps) {
    return (
        <div className="rounded-xl bg-[#18191c] border border-[#34363c] overflow-hidden
            hover:border-[#4fbf8a]/30 transition-all">
            <button
                onClick={onToggle}
                className="w-full p-4 flex items-center justify-between
                    hover:bg-[#232428]/50 transition-colors"
            >
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-[#4fbf8a]/10 border border-[#4fbf8a]/30 
                        flex items-center justify-center font-mono font-bold text-[#4fbf8a]">
                        {number}
                    </div>
                    <h3 className="text-xl font-semibold text-[#f2f3f5]">{title}</h3>
                </div>
                <div className="w-8 h-8 rounded-full border border-[#4fbf8a]/50 
                    flex items-center justify-center text-[#4fbf8a]">
                    {isActive ? '−' : '+'}
                </div>
            </button>

            {isActive && (
                <div className="p-6 pt-2 border-t border-[#34363c]">
                    {children}
                </div>
            )}
        </div>
    );
}

interface StepProps {
    number: number;
    title: string;
    children: React.ReactNode;
}

function Step({ number, title, children }: StepProps) {
    return (
        <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#4fbf8a]/20 
                border border-[#4fbf8a] flex items-center justify-center
                font-bold text-[#4fbf8a] text-sm">
                {number}
            </div>
            <div className="flex-1">
                <h4 className="font-semibold text-[#f2f3f5] mb-1">{title}</h4>
                <p className="text-sm text-[#b0b4bb]">{children}</p>
            </div>
        </div>
    );
}

interface ModeCardProps {
    title: string;
    color: string;
    tests: string[];
}

function ModeCard({ title, color, tests }: ModeCardProps) {
    return (
        <div
            className="rounded-lg p-4 border"
            style={{
                backgroundColor: `${color}10`,
                borderColor: `${color}40`
            }}
        >
            <h4 className="font-semibold mb-3" style={{ color }}>
                {title}
            </h4>
            <ul className="space-y-2 text-sm text-[#b0b4bb]">
                {tests.map((test, i) => (
                    <li key={i}>• {test}</li>
                ))}
            </ul>
        </div>
    );
}

interface MetricProps {
    label: string;
    description: string;
}

function Metric({ label, description }: MetricProps) {
    return (
        <div>
            <div className="font-semibold text-[#4fbf8a]">{label}</div>
            <div className="text-[#b0b4bb]">{description}</div>
        </div>
    );
}

interface DetectionItemProps {
    title: string;
    items: string[];
}

function DetectionItem({ title, items }: DetectionItemProps) {
    return (
        <div className="bg-[#18191c] rounded-lg p-4 border border-[#34363c]">
            <h4 className="font-semibold text-[#f2f3f5] mb-3">{title}</h4>
            <ul className="space-y-1 text-sm text-[#b0b4bb]">
                {items.map((item, i) => (
                    <li key={i}>• {item}</li>
                ))}
            </ul>
        </div>
    );
}