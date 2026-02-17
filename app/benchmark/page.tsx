
import type { Metadata } from "next";
import Script from "next/script";
import WebLLMBenchmark from './components/WebLLMBenchmark';
import Navbar from '../components/navbar';
import Footer from '../components/footer';
import CreditsCTA from './components/benchcredits';
import BenchmarkingProcedurePage from './components/properworking';

export const metadata: Metadata = {
    title: "Run AI Benchmark in Browser",
    description:
        "Run real AI model benchmarks directly in your browser using WebGPU. Measure performance, latency, and efficiency of your hardware.",
    openGraph: {
        title: "Run AI Benchmark in Browser | LiteEdgeAI",
        description:
            "Benchmark your hardware with real AI models using WebGPU — no downloads, no installs.",
        url: "https://liteedgeai.com/benchmark",
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "Run AI Benchmark in Browser | LiteEdgeAI",
        description:
            "Benchmark your hardware using real AI models directly in the browser.",
    },
};

export default function BenchmarkPage() {
    return (
        <main>
            {/* Benchmark Page Schema */}
            <Script
                id="benchmark-page-schema"
                type="application/ld+json"
                strategy="afterInteractive"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "WebPage",
                        "@id": "https://liteedgeai.com/benchmark#page",
                        "url": "https://liteedgeai.com/benchmark",
                        "name": "AI Hardware Benchmark",
                        "description":
                            "Run real AI model benchmarks directly in the browser using WebGPU to measure hardware performance.",
                        "isPartOf": {
                            "@id": "https://liteedgeai.com/#website"
                        },
                        "about": {
                            "@id": "https://liteedgeai.com/#organization"
                        },
                        "mainEntity": {
                            "@type": "SoftwareApplication",
                            "name": "WebLLM Benchmark",
                            "applicationCategory": "DeveloperApplication",
                            "operatingSystem": "Web Browser",
                            "description":
                                "A browser-based AI benchmarking tool that runs real AI models using WebGPU."
                        }
                    }),
                }}
            />

            <Navbar />
            <WebLLMBenchmark />
            <BenchmarkingProcedurePage />
            <CreditsCTA />
            <Footer />
        </main>
    );
}
