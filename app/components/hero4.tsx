// components/JoinOurCommunity.tsx
import Link from 'next/link';

export default function JoinOurCommunity() {
    return (
        <section className="py-24 px-6 bg-[#0f1013]">
            <div className="max-w-6xl mx-auto">

                <h2 className="text-3xl md:text-4xl font-bold text-[#f2f3f5]">
                    Join Our Community
                </h2>

                <p className="mt-4 max-w-3xl text-[#b0b4bb] text-lg">
                    This community is for people building and experimenting with
                    edge AI — running models locally, optimizing performance, and
                    pushing AI beyond the cloud.
                </p>

                <p className="mt-4 max-w-3xl text-[#b0b4bb]">
                    Work together on projects involving WebGPU, WebLLM, on-device
                    inference, browser-based AI, NPUs, and real-world hardware
                    benchmarking. Share experiments, failures, and wins.
                </p>

                {/* Focus Areas */}
                <div className="mt-8 max-w-3xl">
                    <ul className="space-y-2 text-[#b0b4bb] list-disc list-inside">
                        <li>Edge and on-device AI applications</li>
                        <li>WebGPU and browser-based ML experiments</li>
                        <li>Optimizing tokens-per-second on real hardware</li>
                        <li>Local LLMs, vision models, and multimodal workloads</li>
                        <li>Comparing GPUs, iGPUs, and NPUs for AI inference</li>
                    </ul>
                </div>

                {/* Actions */}
                <div className="mt-10 flex flex-wrap items-center gap-4">

                    {/* Discord */}
                    <a
                        href="https://discord.gg/teTMMXC7"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-3 px-6 py-3
                            rounded-lg border border-[#5865F2]
                            text-[#f2f3f5] font-medium
                            bg-[#5865F2]/10
                            hover:bg-[#5865F2]/20 transition"
                    >
                        Join the Discord →
                    </a>



                </div>

                <p className="mt-6 text-sm text-[#9ca0a8] max-w-3xl">
                    No sign-up required to benchmark. Join the Discord to collaborate,
                    propose edge-AI projects, and help shape future experiments.
                </p>

            </div>
        </section>
    );
}
