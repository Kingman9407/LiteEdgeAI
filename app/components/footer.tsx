import Link from 'next/link';
import Image from 'next/image';
import logo from '../assets/icons/logo1w.png';

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
                            LiteEdgeAI delivers independent, real-world benchmarks focused exclusively on GPU performance across all devices.
                            Compare integrated and discrete GPUs using inference speed, throughput, power efficiency, and
                        </p>

                        {/* Social Links */}
                        {/* Social Links */}
                        <div className="flex gap-4">
                            {/* GitHub */}


                            {/* Discord */}
                            <a
                                href="https://discord.gg/teTMMXC7"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#b0b4bb] hover:text-[#4fbf8a] transition"
                                aria-label="Discord"
                            >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M20.317 4.369a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.211.375-.444.864-.608 1.249a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.249.077.077 0 00-.079-.037 19.736 19.736 0 00-4.885 1.515.069.069 0 00-.032.027C.533 9.046-.319 13.58.099 18.057a.082.082 0 00.031.056 19.9 19.9 0 005.993 3.03.077.077 0 00.084-.027c.461-.63.873-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128c.125-.094.25-.192.368-.291a.074.074 0 01.077-.01c3.927 1.793 8.18 1.793 12.061 0a.074.074 0 01.078.009c.118.099.243.198.369.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.106c.36.699.772 1.364 1.225 1.994a.076.076 0 00.084.028 19.876 19.876 0 006.002-3.03.077.077 0 00.032-.055c.5-5.177-.838-9.673-3.548-13.66a.061.061 0 00-.031-.028zM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.418 2.157-2.418 1.21 0 2.176 1.095 2.157 2.418 0 1.334-.955 2.419-2.157 2.419zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.418 2.157-2.418 1.21 0 2.176 1.095 2.157 2.418 0 1.334-.946 2.419-2.157 2.419z" />
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
                            <li><Link href="/working" className="text-[#b0b4bb] hover:text-[#4fbf8a] transition">Benchmark Methodology</Link></li>
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
