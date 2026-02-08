export default function HomePage() {
    return (
        <main className="min-h-screen bg-[#0B0F19] text-gray-200">
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
                        <button className="px-6 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium">
                            Get Started
                        </button>
                        <button className="px-6 py-3 rounded-lg border border-gray-700 hover:bg-gray-800">
                            View Docs
                        </button>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-20 bg-[#0E1325]">
                <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="p-6 rounded-xl border border-gray-800 bg-[#0B0F19] hover:border-indigo-600 transition">
                        <h3 className="text-lg font-semibold text-white">Fast</h3>
                        <p className="mt-2 text-gray-400">
                            Optimized rendering with Next.js and modern tooling.
                        </p>
                    </div>

                    <div className="p-6 rounded-xl border border-gray-800 bg-[#0B0F19] hover:border-indigo-600 transition">
                        <h3 className="text-lg font-semibold text-white">Secure</h3>
                        <p className="mt-2 text-gray-400">
                            Built with best practices for production-ready apps.
                        </p>
                    </div>

                    <div className="p-6 rounded-xl border border-gray-800 bg-[#0B0F19] hover:border-indigo-600 transition">
                        <h3 className="text-lg font-semibold text-white">Scalable</h3>
                        <p className="mt-2 text-gray-400">
                            Grows easily from MVP to full-scale product.
                        </p>
                    </div>
                </div>
            </section>

            {/* Call to Action */}
            <section className="py-20 text-center">
                <h2 className="text-3xl font-bold text-white">
                    Ready to ship your next idea?
                </h2>
                <p className="mt-3 text-gray-400">
                    Start building with a solid dark UI foundation.
                </p>

                <div className="mt-6">
                    <button className="px-8 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium">
                        Start Now
                    </button>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-gray-800 py-6 text-center text-gray-500">
                © {new Date().getFullYear()} YourBrand. All rights reserved.
            </footer>
        </main>
    );
}
