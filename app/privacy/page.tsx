import Navbar from '../components/navbar';
import Footer from '../components/footer';

const BRAND_GREEN = '#4fbf8a';

export const metadata = {
    title: 'Privacy Policy — LiteEdgeAI',
    description: 'How LiteEdgeAI handles your data during benchmarking.',
    alternates: {
        canonical: '/privacy',
    },
    openGraph: {
        title: 'Privacy Policy — LiteEdgeAI',
        description: 'How LiteEdgeAI handles your data during benchmarking.',
        url: 'https://liteedgeai.com/privacy',
        type: 'website',
        images: ['/og-image.png'],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Privacy Policy — LiteEdgeAI',
        description: 'How LiteEdgeAI handles your data during benchmarking.',
        images: ['/og-image.png'],
    },
};

export default function PrivacyPolicyPage() {
    return (
        <main className="min-h-screen bg-[#0a0b0d] text-[#f2f3f5]">
            <Navbar />

            <div className="pt-32 pb-20 px-4">
                <div className="max-w-3xl mx-auto">

                    <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
                    <p className="text-[#9ca0a8] mb-12">Last updated: February 13, 2026</p>

                    {/* Intro */}
                    <section className="mb-10">
                        <p className="text-[#b0b4bb] leading-relaxed">
                            LiteEdgeAI is a browser-based AI benchmarking platform. We are committed
                            to transparency about what data we collect, why we collect it, and how
                            it is used. This policy explains our practices.
                        </p>
                    </section>

                    {/* Section 1 */}
                    <section className="mb-10">
                        <h2 className="text-2xl font-semibold mb-4" style={{ color: BRAND_GREEN }}>
                            1. What Data We Collect
                        </h2>
                        <p className="text-[#b0b4bb] leading-relaxed mb-4">
                            When you run a benchmark and choose to submit your results, we collect:
                        </p>
                        <ul className="space-y-2 text-[#b0b4bb] list-disc list-inside ml-4">
                            <li><strong className="text-[#f2f3f5]">Hardware Information:</strong> GPU name, vendor, WebGL/WebGPU capabilities, screen resolution, CPU core count, and device memory.</li>
                            <li><strong className="text-[#f2f3f5]">Benchmark Results:</strong> Tokens per second, load time, latency, throughput, and performance scores.</li>
                            <li><strong className="text-[#f2f3f5]">Model Information:</strong> The AI model name and configuration used during the benchmark.</li>
                            <li><strong className="text-[#f2f3f5]">Browser Metadata:</strong> User agent string and platform information.</li>
                        </ul>
                    </section>

                    {/* Section 2 */}
                    <section className="mb-10">
                        <h2 className="text-2xl font-semibold mb-4" style={{ color: BRAND_GREEN }}>
                            2. What We Do Not Collect
                        </h2>
                        <ul className="space-y-2 text-[#b0b4bb] list-disc list-inside ml-4">
                            <li>We do <strong className="text-[#f2f3f5]">not</strong> collect personal information such as names, emails, or IP addresses.</li>
                            <li>We do <strong className="text-[#f2f3f5]">not</strong> use cookies for tracking or advertising.</li>
                            <li>We do <strong className="text-[#f2f3f5]">not</strong> collect the content of AI model prompts or responses beyond the benchmark test itself.</li>
                            <li>We do <strong className="text-[#f2f3f5]">not</strong> sell or share data with third parties for marketing purposes.</li>
                        </ul>
                    </section>

                    {/* Section 3 */}
                    <section className="mb-10">
                        <h2 className="text-2xl font-semibold mb-4" style={{ color: BRAND_GREEN }}>
                            3. How We Use Your Data
                        </h2>
                        <p className="text-[#b0b4bb] leading-relaxed mb-4">
                            Submitted benchmark data is used to:
                        </p>
                        <ul className="space-y-2 text-[#b0b4bb] list-disc list-inside ml-4">
                            <li>Build and maintain a public GPU performance leaderboard.</li>
                            <li>Compare hardware performance across different devices and configurations.</li>
                            <li>Provide community-verified benchmarks for hardware buyers.</li>
                        </ul>
                    </section>

                    {/* Section 4 */}
                    <section className="mb-10">
                        <h2 className="text-2xl font-semibold mb-4" style={{ color: BRAND_GREEN }}>
                            4. Data Processing
                        </h2>
                        <p className="text-[#b0b4bb] leading-relaxed">
                            All AI inference runs entirely in your browser using WebGPU. No data is
                            sent to any server during the benchmark itself. Data is only transmitted
                            when you explicitly click &quot;Submit Results&quot; after completing a benchmark.
                        </p>
                    </section>

                    {/* Section 5 */}
                    <section className="mb-10">
                        <h2 className="text-2xl font-semibold mb-4" style={{ color: BRAND_GREEN }}>
                            5. Data Storage
                        </h2>
                        <p className="text-[#b0b4bb] leading-relaxed">
                            Submitted benchmark results are stored in a Supabase database. This data
                            is aggregated and anonymized — it cannot be traced back to any individual
                            user. The data is retained indefinitely to maintain historical benchmark
                            comparisons.
                        </p>
                    </section>

                    {/* Section 6 */}
                    <section className="mb-10">
                        <h2 className="text-2xl font-semibold mb-4" style={{ color: BRAND_GREEN }}>
                            6. Third-Party Services
                        </h2>
                        <ul className="space-y-2 text-[#b0b4bb] list-disc list-inside ml-4">
                            <li><strong className="text-[#f2f3f5]">Supabase:</strong> Used for storing benchmark results. Subject to <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[#4fbf8a] hover:underline">Supabase&apos;s Privacy Policy</a>.</li>
                            <li><strong className="text-[#f2f3f5]">Hugging Face:</strong> AI models are fetched from Hugging Face model hub. Subject to <a href="https://huggingface.co/privacy" target="_blank" rel="noopener noreferrer" className="text-[#4fbf8a] hover:underline">Hugging Face&apos;s Privacy Policy</a>.</li>
                            <li><strong className="text-[#f2f3f5]">Vercel:</strong> Hosting provider. Subject to <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-[#4fbf8a] hover:underline">Vercel&apos;s Privacy Policy</a>.</li>
                        </ul>
                    </section>

                    {/* Section 7 */}
                    <section className="mb-10">
                        <h2 className="text-2xl font-semibold mb-4" style={{ color: BRAND_GREEN }}>
                            7. Your Rights
                        </h2>
                        <p className="text-[#b0b4bb] leading-relaxed">
                            Since we do not collect personally identifiable information, there is no
                            personal data to request, modify, or delete. Benchmark submissions are
                            anonymous and voluntary. You can always choose to skip submission after
                            running a benchmark.
                        </p>
                    </section>

                    {/* Section 8 */}
                    <section className="mb-10">
                        <h2 className="text-2xl font-semibold mb-4" style={{ color: BRAND_GREEN }}>
                            8. Changes to This Policy
                        </h2>
                        <p className="text-[#b0b4bb] leading-relaxed">
                            We may update this privacy policy from time to time. Changes will be
                            reflected on this page with an updated revision date. Continued use of
                            the platform constitutes acceptance of any changes.
                        </p>
                    </section>

                    {/* Contact */}
                    <section className="mt-12 pt-8 border-t border-[#34363c]">
                        <h2 className="text-2xl font-semibold mb-4" style={{ color: BRAND_GREEN }}>
                            Contact
                        </h2>
                        <p className="text-[#b0b4bb] leading-relaxed">
                            If you have questions about this privacy policy, contact us at{' '}
                            <a href="mailto:contact@liteedgeai.com" className="text-[#4fbf8a] hover:underline">
                                contact@liteedgeai.com
                            </a>.
                        </p>
                    </section>

                </div>
            </div>

            <Footer />
        </main>
    );
}
