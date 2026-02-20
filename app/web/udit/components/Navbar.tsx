"use client";

import { useState } from "react";
import Link from "next/link";

const navLinks = [
    { label: "Features", href: "#features" },
    { label: "Languages", href: "#languages" },
    { label: "How it works", href: "#how-it-works" },
];

export default function Navbar() {
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <header className="sticky top-0 z-50 bg-[#faf8f3]/95 backdrop-blur-sm border-b border-[#e8e0d0]">
            <nav className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 group">
                    <span className="text-2xl font-bold text-[#1a1a2e] tracking-tight">
                        Boli
                    </span>
                    <span
                        className="text-sm font-medium text-[#d4972a] script-display"
                        style={{ fontFamily: "'Noto Sans Devanagari', sans-serif" }}
                    >
                        बोली
                    </span>
                </Link>

                {/* Desktop links */}
                <div className="hidden md:flex items-center gap-8">
                    {navLinks.map((link) => (
                        <Link
                            key={link.label}
                            href={link.href}
                            className="text-[#6b6b7b] hover:text-[#1a1a2e] text-sm font-medium transition-colors duration-200"
                        >
                            {link.label}
                        </Link>
                    ))}
                    <Link
                        href="/get-started"
                        className="bg-[#1a1a2e] text-white text-sm font-medium px-5 py-2.5 rounded-full hover:bg-[#2d2d44] transition-colors duration-200"
                    >
                        Get Started
                    </Link>
                </div>

                {/* Mobile menu button */}
                <button
                    className="md:hidden p-2 text-[#1a1a2e]"
                    onClick={() => setMenuOpen(!menuOpen)}
                    aria-label="Toggle menu"
                >
                    {menuOpen ? (
                        <svg
                            width="24"
                            height="24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <path d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    ) : (
                        <svg
                            width="24"
                            height="24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <path d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    )}
                </button>
            </nav>

            {/* Mobile menu */}
            {menuOpen && (
                <div className="md:hidden bg-[#faf8f3] border-t border-[#e8e0d0] px-6 py-4 flex flex-col gap-4">
                    {navLinks.map((link) => (
                        <Link
                            key={link.label}
                            href={link.href}
                            className="text-[#6b6b7b] hover:text-[#1a1a2e] text-sm font-medium transition-colors"
                            onClick={() => setMenuOpen(false)}
                        >
                            {link.label}
                        </Link>
                    ))}
                    <Link
                        href="/get-started"
                        className="bg-[#1a1a2e] text-white text-sm font-medium px-5 py-2.5 rounded-full text-center hover:bg-[#2d2d44] transition-colors"
                        onClick={() => setMenuOpen(false)}
                    >
                        Get Started
                    </Link>
                </div>
            )}
        </header>
    );
}
