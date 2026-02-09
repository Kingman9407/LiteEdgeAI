'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

import logo from '../assets/icons/logo1w.png';

export default function Navbar() {
    const [open, setOpen] = useState(false);

    return (
        <nav className="fixed top-4 left-1/2 z-50 w-[95%] max-w-7xl 
            -translate-x-1/2 rounded-2xl 
            bg-black/80 backdrop-blur-xl
            border border-emerald-900/40
            ring-1 ring-emerald-500/20
            shadow-[0_0_30px_rgba(16,185,129,0.15)]">

            <div className="flex items-center justify-between px-4 py-3">

                {/* Logo */}
                <Link href="/" className="flex items-center gap-2">
                    <Image
                        src={logo}
                        alt="LiteEdgeAI Logo"
                        width={45}
                        height={45}
                        priority
                    />
                    <span className="text-2xl font-bold text-white hover:text-emerald-400 transition">
                        LiteEdgeAI
                    </span>
                </Link>

                {/* Desktop Links */}
                <div className="hidden md:flex gap-6 text-gray-300">
                    {["Home", "Ranking", "Benchmark", "About"].map((item) => (
                        <Link
                            key={item}
                            href={`/${item === "Home" ? "" : item.toLowerCase()}`}
                            className="hover:text-emerald-400 transition"
                        >
                            {item}
                        </Link>
                    ))}
                </div>

                {/* Mobile Menu Button */}
                <button
                    className="md:hidden"
                    onClick={() => setOpen(!open)}
                    aria-label="Toggle Menu"
                >
                    <div className="space-y-1">
                        <span className="block h-0.5 w-6 bg-emerald-400"></span>
                        <span className="block h-0.5 w-6 bg-emerald-400"></span>
                        <span className="block h-0.5 w-6 bg-emerald-400"></span>
                    </div>
                </button>
            </div>

            {/* Mobile Menu */}
            {open && (
                <div className="md:hidden border-t border-emerald-900/40 
                    bg-black/95 rounded-b-2xl backdrop-blur-xl">
                    <div className="flex flex-col px-4 py-4 space-y-4 text-gray-300">
                        {["Home", "Ranking", "Benchmark", "About"].map((item) => (
                            <Link
                                key={item}
                                href={`/${item === "Home" ? "" : item.toLowerCase()}`}
                                onClick={() => setOpen(false)}
                                className="hover:text-emerald-400 transition"
                            >
                                {item}
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </nav>
    );
}
