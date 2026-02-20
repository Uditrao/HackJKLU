const steps = [
    {
        number: "01",
        title: "Choose a language",
        description:
            "Pick from Hindi, Tamil, Telugu, Kannada, or Marathi — and start where you feel most drawn.",
        icon: "🌐",
    },
    {
        number: "02",
        title: "Learn through words and situations",
        description:
            "Work through vocabulary in real context. Each word appears inside a situation where it's naturally used.",
        icon: "📚",
    },
    {
        number: "03",
        title: "Practice in real-life contexts",
        description:
            "From market conversations to family greetings — apply what you know in guided, realistic practice.",
        icon: "🎯",
    },
];

export default function HowItWorksSection() {
    return (
        <section id="how-it-works" className="bg-[#f5f0e8] py-24 px-6">
            <div className="max-w-6xl mx-auto">
                {/* Heading */}
                <div className="text-center max-w-xl mx-auto mb-20">
                    <p className="text-sm font-semibold text-[#d4972a] uppercase tracking-widest mb-4">
                        How it works
                    </p>
                    <h2 className="text-3xl md:text-4xl font-bold text-[#1a1a2e] leading-tight">
                        Simple, thoughtful, effective
                    </h2>
                </div>

                {/* Steps */}
                <div className="relative">
                    {/* Connector line (desktop) */}
                    <div className="hidden md:block absolute top-12 left-[16.66%] right-[16.66%] h-px bg-[#e8e0d0] z-0" />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative z-10">
                        {steps.map((step, i) => (
                            <div key={i} className="flex flex-col items-center md:items-start text-center md:text-left gap-6">
                                {/* Step number bubble */}
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-[#1a1a2e] text-white flex items-center justify-center font-bold text-sm shrink-0">
                                        {step.number}
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 justify-center md:justify-start">
                                        <span className="text-xl">{step.icon}</span>
                                        <h3 className="text-lg font-semibold text-[#1a1a2e]">
                                            {step.title}
                                        </h3>
                                    </div>
                                    <p className="text-[#6b6b7b] text-sm leading-relaxed">
                                        {step.description}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
