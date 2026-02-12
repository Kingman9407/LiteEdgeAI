'use client';

const BRAND_GREEN = '#4fbf8a';
const BUTTON_GREEN = '#3fa77a';
const BUTTON_HOVER = '#357a5a';

export default function HomePage() {
    return (
        <main className="relative min-h-screen bg-[#18191c] text-[#b0b4bb] overflow-hidden">
            <div className="relative z-10">

                {/* Hero Section */}
                <section className="flex items-center justify-center min-h-[80vh] px-6">
                    <div className="max-w-3xl text-center">
                        <h1 className="text-4xl md:text-5xl font-extrabold text-[#f2f3f5]">
                            Build Faster. Smarter. Better.
                        </h1>

                        <p className="mt-4 text-lg">
                            A modern dark-themed home page designed for performance,
                            scalability, and clean UI.
                        </p>

                        <div className="mt-6 flex justify-center gap-4">
                            <button
                                className="px-6 py-3 rounded-md text-white font-medium transition"
                                style={{ backgroundColor: BUTTON_GREEN }}
                                onMouseEnter={e =>
                                    (e.currentTarget.style.backgroundColor = BUTTON_HOVER)
                                }
                                onMouseLeave={e =>
                                    (e.currentTarget.style.backgroundColor = BUTTON_GREEN)
                                }
                            >
                                Get Started
                            </button>

                            <button
                                className="
                  px-6 py-3 rounded-md
                  border border-[#34363c]
                  hover:bg-[#232428]
                  transition
                "
                            >
                                View Docs
                            </button>
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section className="py-20">
                    <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            ['Fast', 'Optimized rendering with Next.js and modern tooling.'],
                            ['Secure', 'Built with best practices for production-ready apps.'],
                            ['Scalable', 'Grows easily from MVP to full-scale product.'],
                        ].map(([title, desc]) => (
                            <div
                                key={title}
                                className="
                  p-6 rounded-lg
                  bg-[#232428]
                  border border-[#34363c]
                  transition
                "
                                onMouseEnter={e =>
                                    (e.currentTarget.style.borderColor = BRAND_GREEN)
                                }
                                onMouseLeave={e =>
                                    (e.currentTarget.style.borderColor = '#34363c')
                                }
                            >
                                <h3 className="text-lg font-semibold text-[#f2f3f5]">
                                    {title}
                                </h3>
                                <p className="mt-2">
                                    {desc}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* CTA Section */}
                <section className="py-20 text-center">
                    <h2 className="text-3xl font-bold text-[#f2f3f5]">
                        Ready to ship your next idea?
                    </h2>
                    <p className="mt-3">
                        Start building with a solid dark UI foundation.
                    </p>

                    <div className="mt-6">
                        <button
                            className="px-8 py-3 rounded-md text-white font-medium transition"
                            style={{ backgroundColor: BUTTON_GREEN }}
                            onMouseEnter={e =>
                                (e.currentTarget.style.backgroundColor = BUTTON_HOVER)
                            }
                            onMouseLeave={e =>
                                (e.currentTarget.style.backgroundColor = BUTTON_GREEN)
                            }
                        >
                            Start Now
                        </button>
                    </div>
                </section>

            </div>
        </main>
    );
}
