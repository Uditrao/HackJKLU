import Link from "next/link";

const footerLinks = {
    Product: [
        { label: "Features", href: "#features" },
        { label: "Languages", href: "#languages" },
        { label: "How it works", href: "#how-it-works" },
    ],
    Company: [
        { label: "About", href: "/about" },
        { label: "Contact", href: "/contact" },
    ],
};

export default function Footer() {
    return (
        <footer className="bg-[#faf8f3] border-t border-[#e8e0d0] py-16 px-6">
            <div className="max-w-6xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
                    {/* Brand */}
                    <div className="md:col-span-2 space-y-4">
                        <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold text-[#1a1a2e]">Boli</span>
                            <span
                                className="text-sm font-medium text-[#d4972a]"
                                style={{ fontFamily: "'Noto Sans Devanagari', sans-serif" }}
                            >
                                बोली
                            </span>
                        </div>
                        <p className="text-sm text-[#6b6b7b] leading-relaxed max-w-xs">
                            Learn Indian languages the way they are actually spoken — through
                            life, culture, and real situations.
                        </p>
                        {/* Scripts row */}
                        <div
                            className="flex flex-wrap gap-2 text-sm text-[#d4972a] opacity-70"
                            style={{ fontFamily: "'Noto Sans Devanagari', sans-serif" }}
                        >
                            English · हिन्दी · ગુજરાતી · ਪੰਜਾਬੀ · मराठी · తెలుగు
                        </div>
                    </div>

                    {/* Links */}
                    {Object.entries(footerLinks).map(([group, links]) => (
                        <div key={group}>
                            <p className="text-xs font-semibold text-[#1a1a2e] uppercase tracking-widest mb-4">
                                {group}
                            </p>
                            <ul className="space-y-3">
                                {links.map((link) => (
                                    <li key={link.label}>
                                        <Link
                                            href={link.href}
                                            className="text-sm text-[#6b6b7b] hover:text-[#1a1a2e] transition-colors duration-200"
                                        >
                                            {link.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                {/* Bottom bar */}
                <div className="pt-8 border-t border-[#e8e0d0] flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-xs text-[#6b6b7b]" suppressHydrationWarning>
                        © {new Date().getFullYear()} Boli. All rights reserved.
                    </p>
                    <p className="text-xs text-[#6b6b7b]">
                        Made with care for Indian languages 🇮🇳
                    </p>
                </div>
            </div>
        </footer>
    );
}
