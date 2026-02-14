
import Link from 'next/link';

export default function Hero() {
    return (
        <section className="flex items-center justify-center min-h-[80vh] px-6">
            <div className="max-w-3xl text-center">
                <h1 className="text-4xl md:text-5xl font-extrabold text-[#f2f3f5]">
                    Benchmark Your Hardware for AI
                </h1>

                <h2 className="mt-4 text-lg">
                    Benchmark and rank your hardware based on real AI performance
                </h2>

                <div className="mt-6 flex justify-center gap-3 sm:gap-6">
                    <Link href="/benchmark" prefetch>
                        <span className="px-3 sm:px-6 py-3 rounded-md text-xs sm:text-base text-white font-medium bg-[#3fa77a] hover:bg-[#357a5a] transition">
                            Run Benchmark
                        </span>
                    </Link>

                    <Link href="/ranking">
                        <span className="px-3 sm:px-6 py-3 rounded-md text-xs sm:text-base border border-[#34363c] hover:bg-[#232428] transition">
                            View Rankings
                        </span>
                    </Link>
                </div>
            </div>
        </section>
    );
}
