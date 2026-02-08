'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function Navbar() {
    const [open, setOpen] = useState(false);

    return (
        <nav className="fixed top-4 left-1/2 z-50 w-[95%] max-w-7xl -translate-x-1/2 rounded-2xl border border-gray-800 bg-[#0B0F19]/80 backdrop-blur-lg shadow-lg">
            <div className="flex items-center justify-between px-4 py-3">
                {/* Logo */}
                <Link
                    href="/"
                    className="text-xl font-bold text-white hover:text-indigo-400 transition"
                >
                    MyApp
                </Link>

                {/* Desktop Links */}
                <div className="hidden md:flex gap-6 text-gray-300">
                    <Link href="/" className="hover:text-indigo-400 transition">
                        Home
                    </Link>
                    <Link href="/features" className="hover:text-indigo-400 transition">
                        Features
                    </Link>
                    <Link href="/pricing" className="hover:text-indigo-400 transition">
                        Pricing
                    </Link>
                    <Link href="/benchmark" className="hover:text-indigo-400 transition">
                        Benchmark
                    </Link>
                </div>

                {/* Mobile Menu Button */}
                <button
                    className="md:hidden"
                    onClick={() => setOpen(!open)}
                    aria-label="Toggle Menu"
                >
                    <div className="space-y-1">
                        <span className="block h-0.5 w-6 bg-gray-300"></span>
                        <span className="block h-0.5 w-6 bg-gray-300"></span>
                        <span className="block h-0.5 w-6 bg-gray-300"></span>
                    </div>
                </button>
            </div>

            {/* Mobile Menu */}
            {open && (
                <div className="md:hidden border-t border-gray-800 bg-[#0E1325]/90 rounded-b-2xl">
                    <div className="flex flex-col px-4 py-4 space-y-4 text-gray-300">
                        <Link href="/" onClick={() => setOpen(false)} className="hover:text-indigo-400">
                            Home
                        </Link>
                        <Link href="/features" onClick={() => setOpen(false)} className="hover:text-indigo-400">
                            Features
                        </Link>
                        <Link href="/pricing" onClick={() => setOpen(false)} className="hover:text-indigo-400">
                            Pricing
                        </Link>
                        <Link href="/contact" onClick={() => setOpen(false)} className="hover:text-indigo-400">
                            Contact
                        </Link>
                    </div>
                </div>
            )}
        </nav>
    );
}
