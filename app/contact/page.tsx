import Navbar from '../components/navbar';
import Footer from '../components/footer';

const BRAND_GREEN = '#4fbf8a';

export const metadata = {
    title: 'Contact — LiteEdgeAI',
    description: 'Get in touch with the LiteEdgeAI team.',
    alternates: {
        canonical: '/contact',
    },
    openGraph: {
        title: 'Contact — LiteEdgeAI',
        description: 'Get in touch with the LiteEdgeAI team.',
        url: 'https://liteedgeai.com/contact',
        type: 'website',
        images: ['/og-image.png'],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Contact — LiteEdgeAI',
        description: 'Get in touch with the LiteEdgeAI team.',
        images: ['/og-image.png'],
    },
};

export default function ContactPage() {
    return (
        <main className="min-h-screen bg-[#0a0b0d] text-[#f2f3f5]">
            <Navbar />

            <div className="pt-32 pb-20 px-4">
                <div className="max-w-4xl mx-auto">

                    {/* Heading */}
                    <h1 className="text-4xl font-bold mb-2">Contact Us</h1>
                    <p className="text-[#9ca0a8] mb-12">
                        Questions, feedback, or collaboration ideas
                    </p>

                    {/* Main Container Box */}
                    <div className="bg-[#13141a] border border-[#34363c] rounded-lg p-8 md:p-12">

                        {/* Intro */}
                        <section className="mb-12">
                            <p className="text-[#b0b4bb] leading-relaxed">
                                LiteEdgeAI is built for developers, hardware enthusiasts, and researchers
                                exploring real world AI performance. Whether you have questions about
                                benchmarking methodology, want to collaborate on edge AI projects, or
                                have ideas to improve the platform we'd love to hear from you.
                            </p>
                        </section>

                        {/* Contact Form */}
                        <section className="mb-12">
                            <h2
                                className="text-2xl font-semibold mb-6"
                                style={{ color: BRAND_GREEN }}
                            >
                                Send us a message
                            </h2>
                            <form
                                action="https://formsubmit.co/contact@liteedgeai.com"
                                method="POST"
                                className="space-y-6"
                            >
                                {/* Honeypot */}
                                <input type="text" name="_honey" style={{ display: 'none' }} />

                                {/* Disable Captcha */}
                                <input type="hidden" name="_captcha" value="false" />

                                {/* Custom Thank You Page (optional) */}
                                <input type="hidden" name="_next" value="https://liteedgeai.com/contact?success=true" />

                                {/* Name */}
                                <div>
                                    <label htmlFor="name" className="block text-sm font-medium mb-2">
                                        Name
                                    </label>
                                    <input
                                        type="text"
                                        id="name"
                                        name="name"
                                        required
                                        className="w-full px-4 py-3 bg-[#0a0b0d] border border-[#34363c] rounded-lg focus:outline-none focus:border-[#4fbf8a] text-[#f2f3f5] transition-colors"
                                        placeholder="Your name"
                                    />
                                </div>

                                {/* Email */}
                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium mb-2">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        id="email"
                                        name="email"
                                        required
                                        className="w-full px-4 py-3 bg-[#0a0b0d] border border-[#34363c] rounded-lg focus:outline-none focus:border-[#4fbf8a] text-[#f2f3f5] transition-colors"
                                        placeholder="your@email.com"
                                    />
                                </div>

                                {/* Subject */}
                                <div>
                                    <label htmlFor="subject" className="block text-sm font-medium mb-2">
                                        Subject
                                    </label>
                                    <input
                                        type="text"
                                        id="subject"
                                        name="_subject"
                                        required
                                        className="w-full px-4 py-3 bg-[#0a0b0d] border border-[#34363c] rounded-lg focus:outline-none focus:border-[#4fbf8a] text-[#f2f3f5] transition-colors"
                                        placeholder="What's this about?"
                                    />
                                </div>

                                {/* Message */}
                                <div>
                                    <label htmlFor="message" className="block text-sm font-medium mb-2">
                                        Message
                                    </label>
                                    <textarea
                                        id="message"
                                        name="message"
                                        required

                                        className="w-full px-4 py-3 bg-[#0a0b0d] border border-[#34363c] rounded-lg focus:outline-none focus:border-[#4fbf8a] text-[#f2f3f5] transition-colors resize-none"
                                        placeholder="Tell us more..."
                                    ></textarea>
                                </div>

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    className="w-full px-6 py-3 bg-[#4fbf8a] hover:bg-[#45ab7d] text-white font-semibold rounded-lg transition-colors"
                                >
                                    Send Message
                                </button>
                            </form>
                        </section>

                        {/* Divider */}
                        <div className="border-t border-[#34363c] pt-8">

                            {/* Other Contact Methods */}
                            <div className="space-y-8">
                                <h2
                                    className="text-2xl font-semibold mb-6"
                                    style={{ color: BRAND_GREEN }}
                                >
                                    Other ways to connect
                                </h2>

                                <div className="grid md:grid-cols-2 gap-6">
                                    {/* Email */}
                                    <div className="p-4 bg-[#0a0b0d] border border-[#34363c] rounded-lg">
                                        <h3 className="font-semibold mb-2">Direct Email</h3>
                                        <p className="text-sm text-[#9ca0a8] mb-2">
                                            For urgent inquiries
                                        </p>
                                        <a
                                            href="mailto:contact@liteedgeai.com"
                                            className="text-[#4fbf8a] hover:underline text-sm"
                                        >
                                            contact@liteedgeai.com
                                        </a>
                                    </div>

                                    {/* Discord */}
                                    <div className="p-4 bg-[#0a0b0d] border border-[#34363c] rounded-lg">
                                        <h3 className="font-semibold mb-2">Discord</h3>
                                        <p className="text-sm text-[#9ca0a8] mb-4">
                                            Join discussions, share benchmarks, and connect with the community
                                        </p>

                                        <a
                                            href="https://discord.gg/mUnmrDKVcf"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center justify-center px-5 py-2.5 bg-[#4fbf8a] hover:bg-[#45ab7d] text-white text-sm font-semibold rounded-lg transition-colors"
                                        >
                                            Join Discord
                                        </a>
                                    </div>
                                </div>

                                {/* Community */}
                                <div className="p-4 bg-[#0a0b0d] border border-[#34363c] rounded-lg">
                                    <h3 className="font-semibold mb-2">Community</h3>
                                    <p className="text-sm text-[#9ca0a8]">
                                        Join the LiteEdgeAI community to share benchmark results,
                                        discuss hardware choices, and collaborate on edge AI ideas.
                                        Community channels and discussions are continuously evolving.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Footer Note */}
                        <div className="mt-8 pt-6 border-t border-[#34363c]">
                            <p className="text-sm text-[#9ca0a8] text-center">
                                We typically respond within a few days. Thanks for supporting open,
                                transparent AI benchmarking.
                            </p>
                        </div>

                    </div>

                </div>
            </div>

            <Footer />
        </main>
    );
}