import Link from "next/link";

const scripts = [
    { text: "Aa", lang: "English" },
    { text: "हिन्दी", lang: "Hindi" },
    { text: "ગુજરાતી", lang: "Gujarati" },
    { text: "ਪੰਜਾਬੀ", lang: "Punjabi" },
    { text: "मराठी", lang: "Marathi" },
    { text: "తెలుగు", lang: "Telugu" },
];

export default function HeroSection() {
    return (
        <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-[#faf8f3]">
            {/* Subtle background pattern */}
            <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage: `radial-gradient(circle at 2px 2px, #1a1a2e 1px, transparent 0)`,
                    backgroundSize: "40px 40px",
                }}
            />

            {/* Floating script decorations */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <span
                    className="absolute top-20 right-8 md:right-20 text-6xl md:text-8xl font-bold text-[#d4972a] opacity-[0.07] select-none"
                    style={{ fontFamily: "'Noto Sans Devanagari', sans-serif" }}
                >
                    भाषा
                </span>
                <span
                    className="absolute bottom-32 left-4 md:left-16 text-5xl md:text-7xl font-bold text-[#d4972a] opacity-[0.06] select-none"
                    style={{ fontFamily: "'Noto Sans Gujarati', sans-serif" }}
                >
                    ભાષા
                </span>
                <span
                    className="absolute top-1/2 right-4 md:right-8 text-4xl md:text-6xl font-bold text-[#1a1a2e] opacity-[0.04] select-none"
                    style={{ fontFamily: "'Noto Sans Telugu', sans-serif" }}
                >
                    భాష
                </span>
            </div>

            <div className="relative max-w-6xl mx-auto px-6 py-20 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                {/* Left — Text content */}
                <div className="space-y-8">
                    {/* Native scripts strip */}
                    <div className="flex flex-wrap gap-3">
                        {scripts.map((s) => (
                            <span
                                key={s.lang}
                                className="text-sm font-medium text-[#d4972a] bg-[#fdf3dc] px-3 py-1 rounded-full"
                                style={{ fontFamily: "'Noto Sans Devanagari', sans-serif" }}
                                title={s.lang}
                            >
                                {s.text}
                            </span>
                        ))}
                    </div>

                    {/* Headline */}
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#1a1a2e] leading-[1.1] tracking-tight">
                        Learn Indian languages the way they are{" "}
                        <span className="text-[#d4972a]">actually spoken</span>
                    </h1>

                    {/* Subheadline */}
                    <p className="text-lg md:text-xl text-[#6b6b7b] leading-relaxed max-w-xl">
                        Not through memorization, but through everyday life, culture, and
                        real situations.
                    </p>

                    {/* CTAs */}
                    <div className="flex flex-wrap gap-4">
                        <Link
                            href="/explore"
                            className="inline-flex items-center gap-2 bg-[#1a1a2e] text-white font-medium px-7 py-3.5 rounded-full hover:bg-[#2d2d44] transition-all duration-200 hover:shadow-lg hover:shadow-[#1a1a2e]/20"
                        >
                            Explore the platform
                            <svg
                                width="16"
                                height="16"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                className="mt-0.5"
                            >
                                <path d="M3 8h10M9 4l4 4-4 4" />
                            </svg>
                        </Link>
                        <Link
                            href="#how-it-works"
                            className="inline-flex items-center gap-2 text-[#1a1a2e] font-medium px-7 py-3.5 rounded-full border border-[#e8e0d0] hover:border-[#1a1a2e] hover:bg-[#f5f0e8] transition-all duration-200"
                        >
                            See how it works
                        </Link>
                    </div>
                </div>

                {/* Right — Illustration */}
                <div className="relative hidden lg:flex items-center justify-center">
                    <HeroIllustration />
                </div>
            </div>
        </section>
    );
}

function HeroIllustration() {
    return (
        <div className="relative w-full max-w-md aspect-square">
            {/* Main card */}
            <div className="absolute inset-8 bg-white rounded-3xl shadow-xl border border-[#e8e0d0] flex flex-col items-center justify-center gap-6 p-8">
                {/* Script circle */}
                <div className="w-24 h-24 rounded-full bg-[#fdf3dc] border-2 border-[#d4972a]/20 flex items-center justify-center">
                    <span
                        className="text-4xl text-[#d4972a] font-bold"
                        style={{ fontFamily: "'Noto Sans Devanagari', sans-serif" }}
                    >
                        अ
                    </span>
                </div>
                {/* Word card */}
                <div className="w-full bg-[#faf8f3] rounded-2xl p-4 text-center border border-[#e8e0d0]">
                    <p
                        className="text-2xl font-bold text-[#1a1a2e] mb-1"
                        style={{ fontFamily: "'Noto Sans Devanagari', sans-serif" }}
                    >
                        नमस्ते
                    </p>
                    <p className="text-sm text-[#6b6b7b]">Namaste · Hello / Greetings</p>
                </div>
                {/* Scenario pill */}
                <div className="flex items-center gap-2 bg-[#1a1a2e] text-white text-xs font-medium px-4 py-2 rounded-full">
                    <span>🏠</span>
                    <span>At home · Daily greeting</span>
                </div>
            </div>

            {/* Floating cards */}
            <div className="absolute -top-2 -right-2 bg-white rounded-2xl shadow-lg border border-[#e8e0d0] p-3 flex items-center gap-2">
                <span className="text-xl">🎯</span>
                <div>
                    <p className="text-xs font-semibold text-[#1a1a2e]">5 new words</p>
                    <p className="text-[10px] text-[#6b6b7b]">today's session</p>
                </div>
            </div>

            <div className="absolute -bottom-2 -left-2 bg-white rounded-2xl shadow-lg border border-[#e8e0d0] p-3 flex items-center gap-2">
                <span className="text-xl">🌸</span>
                <div>
                    <p className="text-xs font-semibold text-[#1a1a2e]">Real context</p>
                    <p className="text-[10px] text-[#6b6b7b]">market · home · travel</p>
                </div>
            </div>
        </div>
    );
}
