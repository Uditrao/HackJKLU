"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import ModeSelection, { FlashcardMode } from "./ModeSelection";
import { motion } from "framer-motion";

export type Flashcard = {
    id: string;
    learningText: string;
    supportText: string;
    audioPrompt: string | null;
    context?: string;
};

export default function FlashcardPage() {
    const [selectedMode, setSelectedMode] = useState<FlashcardMode | null>(null);
    const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [showEndScreen, setShowEndScreen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isSupported, setIsSupported] = useState(true);

    // Voice Input State
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState("");
    const [hasSpokenOnce, setHasSpokenOnce] = useState(false);

    // Initial check for support
    useEffect(() => {
        if (typeof window !== "undefined") {
            const support = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
            setIsSupported(support);
        }
    }, []);

    // Fetch cards when mode is selected
    useEffect(() => {
        if (selectedMode) {
            const fetchCards = async () => {
                setIsLoading(true);
                try {
                    const res = await fetch(`/web/api/flashcards?mode=${selectedMode}&language=hi`);
                    const data = await res.json();
                    setFlashcards(data);
                    setCurrentIndex(0); // Reset index when new cards are loaded
                    setShowEndScreen(false); // Reset end screen
                    setTranscript("");
                    setHasSpokenOnce(false);
                } catch (error) {
                    console.error("Failed to fetch cards:", error);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchCards();
        }
    }, [selectedMode]);

    const currentCard = flashcards[currentIndex];
    const isFirstCard = currentIndex === 0;
    const isLastCard = currentIndex === flashcards.length - 1;

    const handleNext = () => {
        if (typeof window !== "undefined" && isSupported) {
            window.speechSynthesis.cancel();
        }
        setIsPlaying(false);
        setTranscript("");
        setHasSpokenOnce(false);

        if (isLastCard) {
            setShowEndScreen(true);
        } else {
            setCurrentIndex((prev) => prev + 1);
        }
    };

    const handlePrev = () => {
        if (typeof window !== "undefined" && isSupported) {
            window.speechSynthesis.cancel();
        }
        setIsPlaying(false);
        setTranscript("");
        setHasSpokenOnce(false);

        if (!isFirstCard) {
            setCurrentIndex((prev) => prev - 1);
        }
    };

    const playAudio = () => {
        if (!isSupported || !currentCard) return;
        const synth = window.speechSynthesis;
        synth.cancel();

        const utterance = new SpeechSynthesisUtterance(currentCard.learningText);
        utterance.lang = "hi-IN";
        utterance.rate = 0.9;
        utterance.onstart = () => setIsPlaying(true);
        utterance.onend = () => setIsPlaying(false);
        utterance.onerror = () => setIsPlaying(false);
        synth.speak(utterance);
    };

    // Speech Recognition Logic
    const toggleListening = () => {
        if (typeof window === "undefined") return;

        const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!Recognition) {
            alert("Speech recognition is not supported in this browser.");
            return;
        }

        if (isListening) {
            setIsListening(false);
            return;
        }

        const recognition = new Recognition();
        recognition.lang = "hi-IN"; // Set to Hindi for practice
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onresult = (event: any) => {
            const result = event.results[0][0].transcript;
            setTranscript(result);
            setHasSpokenOnce(true);
        };
        recognition.onerror = (event: any) => {
            setIsListening(false);

            if (event.error === 'no-speech') {
                return;
            }

            if (event.error === 'network') {
                alert("Network error: Speech recognition requires an active internet connection to reach the processing service. Please check your connection and try again.");
            } else if (event.error === 'not-allowed') {
                alert("Microphone access was denied. Please allow microphone access in your browser settings to use voice input.");
            } else {
                console.error("Speech Recognition Error:", event.error);
                alert(`Speech recognition error: ${event.error}. Please try again.`);
            }
        };

        recognition.start();
    };

    // Mode specific overrides
    useEffect(() => {
        if (selectedMode === 'speech-speech-input' && currentCard && !isLoading) {
            // Logic for Listen & Speak mode if needed
        }
    }, [currentIndex, currentCard, selectedMode, isLoading]);

    if (!selectedMode) {
        return <ModeSelection onSelect={setSelectedMode} />;
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#faf8f3] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-[#d4972a] border-t-transparent rounded-full animate-spin" />
                    <p className="text-[#1a1a2e] font-medium animate-pulse">Loading cards...</p>
                </div>
            </div>
        );
    }

    if (showEndScreen) {
        return (
            <main className="min-h-screen bg-[#faf8f3] flex flex-col items-center justify-center px-6 text-center">
                <div className="max-w-md space-y-8 animate-in fade-in zoom-in duration-500">
                    <div className="text-6xl mb-4">🌼</div>
                    <h1 className="text-4xl font-bold text-[#1a1a2e]">Nice work</h1>
                    <p className="text-[#6b6b7b] text-lg">
                        You practiced today. That matters.
                    </p>
                    <div className="pt-4">
                        <button
                            onClick={() => {
                                setSelectedMode(null);
                                setShowEndScreen(false);
                                setCurrentIndex(0);
                            }}
                            className="inline-flex items-center gap-2 bg-[#d4972a] text-[#1a1a2e] font-semibold px-8 py-4 rounded-full hover:bg-[#e8b84b] transition-all duration-200 hover:shadow-lg hover:shadow-[#d4972a]/30 hover:scale-105"
                        >
                            Back to practice modes
                        </button>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[#faf8f3] flex flex-col items-center justify-between py-12 px-6">
            {/* Header / Progress */}
            <div className="w-full max-w-xl flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setSelectedMode(null)}
                        className="bg-white border border-[#e8e0d0] text-[#1a1a2e] p-2.5 rounded-full hover:border-[#1a1a2e] hover:bg-[#f5f0e8] transition-all duration-200 shadow-sm active:scale-90"
                        title="Back to modes"
                    >
                        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" className="rotate-180">
                            <path d="M5 10h10M10 5l5 5-5 5" />
                        </svg>
                    </button>
                    <div className="flex items-center gap-2">
                        <span className="text-xl font-bold text-[#1a1a2e] tracking-tight">Boli</span>
                        <span
                            className="text-xs font-medium text-[#d4972a] script-display"
                            style={{ fontFamily: "'Noto Sans Devanagari', sans-serif" }}
                        >
                            बोली
                        </span>
                    </div>
                </div>
                <div className="flex gap-1.5 md:gap-2">
                    {flashcards.map((_, idx) => (
                        <div
                            key={idx}
                            className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentIndex
                                ? "w-8 bg-[#d4972a]"
                                : idx < currentIndex
                                    ? "w-3 bg-[#1a1a2e]/20"
                                    : "w-3 bg-[#e8e0d0]"
                                }`}
                        />
                    ))}
                </div>
            </div>

            {/* Card Content */}
            <div className="w-full max-w-xl flex-1 flex items-center justify-center py-10">
                <div className="w-full bg-white rounded-[2.5rem] p-10 md:p-16 shadow-xl border border-[#e8e0d0] flex flex-col items-center text-center space-y-10 transition-all duration-500 animate-in fade-in slide-in-from-bottom-4">

                    {/* Prompt for Speak modes */}
                    {selectedMode === 'speech-speech-input' && (
                        <p className="text-[#d4972a] font-bold text-sm uppercase tracking-widest bg-[#d4972a]/10 px-4 py-1.5 rounded-full">
                            {!transcript ? "Listen carefully then repeat" : "Speak this out loud"}
                        </p>
                    )}

                    {/* Main learning text */}
                    <div className="space-y-2 relative group">
                        <h2
                            className="text-6xl md:text-8xl font-bold text-[#1a1a2e] transition-all duration-700 opacity-100 blur-0 scale-100"
                            style={{ fontFamily: "'Noto Sans Devanagari', sans-serif" }}
                        >
                            {currentCard?.learningText}
                        </h2>
                    </div>

                    {/* Sub text / translation */}
                    <div className={`space-y-4 transition-all duration-500 ${selectedMode === 'speech-speech-input' && !hasSpokenOnce ? "opacity-0 invisible h-0 overflow-hidden" : "opacity-100"
                        }`}>
                        <p className="text-xl md:text-2xl text-[#6b6b7b] font-medium">
                            {currentCard?.supportText}
                        </p>

                        {currentCard?.context && (
                            <p className="text-sm text-[#9999aa] italic leading-relaxed max-w-sm mx-auto">
                                {currentCard?.context}
                            </p>
                        )}
                    </div>

                    {/* Interaction Buttons */}
                    <div className="flex gap-6 items-center">
                        {/* Audio Button (Prompt/Replay) */}
                        {(selectedMode === 'text-text' || selectedMode === 'speech-speech-input') && (
                            <button
                                onClick={playAudio}
                                disabled={isPlaying || !isSupported}
                                className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 border-2 ${isPlaying
                                    ? "bg-[#d4972a] border-[#d4972a] text-white animate-pulse"
                                    : "bg-[#fdf3dc] border-[#d4972a]/20 text-[#d4972a] hover:bg-[#d4972a] hover:text-white shadow-md hover:shadow-lg"
                                    } group`}
                            >
                                <svg
                                    width="24"
                                    height="24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                    className="group-hover:scale-110 transition-transform"
                                >
                                    <path d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.08" />
                                </svg>
                            </button>
                        )}

                        {/* Microphone Button (Voice Input) */}
                        {selectedMode === 'speech-speech-input' && (
                            <button
                                onClick={toggleListening}
                                className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 border-2 ${isListening
                                    ? "bg-red-500 border-red-500 text-white animate-pulse scale-110 shadow-xl"
                                    : "bg-[#1a1a2e]/5 border-[#1a1a2e]/10 text-[#1a1a2e] hover:bg-[#1a1a2e] hover:text-white shadow-md hover:shadow-lg"
                                    } group relative`}
                            >
                                {isListening && (
                                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-400 rounded-full animate-ping" />
                                )}
                                <svg
                                    width="24"
                                    height="24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                    className="group-hover:scale-110 transition-transform"
                                >
                                    <path d="M12 1v10M19 10v1a7 7 0 0 1-14 0v-1M12 18v4M8 22h8" />
                                    <rect x="9" y="1" width="6" height="10" rx="3" />
                                </svg>
                            </button>
                        )}
                    </div>

                    {/* Transcript Display */}
                    {transcript && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-[#f5f0e8] px-6 py-3 rounded-2xl border border-[#e8e0d0] max-w-xs"
                        >
                            <p className="text-xs text-[#9999aa] uppercase tracking-wider mb-1 font-bold">You said</p>
                            <p className="text-[#1a1a2e] font-bold text-lg">{transcript}</p>
                        </motion.div>
                    )}
                </div>
            </div>

            {/* Bottom Controls */}
            <div className="w-full max-w-xl flex gap-10">
                {!isFirstCard && (
                    <button
                        onClick={handlePrev}
                        className="flex-1 md:flex-none border border-[#e8e0d0] text-[#1a1a2e] font-semibold px-10 py-5 rounded-full hover:border-[#1a1a2e] hover:bg-[#f5f0e8] transition-all duration-200 flex items-center justify-center gap-3 active:scale-95"
                    >
                        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" className="rotate-180">
                            <path d="M5 10h10M10 5l5 5-5 5" />
                        </svg>
                        Prev
                    </button>
                )}

                <button
                    onClick={handleNext}
                    disabled={(selectedMode !== 'text-text' && !hasSpokenOnce)}
                    className={`flex-1 text-white font-semibold px-12 py-5 rounded-full transition-all duration-200 flex items-center justify-center gap-3 active:scale-95 ${(selectedMode !== 'text-text' && !hasSpokenOnce)
                        ? "bg-gray-300 cursor-not-allowed opacity-50"
                        : "bg-[#1a1a2e] hover:bg-[#2d2d44] hover:shadow-lg hover:shadow-[#1a1a2e]/20"
                        }`}
                >
                    {isLastCard ? "Finish session" : "Next"}
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M5 10h10M10 5l5 5-5 5" />
                    </svg>
                </button>
            </div>
        </main>
    );
}
