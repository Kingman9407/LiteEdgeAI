// app/contact/page.tsx  (or pages/contact.tsx if using Pages Router)

import Link from 'next/link';

export default function ContactPage() {
    return (
        <main className="min-h-screen bg-[#0f1014] text-[#f2f3f5]">
            <section className="max-w-3xl mx-auto px-6 pt-32 pb-24">
                {/* Heading */}
                <h1 className="text-4xl md:text-5xl font-extrabold mb-6">
                    Contact Us
                </h1>

                {/* Description */}
                <p className="text-[#b0b4bb] text-lg mb-10">
                    Have questions about GPU benchmarks, methodology, or want to collaborate?
                    Reach out — we’d love to hear from hardware enthusiasts, developers,
                    and researchers.
                </p>

                {/* Contact Info */}
                <div className="space-y-6 text-sm">
                    <div>
                        <p className="text-[#8fae9b] font-medium mb-1">Email</p>
                        <a
                            href="mailto:contact@liteedgeai.com"
                            className="text-[#b0b4bb] hover:text-[#4fbf8a] transition"
                        >
                            contact@liteedgeai.com
                        </a>
                    </div>

                    <div>
                        <p className="text-[#8fae9b] font-medium mb-1">GitHub</p>
                        <a
                            href="https://github.com/liteedgeai"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#b0b4bb] hover:text-[#4fbf8a] transition"
                        >
                            github.com/liteedgeai
                        </a>
                    </div>

                    <div>
                        <p className="text-[#8fae9b] font-medium mb-1">Community</p>
                        <p className="text-[#b0b4bb]">
                            Join discussions, share results, and suggest benchmarks through
                            our community channels.
                        </p>
                    </div>
                </div>

                {/* Back link */}
                <div className="mt-12">
                    <Link
                        href="/"
                        className="text-sm text-[#8fae9b] hover:underline"
                    >
                        ← Back to home
                    </Link>
                </div>
            </section>
        </main>
    );
}