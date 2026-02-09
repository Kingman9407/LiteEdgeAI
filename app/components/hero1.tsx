export default function HomePage() {
    return (
        <main className="relative min-h-screen text-gray-200 bg-black overflow-hidden">
            {/* Green edge glow */}
            <div className="pointer-events-none absolute inset-0 
                bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.15)_0%,rgba(0,0,0,0)_45%)]">
            </div>

            {/* Content */}
            <div className="relative z-10">
                {/* Hero Section */}
                <section className="flex items-center justify-center min-h-[80vh] px-6">
                    <div className="max-w-3xl text-center">
                        <h1 className="text-4xl md:text-5xl font-extrabold text-white">
                            Build Faster. Smarter. Better.
                        </h1>
                        <p className="mt-4 text-lg text-gray-400">
                            A modern dark-themed home page designed for performance,
                            scalability, and clean UI.
                        </p>

                        <div className="mt-6 flex justify-center gap-4">
                            <button className="px-6 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium">
                                Get Started
                            </button>
                            <button className="px-6 py-3 rounded-lg border border-emerald-800 hover:bg-emerald-900/30">
                                View Docs
                            </button>
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section className="py-20">
                    <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            ["Fast", "Optimized rendering with Next.js and modern tooling."],
                            ["Secure", "Built with best practices for production-ready apps."],
                            ["Scalable", "Grows easily from MVP to full-scale product."]
                        ].map(([title, desc]) => (
                            <div
                                key={title}
                                className="p-6 rounded-xl border border-emerald-900 bg-black/60 hover:border-emerald-500 transition"
                            >
                                <h3 className="text-lg font-semibold text-white">{title}</h3>
                                <p className="mt-2 text-gray-400">{desc}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* CTA */}
                <section className="py-20 text-center">
                    <h2 className="text-3xl font-bold text-white">
                        Ready to ship your next idea?
                    </h2>
                    <p className="mt-3 text-gray-400">
                        Start building with a solid dark UI foundation.
                    </p>

                    <div className="mt-6">
                        <button className="px-8 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium">
                            Start Now
                        </button>
                    </div>
                </section>

                {/* Footer */}
                <footer className="border-t border-emerald-900 py-6 text-center text-gray-500">
                    © {new Date().getFullYear()} YourBrand. All rights reserved.
                </footer>
            </div>
        </main>
    );
}
