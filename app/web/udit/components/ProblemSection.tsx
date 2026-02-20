const problems = [
    {
        icon: "📖",
        title: "Taught like textbooks",
        description:
            "Grammar rules, verb conjugations, and vocabulary lists — methods designed for classrooms, not for actual conversation.",
    },
    {
        icon: "🔇",
        title: "Real-life usage is missing",
        description:
            "You learn \"where is the library\" but not how to haggle at a local market or chat with your autorickshaw driver.",
    },
    {
        icon: "🌐",
        title: "Cultural context is ignored",
        description:
            "Language is inseparable from culture. Without context — festivals, food, family — the words remain lifeless.",
    },
];

export default function ProblemSection() {
    return (
        <section id="problem" className="bg-[#f5f0e8] py-24 px-6">
            <div className="max-w-6xl mx-auto">
                {/* Heading */}
                <div className="max-w-2xl mb-16">
                    <p className="text-sm font-semibold text-[#d4972a] uppercase tracking-widest mb-4">
                        The problem
                    </p>
                    <h2 className="text-3xl md:text-4xl font-bold text-[#1a1a2e] leading-tight">
                        Why most language apps don&apos;t work for Indian languages
                    </h2>
                </div>

                {/* Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {problems.map((problem, i) => (
                        <div
                            key={i}
                            className="bg-[#faf8f3] rounded-2xl p-8 border border-[#e8e0d0] hover:border-[#d4972a]/30 hover:shadow-md transition-all duration-300 group"
                        >
                            <span className="text-3xl mb-5 block">{problem.icon}</span>
                            <h3 className="text-lg font-semibold text-[#1a1a2e] mb-3 group-hover:text-[#d4972a] transition-colors duration-200">
                                {problem.title}
                            </h3>
                            <p className="text-[#6b6b7b] leading-relaxed text-sm">
                                {problem.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
