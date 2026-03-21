import Link from 'next/link';

export default function HowItWorks() {
    return (
        <section className="py-20 px-6 bg-[#141518]">
            <div className="max-w-5xl mx-auto text-center">

                <h2 className="text-3xl md:text-4xl font-bold text-[#f2f3f5]">
                    How It Works
                </h2>

                <p className="mt-4 text-[#b0b4bb] max-w-2xl mx-auto">
                    Run real AI models directly on your hardware, measure performance,
                    and submit verified benchmark results   all from your browser.
                </p>

                <div className="mt-12 grid gap-8 md:grid-cols-4 text-left">

                    {/* Step 1 */}
                    <div>
                        <h3 className="font-semibold text-[#f2f3f5]">
                            1. Select & Load a Model
                        </h3>
                        <p className="mt-2 text-sm text-[#b0b4bb]">
                            Choose an AI model from the selector and load it.
                            The model is fetched directly from Hugging Face
                            and prepared locally in your browser.
                        </p>
                    </div>

                    {/* Step 2 */}
                    <div>
                        <h3 className="font-semibold text-[#f2f3f5]">
                            2. Run the Benchmark
                        </h3>
                        <p className="mt-2 text-sm text-[#b0b4bb]">
                            Click <span className="text-[#f2f3f5]">Run</span> to execute
                            real AI inference on your hardware using WebGPU.
                            No cloud execution or server side compute is used.
                        </p>
                    </div>

                    {/* Step 3 */}
                    <div>
                        <h3 className="font-semibold text-[#f2f3f5]">
                            3. Measure Performance
                        </h3>
                        <p className="mt-2 text-sm text-[#b0b4bb]">
                            We measure load time, latency, throughput, and token
                            generation speed to calculate normalized AI benchmark
                            performance scores used in our hardware ranking system.
                        </p>
                    </div>

                    {/* Step 4 */}
                    <div>
                        <h3 className="font-semibold text-[#f2f3f5]">
                            4. Submit Results
                        </h3>
                        <p className="mt-2 text-sm text-[#b0b4bb]">
                            Once complete, you can submit your benchmark results.
                            Hardware details and performance metrics are stored
                            to build a public hardware ranking database.
                        </p>
                    </div>

                </div>

                <div className="mt-12 flex justify-center">
                    <Link
                        href="/how-it-works"
                        className="text-lg text-[#8fae9b] hover:underline"
                    >
                        Learn more →
                    </Link>
                </div>

            </div>
        </section>
    );
}
