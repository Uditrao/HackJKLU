import Link from "next/link";

const lifestages = [
    { icon: "🏠", label: "Home" },
    { icon: "🏫", label: "School" },
    { icon: "💼", label: "Work" },
    { icon: "🚂", label: "Travel" },
    { icon: "🛒", label: "Market" },
    { icon: "🎉", label: "Festivals" },
];

export default function PhilosophySection() {
    return (
        <section className="bg-[#faf8f3] py-24 px-6">
            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                {/* Left — Content */}
                <div className="space-y-6">
                    <p className="text-sm font-semibold text-[#d4972a] uppercase tracking-widest">
                        Our philosophy
                    </p>
                    <h2 className="text-3xl md:text-4xl font-bold text-[#1a1a2e] leading-tight">
                        Language is learned through living
                    </h2>
                    <div className="space-y-4 text-[#6b6b7b] leading-relaxed">
                        <p>
                            Every stage of life brings a new relationship with language. The
                            words you use at home with family are different from those you use
                            at school, at work, or while travelling.
                        </p>
                        <p>
                            Boli is built around this reality. We teach language the way it
                            actually flows through Indian life — grounded in situations,
                            relationships, and culture.
                        </p>
                    </div>
                    <Link
                        href="/approach"
                        className="inline-flex items-center gap-2 text-[#1a1a2e] font-medium text-sm border-b-2 border-[#d4972a] pb-0.5 hover:text-[#d4972a] transition-colors duration-200"
                    >
                        See our learning approach
                        <svg
                            width="14"
                            height="14"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="mt-0.5"
                        >
                            <path d="M2 7h10M8 3l4 4-4 4" />
                        </svg>
                    </Link>
                </div>

                {/* Right — Life stages grid */}
                <div className="grid grid-cols-3 gap-4">
                    {lifestages.map((stage, i) => (
                        <div
                            key={i}
                            className="bg-[#f5f0e8] rounded-2xl p-6 flex flex-col items-center gap-3 border border-[#e8e0d0] hover:bg-[#fdf3dc] hover:border-[#d4972a]/30 transition-all duration-300 cursor-default"
                        >
                            <span className="text-3xl">{stage.icon}</span>
                            <span className="text-xs font-medium text-[#6b6b7b]">
                                {stage.label}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
