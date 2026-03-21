import Navbar from '../components/navbar';
import Footer from '../components/footer';

const BRAND_GREEN = '#4fbf8a';

export const metadata = {
    title: 'Terms of Service — LiteEdgeAI',
    description: 'Terms and conditions for using LiteEdgeAI benchmarking platform.',
    alternates: {
        canonical: '/terms',
    },
    openGraph: {
        title: 'Terms of Service — LiteEdgeAI',
        description: 'Terms and conditions for using LiteEdgeAI benchmarking platform.',
        url: 'https://liteedgeai.com/terms',
        type: 'website',
        images: ['/og-image.png'],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Terms of Service — LiteEdgeAI',
        description: 'Terms and conditions for using LiteEdgeAI benchmarking platform.',
        images: ['/og-image.png'],
    },
};

export default function TermsOfServicePage() {
    return (
        <main className="min-h-screen bg-[#0a0b0d] text-[#f2f3f5]">
            <Navbar />

            <div className="pt-32 pb-20 px-4">
                <div className="max-w-3xl mx-auto">

                    <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
                    <p className="text-[#9ca0a8] mb-12">Last updated: February 13, 2026</p>

                    {/* Intro */}
                    <section className="mb-10">
                        <p className="text-[#b0b4bb] leading-relaxed">
                            By accessing or using LiteEdgeAI (&quot;the Platform&quot;), you agree to be bound
                            by these Terms of Service. If you do not agree with any part of these
                            terms, you should not use the Platform.
                        </p>
                    </section>

                    {/* Section 1 */}
                    <section className="mb-10">
                        <h2 className="text-2xl font-semibold mb-4" style={{ color: BRAND_GREEN }}>
                            1. Description of Service
                        </h2>
                        <p className="text-[#b0b4bb] leading-relaxed">
                            LiteEdgeAI is a free, browser-based platform that allows users to
                            benchmark their hardware&apos;s AI inference performance using WebGPU. The
                            Platform enables users to run AI models locally in their browser,
                            measure performance metrics, and optionally submit results to a public
                            leaderboard.
                        </p>
                    </section>

                    {/* Section 2 */}
                    <section className="mb-10">
                        <h2 className="text-2xl font-semibold mb-4" style={{ color: BRAND_GREEN }}>
                            2. Eligibility
                        </h2>
                        <p className="text-[#b0b4bb] leading-relaxed">
                            The Platform is available to anyone with a compatible browser that
                            supports WebGPU. No account registration is required to run benchmarks
                            or view rankings. There are no age restrictions for using the Platform.
                        </p>
                    </section>

                    {/* Section 3 */}
                    <section className="mb-10">
                        <h2 className="text-2xl font-semibold mb-4" style={{ color: BRAND_GREEN }}>
                            3. Acceptable Use
                        </h2>
                        <p className="text-[#b0b4bb] leading-relaxed mb-4">
                            You agree not to:
                        </p>
                        <ul className="space-y-2 text-[#b0b4bb] list-disc list-inside ml-4">
                            <li>Submit fabricated, manipulated, or artificially inflated benchmark results.</li>
                            <li>Attempt to interfere with the Platform&apos;s operation or other users&apos; experience.</li>
                            <li>Use automated tools to submit bulk benchmark data without authorization.</li>
                            <li>Reverse-engineer, decompile, or attempt to extract source code beyond what is publicly available.</li>
                            <li>Use the Platform for any illegal or unauthorized purpose.</li>
                        </ul>
                    </section>

                    {/* Section 4 */}
                    <section className="mb-10">
                        <h2 className="text-2xl font-semibold mb-4" style={{ color: BRAND_GREEN }}>
                            4. Benchmark Data
                        </h2>
                        <ul className="space-y-3 text-[#b0b4bb] list-disc list-inside ml-4">
                            <li>
                                <strong className="text-[#f2f3f5]">Voluntary Submission:</strong> Submitting
                                benchmark results is entirely optional. You may run benchmarks without
                                submitting any data.
                            </li>
                            <li>
                                <strong className="text-[#f2f3f5]">Public Data:</strong> Submitted benchmark
                                results become part of a public leaderboard and may be viewed by other
                                users. Results are anonymized and cannot be traced to individual users.
                            </li>
                            <li>
                                <strong className="text-[#f2f3f5]">Accuracy:</strong> You agree that any
                                benchmark data you submit represents genuine results from actual
                                hardware performance testing.
                            </li>
                            <li>
                                <strong className="text-[#f2f3f5]">License:</strong> By submitting benchmark
                                data, you grant LiteEdgeAI a non-exclusive, worldwide, royalty-free
                                license to use, display, and analyze the data for the purpose of
                                maintaining and improving the Platform.
                            </li>
                        </ul>
                    </section>

                    {/* Section 5 */}
                    <section className="mb-10">
                        <h2 className="text-2xl font-semibold mb-4" style={{ color: BRAND_GREEN }}>
                            5. Intellectual Property
                        </h2>
                        <ul className="space-y-3 text-[#b0b4bb] list-disc list-inside ml-4">
                            <li>
                                The Platform&apos;s design, code, and branding are the property of LiteEdgeAI.
                            </li>
                            <li>
                                AI models used for benchmarking are provided by their respective creators
                                (e.g., Meta, Microsoft, Alibaba) and are subject to their own licenses.
                            </li>
                            <li>
                                The Platform uses open-source libraries including WebLLM (Apache 2.0)
                                and models from Hugging Face, all used in accordance with their
                                respective licenses.
                            </li>
                        </ul>
                    </section>

                    {/* Section 6 */}
                    <section className="mb-10">
                        <h2 className="text-2xl font-semibold mb-4" style={{ color: BRAND_GREEN }}>
                            6. Disclaimers
                        </h2>
                        <div className="space-y-4 text-[#b0b4bb] leading-relaxed">
                            <p>
                                <strong className="text-[#f2f3f5]">As-Is Basis:</strong> The Platform is
                                provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind,
                                either express or implied.
                            </p>
                            <p>
                                <strong className="text-[#f2f3f5]">Hardware Risk:</strong> Running AI
                                benchmarks utilizes your GPU and system resources. While the Platform
                                is designed to operate within safe parameters, LiteEdgeAI is not
                                responsible for any hardware issues that may occur during benchmarking.
                            </p>
                            <p>
                                <strong className="text-[#f2f3f5]">Accuracy:</strong> Benchmark results are
                                influenced by many factors including browser version, system load,
                                thermal conditions, and driver versions. Results should be considered
                                approximate and may vary between runs.
                            </p>
                        </div>
                    </section>

                    {/* Section 7 */}
                    <section className="mb-10">
                        <h2 className="text-2xl font-semibold mb-4" style={{ color: BRAND_GREEN }}>
                            7. Limitation of Liability
                        </h2>
                        <p className="text-[#b0b4bb] leading-relaxed">
                            To the maximum extent permitted by law, LiteEdgeAI shall not be liable
                            for any indirect, incidental, special, consequential, or punitive
                            damages arising from your use of the Platform, including but not limited
                            to hardware damage, data loss, or interruption of service.
                        </p>
                    </section>

                    {/* Section 8 */}
                    <section className="mb-10">
                        <h2 className="text-2xl font-semibold mb-4" style={{ color: BRAND_GREEN }}>
                            8. Modifications
                        </h2>
                        <p className="text-[#b0b4bb] leading-relaxed">
                            We reserve the right to modify these terms at any time. Changes will be
                            posted on this page with an updated revision date. Your continued use of
                            the Platform after any changes constitutes acceptance of the updated terms.
                        </p>
                    </section>

                    {/* Section 9 */}
                    <section className="mb-10">
                        <h2 className="text-2xl font-semibold mb-4" style={{ color: BRAND_GREEN }}>
                            9. Termination
                        </h2>
                        <p className="text-[#b0b4bb] leading-relaxed">
                            We reserve the right to restrict access to the Platform for any user who
                            violates these terms, submits fraudulent benchmark data, or engages in
                            any activity that disrupts the Platform&apos;s operation.
                        </p>
                    </section>

                    {/* Contact */}
                    <section className="mt-12 pt-8 border-t border-[#34363c]">
                        <h2 className="text-2xl font-semibold mb-4" style={{ color: BRAND_GREEN }}>
                            Contact
                        </h2>
                        <p className="text-[#b0b4bb] leading-relaxed">
                            For questions about these terms, contact us at{' '}
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
