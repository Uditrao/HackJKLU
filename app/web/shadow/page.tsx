"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import "./Shadow.css";


// ── Types ──────────────────────────────────────────────────────────────────
type PageState = "entry" | "flashcards" | "quiz";
type CardState = "deck-overview" | "front" | "flipped" | "session-done";

interface Flashcard {
    id: number;
    script: string;
    roman: string;
    meaning: string;
    cultural: string;
    strength: number;
}

// ── Real Quiz Types ──────────────────────────────────────────────────────────
type RealMCQ = {
    id: number; type: "listening_mcq";
    word: string; word_romanized: string; correct_answer: string;
    options: string[]; audio_text: string;
};
type RealSpeak = {
    id: number; type: "speaking";
    sentence_en: string; expected_answer: string; expected_answer_romanized: string;
    acceptable_variations: string[]; hint_words: { word: string; meaning: string }[];
    audio_text: string;
};
type RealQuestion = RealMCQ | RealSpeak;
type RealQuiz = {
    quizId: string; language: string; level: number; difficulty: string;
    quiz_metadata: { theme: string; focus_area: string; estimated_difficulty: string };
    questions: RealQuestion[]; num_questions: number;
};
type QResult = {
    questionId: number; type: string; correct: boolean; score: number; feedback: string;
    user_answer: string; correct_answer?: string; word?: string;
    corrected_answer?: string; pronunciation_tip?: string;
};
type EvalResult = {
    summary: { total_score: number; correct_count: number; total_questions: number; grade: string; message: string };
    xp: { xp_earned: number; total_xp: number; level: number; leveled_up: boolean };
    question_results: QResult[];
};
type QuizScreen = "setup" | "generating" | "question" | "evaluating" | "results";

// ── Static data ──────────────────────────────────────────────────────────────
const BETWEEN_PHRASES = [
    "You're doing well.", "Almost there.", "Take your time.",
    "Every word counts.", "You're here. That's what matters.",
];

const LANGUAGES = ["Hindi", "Punjabi"];
const GRADE_COLOR: Record<string, string> = {
    "A+": "#5ACE8A", A: "#5ACE8A", B: "#5C6BC0", C: "#E8834A", D: "#E8834A", F: "#E57373"
};

function smSpeak(text: string, langCode: string) {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = langCode; u.rate = 0.85;
    window.speechSynthesis.speak(u);
}
function getLangCode(lang: string) {
    const m: Record<string, string> = { Hindi: "hi-IN", Punjabi: "pa-IN", Bengali: "bn-IN", Tamil: "ta-IN", Telugu: "te-IN", Gujarati: "gu-IN" };
    return m[lang] || "hi-IN";
}

