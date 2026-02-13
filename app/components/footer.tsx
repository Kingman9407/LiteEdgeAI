import Link from 'next/link';
import Image from 'next/image';
import logo from '../assets/icons/logo1w.png';

// Optional: force static generation
export const dynamic = 'force-static';

export default function Footer() {
    return (
        <footer className="bg-[#18191c] border-t border-[#34363c]">
            <div className="max-w-7xl mx-auto px-4 py-12">

                {/* Main Footer Content */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">

                    {/* Brand Section */}
                    <div className="col-span-1 md:col-span-2">
                        <Link href="/" className="flex items-center gap-2 mb-4 w-fit">
                            <Image
                                src={logo}
                                alt="LiteEdgeAI hardware benchmarking platform logo"
                                width={40}
                                height={40}
                                priority={false}
                            />
                            <span className="text-xl font-semibold text-[#f2f3f5]">
                                LiteEdgeAI
                            </span>
                        </Link>

                        <p className="text-[#b0b4bb] text-sm max-w-md mb-4">
                            Independent rankings and benchmarks for edge AI hardware.
                            Compare NPUs, GPUs, and SoCs across real-world edge AI workloads,
                            power efficiency, and performance metrics.
                        </p>

                        {/* Social Links */}
                        <div className="flex gap-4">
                            <a
                                href="https://github.com/liteedgeai"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#b0b4bb] hover:text-[#4fbf8a] transition"
                                aria-label="GitHub"
                            >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                                </svg>
                            </a>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="col-span-1" aria-labelledby="footer-navigation">
                        <h3 id="footer-navigation" className="text-[#f2f3f5] font-semibold mb-4">
                            Navigation
                        </h3>
                        <ul className="space-y-3 text-sm">
                            <li><Link href="/" className="text-[#b0b4bb] hover:text-[#4fbf8a] transition">Home</Link></li>
                            <li><Link href="/ranking" className="text-[#b0b4bb] hover:text-[#4fbf8a] transition">Hardware Rankings</Link></li>
                            <li><Link href="/benchmark" className="text-[#b0b4bb] hover:text-[#4fbf8a] transition">Hardware Benchmarks</Link></li>
                            <li><Link href="/about" className="text-[#b0b4bb] hover:text-[#4fbf8a] transition">About LiteEdgeAI</Link></li>
                        </ul>
                    </nav>

                    {/* Resources */}
                    <nav className="col-span-1" aria-labelledby="footer-resources">
                        <h3 id="footer-resources" className="text-[#f2f3f5] font-semibold mb-4">
                            Resources
                        </h3>
                        <ul className="space-y-3 text-sm">
                            <li><Link href="/documentation" className="text-[#b0b4bb] hover:text-[#4fbf8a] transition">Benchmark Methodology</Link></li>
                            <li><Link href="/credits" className="text-[#b0b4bb] hover:text-[#4fbf8a] transition">Credits</Link></li>
                        </ul>
                    </nav>
                </div>

                {/* Bottom Bar */}
                <div className="pt-8 border-t border-[#34363c]">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <p className="text-[#b0b4bb] text-sm">
                            © {new Date().getFullYear()} LiteEdgeAI. All rights reserved.
                        </p>
                        <nav className="flex gap-6 text-sm" aria-label="Legal">
                            <Link href="/privacy" className="text-[#b0b4bb] hover:text-[#4fbf8a] transition">Privacy Policy</Link>
                            <Link href="/terms" className="text-[#b0b4bb] hover:text-[#4fbf8a] transition">Terms of Service</Link>
                            <Link href="/contact" className="text-[#b0b4bb] hover:text-[#4fbf8a] transition">Contact</Link>
                        </nav>
                    </div>
                </div>

            </div>
        </footer>
    );
}
