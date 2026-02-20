const languages = [
    {
        script: "Aa",
        name: "English",
        speakers: "1.5B+ speakers",
        font: "'Inter', sans-serif",
    },
    {
        script: "हिन्दी",
        name: "Hindi",
        speakers: "600M+ speakers",
        font: "'Noto Sans Devanagari', sans-serif",
    },
    {
        script: "ગુજરાતી",
        name: "Gujarati",
        speakers: "60M+ speakers",
        font: "'Noto Sans Gujarati', sans-serif",
    },
    {
        script: "ਪੰਜਾਬੀ",
        name: "Punjabi",
        speakers: "125M+ speakers",
        font: "'Noto Sans Gurmukhi', sans-serif",
    },
    {
        script: "मराठी",
        name: "Marathi",
        speakers: "90M+ speakers",
        font: "'Noto Sans Devanagari', sans-serif",
    },
    {
        script: "తెలుగు",
        name: "Telugu",
        speakers: "95M+ speakers",
        font: "'Noto Sans Telugu', sans-serif",
    },
];

export default function LanguagesSection() {
    return (
        <section id="languages" className="bg-[#faf8f3] py-24 px-6">
            <div className="max-w-6xl mx-auto">
                {/* Heading */}
                <div className="text-center max-w-xl mx-auto mb-16">
                    <p className="text-sm font-semibold text-[#d4972a] uppercase tracking-widest mb-4">
                        Languages
                    </p>
                    <h2 className="text-3xl md:text-4xl font-bold text-[#1a1a2e] leading-tight">
                        Languages we support
                    </h2>
                </div>

                {/* Language grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
                    {languages.map((lang, i) => (
                        <div
                            key={i}
                            className="group bg-[#f5f0e8] rounded-2xl p-6 flex flex-col items-center gap-3 border border-[#e8e0d0] hover:bg-[#fdf3dc] hover:border-[#d4972a]/40 hover:shadow-md transition-all duration-300 cursor-default"
                        >
                            <span
                                className="text-4xl font-bold text-[#1a1a2e] group-hover:text-[#d4972a] transition-colors duration-300"
                                style={{ fontFamily: lang.font }}
                            >
                                {lang.script}
                            </span>
                            <div className="text-center">
                                <p className="text-sm font-semibold text-[#1a1a2e]">
                                    {lang.name}
                                </p>
                                <p className="text-[11px] text-[#6b6b7b] mt-0.5">
                                    {lang.speakers}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Coming soon note */}
                <div className="flex items-center justify-center gap-3">
                    <div className="h-px bg-[#e8e0d0] flex-1 max-w-24" />
                    <p className="text-sm text-[#6b6b7b] flex items-center gap-2">
                        <span className="text-[#d4972a]">✦</span>
                        More languages coming soon
                        <span className="text-[#d4972a]">✦</span>
                    </p>
                    <div className="h-px bg-[#e8e0d0] flex-1 max-w-24" />
                </div>
            </div>
        </section>
    );
}