// ── Component ──────────────────────────────────────────────────────────────
export default function ShadowModePage() {
    const router = useRouter();

    // ── Page State
    const [pageState, setPageState] = useState<PageState>("entry");
    const [activeTab, setActiveTab] = useState<"flashcards" | "quiz">("flashcards");

    // ── Real flashcards from API
    const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
    const [cardsLoading, setCardsLoading] = useState(true);

    const fetchFlashcards = useCallback(async () => {
        setCardsLoading(true);
        try {
            const res = await fetch("/api/flashcards");
            const data = await res.json();
            const cards: Flashcard[] = (data.flashcards || []).map((c: any, i: number) => ({
                id: i + 1,
                script: c.word,
                roman: c.word,
                meaning: c.meaning,
                cultural: c.context
                    ? `Used in context: "${c.context}"`
                    : `Mastery: ${Math.round((c.strength || 0) * 100)}%`,
                strength: c.strength || 0,
            }));
            setFlashcards(cards);
        } catch (err) {
            console.error("Failed to fetch flashcards:", err);
        } finally {
            setCardsLoading(false);
        }
    }, []);

    useEffect(() => { fetchFlashcards(); }, [fetchFlashcards]);

    // ── Flashcard State
    const [cardState, setCardState] = useState<CardState>("deck-overview");
    const [cardIndex, setCardIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [speakerPlaying, setSpeakerPlaying] = useState(false);

    const handleBeginFlashcards = () => {
        setCardState("front");
        setCardIndex(0);
        setIsFlipped(false);
    };

    const handleFlipCard = () => {
        if (!isFlipped) setIsFlipped(true);
    };

    const handleSeeAgain = () => {
        setIsFlipped(false);
        setCardIndex((prev) => (prev + 1) % flashcards.length);
    };

    const handleNextCard = () => {
        setIsFlipped(false);
        if (cardIndex + 1 >= flashcards.length) {
            setCardState("session-done");
        } else {
            setCardIndex((prev) => prev + 1);
        }
    };

    const handleSpeaker = (e: React.MouseEvent) => {
        e.stopPropagation();
        setSpeakerPlaying(true);
        setTimeout(() => setSpeakerPlaying(false), 700);
    };

    // ── Quiz State (REAL API)
    const [quizScreen, setQuizScreen] = useState<QuizScreen>("setup");
    const [quizLang, setQuizLang] = useState("Punjabi");
    const [realQuiz, setRealQuiz] = useState<RealQuiz | null>(null);
    const [qIndex, setQIndex] = useState(0);
    const [qAnswers, setQAnswers] = useState<{ questionId: number; answer: string }[]>([]);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [isLocked, setIsLocked] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState("");
    const [audioPlaying, setAudioPlaying] = useState(false);
    const [evalResult, setEvalResult] = useState<EvalResult | null>(null);
    const [quizError, setQuizError] = useState<string | null>(null);
    const recognitionRef = useRef<any>(null);

    const generateQuiz = useCallback(async () => {
        setQuizScreen("generating");
        setQuizError(null);
        setQAnswers([]); setQIndex(0); setSelectedOption(null); setIsLocked(false);
        setTranscript(""); setEvalResult(null);
        try {
            const res = await fetch("/api/quiz/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ language: quizLang, num_questions: 6 }),
            });
            const data = await res.json();
            if (!res.ok || !data.questions) {
                setQuizError(data.error || "Not enough vocabulary. Try chatting more first!");
                setQuizScreen("setup"); return;
            }
            setRealQuiz({
                quizId: data.quizId, language: data.language, level: data.level,
                difficulty: data.difficulty, quiz_metadata: data.quiz_metadata,
                questions: data.questions, num_questions: data.num_questions
            });
            setQuizScreen("question");
        } catch { setQuizError("Network error."); setQuizScreen("setup"); }
    }, [quizLang]);

    const playQuizAudio = (text: string, en?: boolean) => {
        setAudioPlaying(true);
        smSpeak(text, en ? "en-US" : getLangCode(realQuiz?.language || quizLang));
        setTimeout(() => setAudioPlaying(false), 1800);
    };

    const handleOptionSelect = (optIdx: number) => {
        if (isLocked) return;
        setSelectedOption(optIdx);
        setIsLocked(true);
        const q = realQuiz!.questions[qIndex] as RealMCQ;
        setQAnswers(prev => [...prev, { questionId: q.id, answer: q.options[optIdx] }]);
    };

    const startRecording = () => {
        const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SR) { alert("Speech recognition not supported. Please use Chrome."); return; }
        const rec = new SR();
        rec.lang = getLangCode(realQuiz?.language || quizLang);
        rec.interimResults = false;
        rec.onresult = (e: any) => {
            const t = e.results[0][0].transcript;
            setTranscript(t);
            const q = realQuiz!.questions[qIndex] as RealSpeak;
            setQAnswers(prev => prev.filter(a => a.questionId !== q.id).concat({ questionId: q.id, answer: t }));
        };
        rec.onerror = () => setIsRecording(false);
        rec.onend = () => setIsRecording(false);
        recognitionRef.current = rec;
        rec.start();
        setIsRecording(true); setTranscript("");
    };
    const stopRecording = () => { recognitionRef.current?.stop(); setIsRecording(false); };

    const submitQuiz = useCallback(async () => {
        setQuizScreen("evaluating");
        const fullAnswers = realQuiz!.questions.map(q => {
            const found = qAnswers.find(a => a.questionId === q.id);
            return found || { questionId: q.id, answer: "" };
        });
        try {
            const res = await fetch("/api/quiz/evaluate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ quizId: realQuiz!.quizId, answers: fullAnswers }),
            });
            const data = await res.json();
            if (!res.ok) { setQuizError(data.error || "Evaluation failed."); setQuizScreen("question"); return; }
            setEvalResult(data);
            setQuizScreen("results");
        } catch { setQuizError("Evaluation failed."); setQuizScreen("question"); }
    }, [realQuiz, qAnswers]);

    const goNextQuestion = () => {
        const next = qIndex + 1;
        if (next >= (realQuiz?.num_questions || 0)) {
            submitQuiz();
        } else {
            setQIndex(next); setSelectedOption(null); setIsLocked(false); setTranscript("");
        }
    };
    const skipQuestion = () => {
        const q = realQuiz!.questions[qIndex];
        if (!qAnswers.find(a => a.questionId === q.id))
            setQAnswers(prev => [...prev, { questionId: q.id, answer: "" }]);
        goNextQuestion();
    };

    const currentRealQ = realQuiz?.questions[qIndex];
    const quizProgress = realQuiz ? (qIndex / realQuiz.num_questions) * 100 : 0;
    const hasAnswered = currentRealQ ? qAnswers.some(a => a.questionId === currentRealQ.id) : false;
    const flashProgress = flashcards.length > 0 ? ((cardIndex + 1) / flashcards.length) * 100 : 0;

    const enterShadowMode = () => {
        setPageState("flashcards");
        setActiveTab("flashcards");
        setCardState("deck-overview");
    };

    const switchToQuizFromDone = () => {
        setActiveTab("quiz");
        setQuizScreen("setup");
    };

    const resetFlashcards = () => {
        setCardIndex(0);
        setIsFlipped(false);
        setCardState("deck-overview");
    };

    return (
        <div className="sm-root">

            {/* ── ENTRY SCREEN ── */}
            <AnimatePresence mode="wait">
                {pageState === "entry" && (
                    <motion.div
                        key="entry"
                        className="sm-entry"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, transition: { duration: 0.6 } }}
                        transition={{ duration: 0.8 }}
                    >
                        <div className="sm-entry-wordmark">BOLI</div>
                        <div className="sm-entry-tagline">
                            Take a breath. This is your space.
                            <span className="sm-entry-punjabi">ਇੱਥੇ ਕੋਈ ਜਲਦੀ ਨਹੀਂ।</span>
                            <span style={{ display: "block", fontSize: "12px", color: "var(--sm-text-muted)", marginTop: "4px" }}>
                                There is no hurry here.
                            </span>
                        </div>
                        <button className="sm-enter-btn" onClick={enterShadowMode}>
                            Enter Shadow Mode
                        </button>
                        <button
                            className="sm-entry-exit"
                            onClick={() => router.push("/web/dashboard")}
                        >
                            ← Back to Dashboard
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── MAIN INTERFACE ── */}
            <AnimatePresence>
                {pageState !== "entry" && (
                    <motion.div
                        key="interface"
                        className="sm-interface"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.8 }}
                    >
                        {/* Leave button */}
                        <button
                            className="sm-leave-btn"
                            onClick={() => router.push("/web/dashboard")}
                            aria-label="Leave Shadow Mode"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="15 18 9 12 15 6" />
                            </svg>
                            Leave
                        </button>

                        {/* Segmented Control */}
                        <div className="sm-tabs">
                            <button
                                className={`sm-tab ${activeTab === "flashcards" ? "active" : ""}`}
                                onClick={() => { setActiveTab("flashcards"); setCardState("deck-overview"); }}
                            >
                                Flashcards
                            </button>
                            <button
                                className={`sm-tab ${activeTab === "quiz" ? "active" : ""}`}
                                onClick={() => { setActiveTab("quiz"); setQuizScreen("setup"); }}
                            >
                                Quiz
                            </button>
                        </div>
                        <div className="sm-context-line">Punjabi · Adult Stage · Daily Basics</div>

                        {/* ── CONTENT ── */}
                        <div className="sm-content">

                            {/* ════════ FLASHCARDS TAB ════════ */}
                            <AnimatePresence mode="wait">
                                {activeTab === "flashcards" && (
                                    <motion.div
                                        key={`fc-${cardState}-${cardIndex}`}
                                        initial={{ opacity: 0, y: 16 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.35 }}
                                        style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}
                                    >
                                        {/* Deck Overview */}
                                        {cardState === "deck-overview" && (
                                            <>
                                                <div className="sm-deck-name">
                                                    Your Vocabulary · {cardsLoading ? "…" : flashcards.length} cards
                                                </div>
                                                <div className="sm-card-stack">
                                                    <div className="sm-stack-ghost sm-stack-ghost-1" />
                                                    <div className="sm-stack-ghost sm-stack-ghost-2" />
                                                    <div style={{
                                                        position: "absolute", inset: 0,
                                                        background: "var(--sm-surface)",
                                                        borderRadius: "20px",
                                                        display: "flex", flexDirection: "column",
                                                        alignItems: "center", justifyContent: "center",
                                                        boxShadow: "0 12px 48px rgba(0,0,0,0.5)",
                                                        gap: "8px",
                                                    }}>
                                                        {cardsLoading ? (
                                                            <span style={{ fontSize: "14px", color: "var(--sm-text-muted)" }}>Loading your words…</span>
                                                        ) : flashcards.length > 0 ? (
                                                            <>
                                                                <span style={{ fontSize: "34px", color: "var(--sm-text-primary)", textAlign: "center", padding: "0 20px" }}>
                                                                    {flashcards[0].script}
                                                                </span>
                                                                <span style={{ fontSize: "12px", color: "var(--sm-text-muted)" }}>
                                                                    {flashcards[0].meaning}
                                                                </span>
                                                                {flashcards[0].strength > 0 && (
                                                                    <span style={{ fontSize: "11px", color: "#5A9E7A", marginTop: "4px" }}>
                                                                        {Math.round(flashcards[0].strength * 100)}% mastery
                                                                    </span>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <span style={{ fontSize: "14px", color: "var(--sm-text-muted)", padding: "0 20px", textAlign: "center" }}>
                                                                No flashcards yet. Start chatting or doing quizzes!
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <button
                                                    className="sm-begin-btn"
                                                    onClick={handleBeginFlashcards}
                                                    disabled={cardsLoading || flashcards.length === 0}
                                                >
                                                    {cardsLoading ? "Loading…" : "Begin"}
                                                </button>
                                            </>
                                        )}

                                        {/* Single Card */}
                                        {(cardState === "front" || cardState === "flipped") && flashcards[cardIndex] && (
                                            <>
                                                <div className="sm-flip-scene" onClick={handleFlipCard}>
                                                    <div className={`sm-flip-card ${isFlipped ? "flipped" : ""}`}>
                                                        {/* Front */}
                                                        <div className="sm-card-face sm-card-front">
                                                            <div className="sm-card-word">{flashcards[cardIndex].script}</div>
                                                            <div className="sm-card-roman" style={{ fontSize: "13px", opacity: 0.6 }}>{flashcards[cardIndex].meaning}</div>
                                                            <div className="sm-card-footer">
                                                                <button
                                                                    className={`sm-speaker ${speakerPlaying ? "playing" : ""}`}
                                                                    onClick={handleSpeaker}
                                                                    aria-label="Play audio"
                                                                >
                                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                                                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                                                                        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                                                                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                                                                    </svg>
                                                                </button>
                                                                <span className="sm-card-tap-hint">Tap to reveal</span>
                                                            </div>
                                                        </div>
                                                        {/* Back */}
                                                        <div className="sm-card-face sm-card-back">
                                                            <div className="sm-back-meaning">{flashcards[cardIndex].meaning}</div>
                                                            <div className="sm-back-script">{flashcards[cardIndex].script}</div>
                                                            <div className="sm-back-cultural">{flashcards[cardIndex].cultural}</div>
                                                            <div className="sm-card-footer">
                                                                <button
                                                                    className={`sm-speaker ${speakerPlaying ? "playing" : ""}`}
                                                                    onClick={handleSpeaker}
                                                                    aria-label="Play audio"
                                                                >
                                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                                                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                                                                        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                                                                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                                                                    </svg>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Card navigation */}
                                                <AnimatePresence>
                                                    {isFlipped && (
                                                        <motion.div
                                                            className="sm-card-nav"
                                                            initial={{ opacity: 0, y: 10 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            transition={{ duration: 0.3 }}
                                                        >
                                                            <button className="sm-see-again" onClick={handleSeeAgain}>← See again</button>
                                                            <button className="sm-next-btn" onClick={handleNextCard}>Next →</button>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>

                                                {/* Progress */}
                                                <div className="sm-progress-area">
                                                    <div className="sm-progress-track">
                                                        <div className="sm-progress-fill" style={{ width: `${flashProgress}%` }} />
                                                    </div>
                                                    <div className="sm-progress-label">{cardIndex + 1} of {flashcards.length}</div>
                                                </div>
                                            </>
                                        )}

                                        {/* Session Done */}
                                        {cardState === "session-done" && (
                                            <>
                                                <div className="sm-done-message">
                                                    <span className="sm-done-punjabi">ਸ਼ਾਬਾਸ਼।</span>
                                                    <span className="sm-done-sub">Well done. Rest, or go again.</span>
                                                </div>
                                                <div className="sm-done-cards">
                                                    {flashcards.slice(0, 3).map((_, i) => (
                                                        <div key={i} className="sm-done-card-mini" />
                                                    ))}
                                                </div>
                                                <div className="sm-ghost-btns">
                                                    <button className="sm-ghost-btn" onClick={resetFlashcards}>Review again</button>
                                                    <button className="sm-ghost-btn" onClick={switchToQuizFromDone}>Switch to Quiz</button>
                                                </div>
                                            </>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* ════════ QUIZ TAB — Real AI Quiz ════════ */}
                            <AnimatePresence mode="wait">
                                {activeTab === "quiz" && (
                                    <motion.div
                                        key={`quiz-${quizScreen}-${qIndex}`}
                                        initial={{ opacity: 0, y: 16 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.35 }}
                                        style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}
                                    >

                                        {/* ── SETUP ── */}
                                        {quizScreen === "setup" && (
                                            <div className="sm-quiz-overview-card">
                                                <div className="sm-overview-lang">
                                                    <span className="sm-overview-langname">AI Quiz</span>
                                                    <span className="sm-overview-script">from your vocabulary</span>
                                                </div>
                                                {quizError && (
                                                    <div style={{ background: "rgba(229,115,115,0.12)", border: "1px solid rgba(229,115,115,0.3)", borderRadius: "10px", padding: "10px 14px", fontSize: "12px", color: "#E57373", marginBottom: "12px" }}>
                                                        ⚠️ {quizError}
                                                    </div>
                                                )}
                                                <div style={{ marginBottom: "16px" }}>
                                                    <div style={{ fontSize: "11px", color: "var(--sm-text-muted)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Language</div>
                                                    <div style={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
                                                        {LANGUAGES.map(l => (
                                                            <button key={l} onClick={() => setQuizLang(l)} style={{
                                                                padding: "6px 14px", borderRadius: "20px", fontSize: "12px", fontWeight: quizLang === l ? 700 : 500,
                                                                background: quizLang === l ? "var(--sm-accent)" : "transparent",
                                                                color: quizLang === l ? "#fff" : "var(--sm-text-muted)",
                                                                border: `1.5px solid ${quizLang === l ? "var(--sm-accent)" : "rgba(255,255,255,0.1)"}`,
                                                                cursor: "pointer", transition: "all 0.18s"
                                                            }}>{l}</button>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="sm-overview-row">
                                                    <span className="sm-overview-key">Questions</span>
                                                    <span className="sm-pill indigo">6 · adaptive difficulty</span>
                                                </div>
                                                <div className="sm-overview-row">
                                                    <span className="sm-overview-key">Types</span>
                                                    <div className="sm-focus-pills">
                                                        {["Listening MCQ", "Speaking"].map(f => <span key={f} className="sm-pill warm">{f}</span>)}
                                                    </div>
                                                </div>
                                                <button className="sm-begin-quiz-btn" onClick={generateQuiz}>Generate Quiz →</button>
                                            </div>
                                        )}

                                        {/* ── GENERATING ── */}
                                        {quizScreen === "generating" && (
                                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", padding: "40px 0" }}>
                                                <div style={{ width: "40px", height: "40px", border: "3px solid var(--sm-accent)", borderTopColor: "transparent", borderRadius: "50%", animation: "sm-spin 0.8s linear infinite" }} />
                                                <div style={{ fontSize: "14px", color: "var(--sm-text-secondary)" }}>Generating your {quizLang} quiz…</div>
                                                <div style={{ fontSize: "11px", color: "var(--sm-text-muted)" }}>AI is picking from your vocabulary</div>
                                            </div>
                                        )}

                                        {/* ── EVALUATING ── */}
                                        {quizScreen === "evaluating" && (
                                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", padding: "40px 0" }}>
                                                <div style={{ width: "40px", height: "40px", border: "3px solid #E8834A", borderTopColor: "transparent", borderRadius: "50%", animation: "sm-spin 0.8s linear infinite" }} />
                                                <div style={{ fontSize: "14px", color: "var(--sm-text-secondary)" }}>Grading your answers…</div>
                                            </div>
                                        )}

                                        {/* ── QUESTION ── */}
                                        {quizScreen === "question" && realQuiz && currentRealQ && (
                                            <>
                                                <div className="sm-q-progress-row" style={{ width: "100%", maxWidth: "520px" }}>
                                                    <span className="sm-q-count">
                                                        {currentRealQ.type === "listening_mcq" ? "👂" : "🗣️"} Q{qIndex + 1} of {realQuiz.num_questions}
                                                    </span>
                                                    <span className="sm-q-encourage" style={{ fontSize: "11px" }}>{realQuiz.quiz_metadata.theme}</span>
                                                </div>
                                                <div className="sm-q-progress-track" style={{ width: "100%", maxWidth: "520px" }}>
                                                    <div className="sm-q-progress-fill" style={{ width: `${quizProgress}%` }} />
                                                </div>
                                                <div className="sm-q-card">
                                                    {/* Listening MCQ */}
                                                    {currentRealQ.type === "listening_mcq" && (() => {
                                                        const q = currentRealQ as RealMCQ;
                                                        return (
                                                            <>
                                                                <p className="sm-listen-hint">Listen to the word — pick its meaning.</p>
                                                                <button className={`sm-audio-circle ${audioPlaying ? "playing" : ""}`} onClick={() => playQuizAudio(q.audio_text)} aria-label="Play audio">
                                                                    {audioPlaying
                                                                        ? <svg width="22" height="22" viewBox="0 0 24 24" fill="white" stroke="none"><rect x="5" y="4" width="4" height="16" rx="1" /><rect x="15" y="4" width="4" height="16" rx="1" /></svg>
                                                                        : <svg width="22" height="22" viewBox="0 0 24 24" fill="var(--sm-accent)" stroke="none"><polygon points="5 3 19 12 5 21 5 3" /></svg>}
                                                                </button>
                                                                <p style={{ fontSize: "20px", fontWeight: 700, color: "var(--sm-text-primary)", margin: "8px 0 2px" }}>{q.word}</p>
                                                                <p style={{ fontSize: "12px", color: "var(--sm-text-muted)", marginBottom: "16px" }}>{q.word_romanized}</p>
                                                                <div className="sm-q-divider" />
                                                                <div className="sm-options">
                                                                    {q.options.map((opt: string, i: number) => {
                                                                        const isCorrect = opt === q.correct_answer;
                                                                        let cls = "sm-option";
                                                                        if (isLocked) {
                                                                            if (isCorrect) cls += " correct";
                                                                            else if (selectedOption === i) cls += " wrong";
                                                                            else cls += " dimmed";
                                                                        } else if (selectedOption === i) cls += " selected";
                                                                        return <button key={i} className={cls} onClick={() => handleOptionSelect(i)}>{isLocked && isCorrect ? "✓ " : ""}{opt}</button>;
                                                                    })}
                                                                </div>
                                                                {isLocked && (
                                                                    <motion.button className="sm-q-next-btn" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} onClick={goNextQuestion}>
                                                                        {qIndex + 1 < realQuiz.num_questions ? "Next →" : "Submit Quiz"}
                                                                    </motion.button>
                                                                )}
                                                            </>
                                                        );
                                                    })()}
                                                    {/* Speaking */}
                                                    {currentRealQ.type === "speaking" && (() => {
                                                        const q = currentRealQ as RealSpeak;
                                                        return (
                                                            <>
                                                                <p className="sm-listen-hint">Translate into {realQuiz.language}.</p>
                                                                <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "rgba(255,255,255,0.05)", borderRadius: "10px", padding: "12px 16px", marginBottom: "14px", width: "100%" }}>
                                                                    <p className="sm-speak-sentence" style={{ flex: 1, margin: 0 }}>{q.sentence_en}</p>
                                                                    <button style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }} onClick={() => playQuizAudio(q.audio_text, true)}>
                                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--sm-accent)" stroke="none"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                                                                    </button>
                                                                </div>
                                                                {q.hint_words.length > 0 && (
                                                                    <div className="sm-hint-chips">
                                                                        {q.hint_words.map((hw: { word: string; meaning: string }, i: number) => (
                                                                            <span key={i} className="sm-hint-chip"><strong>{hw.word}</strong> = {hw.meaning}</span>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                                <button className={`sm-mic-circle ${isRecording ? "recording" : transcript ? "done" : ""}`} onClick={isRecording ? stopRecording : startRecording}>
                                                                    {isRecording
                                                                        ? <div className="sm-waveform">{[1, 2, 3, 4, 5].map(i => <div key={i} className="sm-wave-bar" />)}</div>
                                                                        : <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={transcript ? "white" : "var(--sm-text-muted)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                                                                            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                                                            <line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
                                                                        </svg>}
                                                                </button>
                                                                <p style={{ fontSize: "11px", color: "var(--sm-text-muted)", margin: "8px 0 12px" }}>
                                                                    {isRecording ? "🔴 Listening… tap to stop" : transcript ? "Tap to re-record" : `Tap mic — speak in ${realQuiz.language}`}
                                                                </p>
                                                                {transcript && <p className="sm-transcription">&quot;{transcript}&quot;</p>}
                                                                <div style={{ display: "flex", gap: "10px", width: "100%" }}>
                                                                    {hasAnswered && (
                                                                        <motion.button className="sm-q-next-btn" style={{ flex: 1 }} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} onClick={goNextQuestion}>
                                                                            {qIndex + 1 < realQuiz.num_questions ? "Next →" : "Submit Quiz"}
                                                                        </motion.button>
                                                                    )}
                                                                    <button onClick={skipQuestion} style={{ padding: "10px 16px", background: "transparent", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px", color: "var(--sm-text-muted)", fontSize: "12px", cursor: "pointer" }}>Skip</button>
                                                                </div>
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            </>
                                        )}

                                        {/* ── RESULTS ── */}
                                        {quizScreen === "results" && evalResult && (
                                            <div className="sm-summary">
                                                <div style={{ textAlign: "center", marginBottom: "16px" }}>
                                                    <div style={{ fontSize: "42px", fontWeight: 900, color: GRADE_COLOR[evalResult.summary.grade] || "var(--sm-accent)" }}>{evalResult.summary.grade}</div>
                                                    <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--sm-text-primary)" }}>{evalResult.summary.total_score}%</div>
                                                    <div style={{ fontSize: "12px", color: "var(--sm-text-muted)", marginTop: "4px" }}>{evalResult.summary.message}</div>
                                                </div>
                                                <div style={{ display: "flex", gap: "20px", justifyContent: "center", marginBottom: "16px" }}>
                                                    <div style={{ textAlign: "center" }}><div style={{ fontSize: "18px", fontWeight: 800, color: "var(--sm-accent)" }}>+{evalResult.xp.xp_earned} XP</div><div style={{ fontSize: "11px", color: "var(--sm-text-muted)" }}>Earned</div></div>
                                                    <div style={{ textAlign: "center" }}><div style={{ fontSize: "18px", fontWeight: 800, color: "var(--sm-text-primary)" }}>{evalResult.summary.correct_count}/{evalResult.summary.total_questions}</div><div style={{ fontSize: "11px", color: "var(--sm-text-muted)" }}>Correct</div></div>
                                                    <div style={{ textAlign: "center" }}>
                                                        <div style={{ fontSize: "18px", fontWeight: 800, color: evalResult.xp.leveled_up ? "#5ACE8A" : "var(--sm-text-primary)" }}>{evalResult.xp.leveled_up ? "↑ " : ""}Lv {evalResult.xp.level}</div>
                                                        <div style={{ fontSize: "11px", color: "var(--sm-text-muted)" }}>{evalResult.xp.leveled_up ? "Level Up! 🎉" : "Level"}</div>
                                                    </div>
                                                </div>
                                                <div className="sm-summary-card" style={{ textAlign: "left", maxHeight: "260px", overflowY: "auto" }}>
                                                    {evalResult.question_results.map((r: QResult, i: number) => (
                                                        <div key={i} style={{ padding: "10px 0", borderBottom: i < evalResult.question_results.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none", display: "flex", gap: "10px" }}>
                                                            <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: r.correct ? "rgba(90,206,138,0.2)" : "rgba(229,115,115,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", flexShrink: 0, color: r.correct ? "#5ACE8A" : "#E57373" }}>{r.correct ? "✓" : "✗"}</div>
                                                            <div style={{ flex: 1 }}>
                                                                <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--sm-text-primary)" }}>
                                                                    Q{r.questionId + 1} {r.type === "listening_mcq" ? "👂" : "🗣️"}{r.word && <span style={{ fontWeight: 400, color: "var(--sm-text-muted)" }}> — {r.word}</span>}
                                                                    <span style={{ float: "right", color: r.score >= 80 ? "#5ACE8A" : r.score >= 50 ? "#E8834A" : "#E57373" }}>{r.score}/100</span>
                                                                </div>
                                                                <div style={{ fontSize: "11px", color: "var(--sm-text-muted)", marginTop: "2px" }}>
                                                                    You: <em>{r.user_answer || "(skipped)"}</em>
                                                                    {r.correct_answer && !r.correct && <> · Answer: <span style={{ color: "#5ACE8A" }}>{r.correct_answer}</span></>}
                                                                </div>
                                                                {r.feedback && <div style={{ fontSize: "11px", color: "var(--sm-text-secondary)", marginTop: "3px", lineHeight: 1.4 }}>{r.feedback}</div>}
                                                                {r.pronunciation_tip && <div style={{ fontSize: "10px", color: "var(--sm-text-muted)", marginTop: "2px", fontStyle: "italic" }}>💡 {r.pronunciation_tip}</div>}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="sm-summary-actions">
                                                    <button className="sm-ghost-btn" onClick={generateQuiz}>New Quiz</button>
                                                    <button className="sm-ghost-btn" onClick={() => { setActiveTab("flashcards"); setCardState("deck-overview"); }}>Review Flashcards</button>
                                                    <button className="sm-ghost-btn" onClick={() => { setQuizScreen("setup"); setEvalResult(null); }}>Back to Setup</button>
                                                </div>
                                            </div>
                                        )}

                                    </motion.div>
                                )}
                            </AnimatePresence>

                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
