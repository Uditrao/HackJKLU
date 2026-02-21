"use client";

import { motion } from "framer-motion";

export type FlashcardMode = 'text-text' | 'speech-speech-input';

interface ModeSelectionProps {
    onSelect: (mode: FlashcardMode) => void;
}

const MODES = [
    {
        id: 'text-text',
        title: 'Read & Recall',
        description: 'See the word and recall its meaning. Best for building core vocabulary.',
        icon: '📖',
        color: 'from-[#d4972a]/20 to-[#d4972a]/5'
    },
    {
        id: 'speech-speech-input',
        title: 'Listen & Speak',
        description: 'Listen to the word and repeat it. Perfect for mastering pronunciation.',
        icon: '🎧',
        color: 'from-[#d4972a]/10 to-[#1a1a2e]/10'
    }
];

export default function ModeSelection({ onSelect }: ModeSelectionProps) {
    return (
        <div className="min-h-screen bg-[#faf8f3] flex flex-col items-center justify-center p-6 bg-[url('/bg-pattern.svg')] bg-fixed">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-5xl space-y-16 text-center"
            >
                <div className="space-y-6">
                    <h1 className="text-5xl md:text-6xl font-bold text-[#1a1a2e] tracking-tight">
                        Choose how you want to practice
                    </h1>
                    <p className="text-[#6b6b7b] text-xl max-w-2xl mx-auto font-medium">
                        Focus on one skill at a time. Select a mode to begin your session.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-4xl mx-auto">
                    {MODES.map((mode, index) => (
                        <motion.button
                            key={mode.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.1, duration: 0.5 }}
                            onClick={() => onSelect(mode.id as FlashcardMode)}
                            className={`group relative overflow-hidden bg-white p-10 md:p-14 rounded-[3rem] border border-[#e8e0d0] hover:border-[#d4972a] hover:shadow-2xl transition-all duration-500 text-left flex flex-col h-full shadow-lg h-[400px] justify-between`}
                        >
                            <div className={`absolute inset-0 bg-gradient-to-br ${mode.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                            <div className="relative z-10 space-y-8">
                                <div className="text-7xl group-hover:scale-110 transition-transform duration-500 origin-left">{mode.icon}</div>
                                <div className="space-y-4">
                                    <h3 className="text-3xl font-bold text-[#1a1a2e]">{mode.title}</h3>
                                    <p className="text-[#6b6b7b] text-lg leading-relaxed">
                                        {mode.description}
                                    </p>
                                </div>
                            </div>

                            <div className="relative z-10 pt-4">
                                <span className="inline-flex items-center text-[#d4972a] font-bold text-lg group-hover:translate-x-3 transition-transform duration-300">
                                    Start Session <span className="ml-3">→</span>
                                </span>
                            </div>
                        </motion.button>
                    ))}
                </div>
            </motion.div>
        </div>
    );
}
