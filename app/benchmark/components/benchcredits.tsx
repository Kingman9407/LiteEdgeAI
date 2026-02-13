import Link from 'next/link';

const BRAND_GREEN = '#4fbf8a';

export default function CreditsPage() {
    return (
        <section className="flex items-center justify-center min-h-[85vh] px-6">
            <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 items-center">

                {/* Left: Text */}
                <div className="text-left flex flex-col justify-center">
                    <h1 className="text-4xl md:text-5xl font-extrabold text-[#f2f3f5] leading-tight">
                        Transparent & Reproducible Benchmarks
                    </h1>

                    <p className="mt-6 text-lg text-[#b0b4bb] max-w-xl">
                        LiteEdgeAI evaluates hardware using real-world AI workloads,
                        focusing on inference speed, memory efficiency, and sustained
                        performance.
                    </p>

                    <p className="mt-4 text-[#b0b4bb] max-w-xl">
                        Every score is fair, explainable, and repeatable — so rankings
                        actually mean something.
                    </p>
                </div>

                {/* Right: Actions */}
                <div className="flex flex-col gap-4 md:gap-6 items-start md:items-end justify-center">
                    <Link href="/working" className="w-full md:w-auto">
                        <span
                            className="block px-8 py-4 rounded-md font-semibold transition text-center"
                            style={{
                                border: `1px solid ${BRAND_GREEN}`,
                                color: BRAND_GREEN,
                                minWidth: '220px',
                            }}
                        >
                            How It Works →
                        </span>
                    </Link>

                    <Link href="/credits" className="w-full md:w-auto">
                        <span
                            className="block px-8 py-4 rounded-md border border-[#34363c] text-[#f2f3f5] hover:bg-[#232428] transition text-center"
                            style={{ minWidth: '220px' }}
                        >
                            Credits & Sources →
                        </span>
                    </Link>
                </div>

            </div>
        </section>
    );
}