import Link from "next/link";

const features = [
    {
        icon: "🗂️",
        title: "Flashcard Learning",
        description:
            "Calm, focused vocabulary learning with real words you'll actually use in daily life — not dictionary filler.",
        cta: "View flashcards",
        href: "/flashcards",
        comingSoon: false,
    },
    {
        icon: "🌆",
        title: "Real-Life Scenarios",
        description:
            "Markets, greetings, directions, daily conversations. Learn language inside the situations where it naturally lives.",
        cta: "Explore scenarios",
        href: "/scenarios",
        comingSoon: false,
    },
    {
        icon: "👥",
        title: "Social Learning",
        description:
            "Learn alongside others in shared practice spaces. Build confidence through community and real conversation.",
        cta: "Coming soon",
        href: undefined,
        comingSoon: true,
    },
];

export default function FeaturesSection() {
    return (
        <section id="features" className="bg-[#f5f0e8] py-24 px-6">
            <div className="max-w-6xl mx-auto">
                {/* Heading */}
                <div className="text-center max-w-xl mx-auto mb-16">
                    <p className="text-sm font-semibold text-[#d4972a] uppercase tracking-widest mb-4">
                        What we offer
                    </p>
                    <h2 className="text-3xl md:text-4xl font-bold text-[#1a1a2e] leading-tight">
                        A thoughtful way to learn
                    </h2>
                </div>

                {/* Feature cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {features.map((feature, i) => (
                        <div
                            key={i}
                            className={`relative bg-[#faf8f3] rounded-3xl p-8 border flex flex-col gap-5 transition-all duration-300 hover:shadow-lg ${feature.comingSoon
                                    ? "border-[#e8e0d0] opacity-80"
                                    : "border-[#e8e0d0] hover:border-[#d4972a]/40"
                                }`}
                        >
                            {feature.comingSoon && (
                                <span className="absolute top-5 right-5 text-[10px] font-semibold text-[#d4972a] bg-[#fdf3dc] px-2.5 py-1 rounded-full uppercase tracking-wider">
                                    Coming soon
                                </span>
                            )}

                            <span className="text-4xl">{feature.icon}</span>

                            <div className="flex-1 space-y-3">
                                <h3 className="text-xl font-semibold text-[#1a1a2e]">
                                    {feature.title}
                                </h3>
                                <p className="text-[#6b6b7b] text-sm leading-relaxed">
                                    {feature.description}
                                </p>
                            </div>

                            {feature.comingSoon ? (
                                <span className="inline-flex items-center gap-2 text-sm font-medium text-[#6b6b7b] cursor-not-allowed select-none">
                                    {feature.cta}
                                </span>
                            ) : (
                                <Link
                                    href={feature.href!}
                                    className="inline-flex items-center gap-2 text-sm font-medium text-[#1a1a2e] hover:text-[#d4972a] transition-colors duration-200"
                                >
                                    {feature.cta}
                                    <svg
                                        width="14"
                                        height="14"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                    >
                                        <path d="M2 7h10M8 3l4 4-4 4" />
                                    </svg>
                                </Link>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
