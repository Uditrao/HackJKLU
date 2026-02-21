import Link from "next/link";

export default function FinalCTASection() {
    return (
        <section className="bg-[#1a1a2e] py-24 px-6 relative overflow-hidden">
            {/* Subtle background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <span
                    className="absolute -top-8 -right-8 text-[200px] font-bold text-white opacity-[0.02] select-none leading-none"
                    style={{ fontFamily: "'Noto Sans Devanagari', sans-serif" }}
                >
                    बोली
                </span>
                <span
                    className="absolute -bottom-4 -left-8 text-[160px] font-bold text-[#d4972a] opacity-[0.04] select-none leading-none"
                    style={{ fontFamily: "'Noto Sans Tamil', sans-serif" }}
                >
                    மொழி
                </span>
            </div>

            <div className="relative max-w-3xl mx-auto text-center space-y-8">
                {/* Decorative script */}
                <div
                    className="text-2xl text-[#d4972a] opacity-60"
                    style={{ fontFamily: "'Noto Sans Devanagari', sans-serif" }}
                >
                    ✦ नमस्ते · வணக்கம் · నమస్కారం ✦
                </div>

                <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight">
                    Start reconnecting with Indian languages
                </h2>

                <p className="text-[#9999aa] text-lg leading-relaxed max-w-xl mx-auto">
                    Language is part of who you are. Let&apos;s help you find it again —
                    one word, one situation, one moment at a time.
                </p>

                {/* CTAs */}
                <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                    <Link
                        href="/web/onboarding"
                        className="bg-[#d4972a] text-[#1a1a2e] font-semibold px-8 py-4 rounded-full hover:bg-[#e8b84b] transition-all duration-200 hover:shadow-lg hover:shadow-[#d4972a]/30 hover:scale-105"
                    >
                        Get started — it&apos;s free
                    </Link>
                    <Link
                        href="/web/try-flashcards"
                        className="text-white font-medium px-8 py-4 rounded-full border border-white/20 hover:border-white/50 hover:bg-white/5 transition-all duration-200"
                    >
                        Try it out
                    </Link>
                </div>
            </div>
        </section>
    );
}
