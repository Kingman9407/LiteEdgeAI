'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import logo from '../assets/icons/logo1w.png';

export default function Navbar() {
    const [open, setOpen] = useState(false);

    return (
        <nav
            className="
        fixed top-4 left-1/2 z-50 w-[95%] max-w-7xl
        -translate-x-1/2 rounded-xl
        bg-[#18191c]
        border border-[#34363c]
        transition-colors
      "
        >
            <div className="flex items-center justify-between px-4 py-3">

                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 group">
                    <Image src={logo} alt="LiteEdgeAI Logo" width={40} height={40} priority />
                    <span
                        className="text-xl font-semibold text-[#f2f3f5] hover:text-[#4fbf8a] transition-colors"
                    >
                        LiteEdgeAI
                    </span>
                </Link>

                {/* Desktop Links */}
                <div className="hidden md:flex gap-6 text-[#b0b4bb]">
                    {['Home', 'Ranking', 'Benchmark', 'Photo'].map(item => (
                        <Link
                            key={item}
                            href={`/${item === 'Home' ? '' : item.toLowerCase()}`}
                            className="text-[#b0b4bb] hover:text-[#4fbf8a] transition-colors"
                        >
                            {item}
                        </Link>
                    ))}
                </div>

                {/* Mobile Toggle */}
                <button
                    className="md:hidden"
                    onClick={() => setOpen(!open)}
                    aria-label="Toggle menu"
                >
                    <div className="space-y-1">
                        {[0, 1, 2].map(i => (
                            <span
                                key={i}
                                className="block h-0.5 w-6 bg-[#b0b4bb] hover:bg-[#4fbf8a] transition-colors"
                            />
                        ))}
                    </div>
                </button>
            </div>

            {/* Mobile Menu */}
            {open && (
                <div className="md:hidden border-t border-[#34363c] bg-[#232428] rounded-b-xl">
                    <div className="flex flex-col px-4 py-4 space-y-4 text-[#b0b4bb]">
                        {['Home', 'Ranking', 'Benchmark', 'Photo'].map(item => (
                            <Link
                                key={item}
                                href={`/${item === 'Home' ? '' : item.toLowerCase()}`}
                                onClick={() => setOpen(false)}
                                className="text-[#b0b4bb] hover:text-[#4fbf8a] transition-colors"
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
