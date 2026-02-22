"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import "../dashboard/Dashboard.css";
import "./QuizHistory.css";

// ── Types ─────────────────────────────────────────────────────────────────────
interface QuestionResult {
    questionId: number;
    type: "listening_mcq" | "speaking";
    word?: string;
    word_romanized?: string;
    sentence_en?: string;
    user_answer: string;
    correct_answer?: string;
    corrected_answer?: string;
    expected_answer?: string;
    options?: string[];
    correct: boolean;
    score: number;
    feedback: string;
    pronunciation_tip?: string;
}
interface QuizRecord {
    quizId: string;
    language: string;
    level: number;
    difficulty: string;
    num_questions: number;
    status: string;
    created_at: string;
    completed_at: string;
    total_score: number;
    xp_earned: number;
    correct_count: number;
    total_questions: number;
    question_results: QuestionResult[];
}

// ── Utils ─────────────────────────────────────────────────────────────────────
function getGrade(score: number) {
    if (score >= 90) return { label: "A+", color: "#5ACE8A" };
    if (score >= 80) return { label: "A",  color: "#5ACE8A" };
    if (score >= 70) return { label: "B",  color: "#5C9BE8" };
    if (score >= 60) return { label: "C",  color: "#E8B84A" };
    if (score >= 40) return { label: "D",  color: "#E8834A" };
    return { label: "F", color: "#E57373" };
}
function formatDate(iso: string) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-IN", {
        day: "numeric", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
    });
}
function formatDuration(start: string, end: string) {
    if (!start || !end) return null;
    const ms = new Date(end).getTime() - new Date(start).getTime();
    const s = Math.round(ms / 1000);
    return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function QuizHistoryPage() {
    const [quizzes, setQuizzes]     = useState<QuizRecord[]>([]);
    const [loading, setLoading]     = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [filterLang, setFilterLang] = useState("all");

    const fetchHistory = useCallback(async () => {
        setLoading(true);
        try {
            const res  = await fetch("/api/quiz/history");
            const data = await res.json();
            setQuizzes(data.quizzes || []);
        } catch { /* ignore */ } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchHistory(); }, [fetchHistory]);

    // Derived
    const langs        = Array.from(new Set(quizzes.map(q => q.language)));
    const filtered     = filterLang === "all" ? quizzes : quizzes.filter(q => q.language === filterLang);
    const totalXP      = quizzes.reduce((s, q) => s + (q.xp_earned ?? 0), 0);
    const totalCorrect = quizzes.reduce((s, q) => s + (q.correct_count ?? 0), 0);
    const totalQs      = quizzes.reduce((s, q) => s + (q.total_questions ?? 0), 0);
    const avgScore     = quizzes.length
        ? Math.round(quizzes.reduce((s, q) => s + q.total_score, 0) / quizzes.length)
        : 0;

    return (
        <div className="dashboard-container">
            {/* ── SIDEBAR ── */}
            <aside className="sidebar">
                <div className="logo">BOLI</div>
                <div className="logo-sub">Language Learning</div>
                <nav className="nav">
                    <Link href="/web/dashboard" className="nav-item">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                            <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
                        </svg>
                        Dashboard
                    </Link>
                    <Link href="/web/analyse" className="nav-item">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
                        </svg>
                        Analyse
                    </Link>
                    <Link href="/web/chat" className="nav-item">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        </svg>
                        Chat
                    </Link>
                    <Link href="/web/game" className="nav-item">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/>
                            <circle cx="15" cy="11" r="1" fill="currentColor"/><circle cx="17" cy="13" r="1" fill="currentColor"/>
                            <rect x="2" y="6" width="20" height="12" rx="4"/>
                        </svg>
                        Game
                    </Link>
                    <Link href="/web/shadow" className="nav-item">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                        </svg>
                        Shadow Mode
                    </Link>
                    <Link href="/web/quiz-history" className="nav-item active">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                        </svg>
                        Quiz History
                    </Link>
                    <div className="nav-divider"/>
                </nav>
                <div className="profile-section">
                    <div className="avatar">Q</div>
                    <div>
                        <div className="profile-name">Quiz History</div>
                        <div className="profile-label">{quizzes.length} total quizzes</div>
                    </div>
                </div>
            </aside>

            {/* ── MAIN (scrollable) ── */}
            <main className="main" style={{ gap: 0 }}>
                <div className="qh-inner">

                    {/* Header */}
                    <div className="qh-header">
                        <div>
                            <div className="qh-eyebrow">Learning Analytics</div>
                            <h1 className="qh-title">Quiz History</h1>
                            <p className="qh-sub">A complete breakdown of every quiz you&apos;ve taken.</p>
                        </div>
                        <button onClick={fetchHistory} className="qh-refresh-btn">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.75"/>
                            </svg>
                            Refresh
                        </button>
                    </div>

                    {/* Overview stats */}
                    <div className="qh-stats-row">
                        <div className="qh-stat-card"><div className="qh-stat-num">{quizzes.length}</div><div className="qh-stat-label">Quizzes Taken</div></div>
                        <div className="qh-stat-card"><div className="qh-stat-num" style={{ color: "#5C9BE8" }}>{avgScore}%</div><div className="qh-stat-label">Avg Score</div></div>
                        <div className="qh-stat-card"><div className="qh-stat-num" style={{ color: "#5ACE8A" }}>{totalCorrect}/{totalQs}</div><div className="qh-stat-label">Total Correct</div></div>
                        <div className="qh-stat-card"><div className="qh-stat-num" style={{ color: "#E8B84A" }}>+{totalXP}</div><div className="qh-stat-label">XP Earned</div></div>
                    </div>

                    {/* Language filter */}
                    {langs.length > 1 && (
                        <div className="qh-filter-row">
                            <button className={`qh-pill${filterLang === "all" ? " active" : ""}`} onClick={() => setFilterLang("all")}>All</button>
                            {langs.map(l => (
                                <button key={l} className={`qh-pill${filterLang === l ? " active" : ""}`} onClick={() => setFilterLang(l)}>{l}</button>
                            ))}
                        </div>
                    )}

                    {/* Loading */}
                    {loading && (
                        <div className="qh-loading">
                            <div className="qh-spinner"/>
                            <span>Loading quiz history…</span>
                        </div>
                    )}

                    {/* Empty state */}
                    {!loading && filtered.length === 0 && (
                        <div className="qh-empty">
                            <div className="qh-empty-icon">📊</div>
                            <div className="qh-empty-title">No quizzes yet</div>
                            <p className="qh-empty-sub">Complete a quiz in Shadow Mode to see your analysis here.</p>
                            <Link href="/web/shadow" className="qh-cta-btn">Go to Shadow Mode →</Link>
                        </div>
                    )}

                    {/* Quiz cards */}
                    {!loading && filtered.map((quiz) => {
                        const { label: grade, color: gradeCol } = getGrade(quiz.total_score);
                        const isOpen    = expandedId === quiz.quizId;
                        const duration  = formatDuration(quiz.created_at, quiz.completed_at);
                        const mcqRes    = (quiz.question_results || []).filter(r => r.type === "listening_mcq");
                        const spkRes    = (quiz.question_results || []).filter(r => r.type === "speaking");
                        const mcqOk     = mcqRes.filter(r => r.correct).length;
                        const spkOk     = spkRes.filter(r => r.correct).length;

                        return (
                            <div key={quiz.quizId} className="qh-quiz-card">
                                {/* ── Card Header ── */}
                                <div
                                    className="qh-card-header"
                                    onClick={() => setExpandedId(isOpen ? null : quiz.quizId)}
                                    role="button"
                                    aria-expanded={isOpen}
                                >
                                    {/* Grade badge */}
                                    <div className="qh-grade-badge" style={{ background: `${gradeCol}18`, border: `2px solid ${gradeCol}55` }}>
                                        <span style={{ color: gradeCol, fontSize: "18px", fontWeight: 800 }}>{grade}</span>
                                    </div>

                                    {/* Main info */}
                                    <div className="qh-card-info">
                                        <div className="qh-card-top">
                                            <span className="qh-score-big">{quiz.total_score}%</span>
                                            <span className="qh-correct-count">{quiz.correct_count}/{quiz.total_questions} correct</span>
                                            <span className="qh-lang-pill">{quiz.language}</span>
                                            <span className="qh-diff-pill">{quiz.difficulty}</span>
                                        </div>
                                        <div className="qh-card-meta">
                                            {formatDate(quiz.created_at)}
                                            {duration  && <span>{" · ⏱ "}{duration}</span>}
                                            {quiz.xp_earned > 0 && <span className="qh-xp-tag">{" · "}+{quiz.xp_earned} XP</span>}
                                        </div>
                                    </div>

                                    {/* Score bar */}
                                    <div className="qh-score-bar-wrap">
                                        <div className="qh-score-bar" style={{ width: `${quiz.total_score}%`, background: gradeCol }}/>
                                    </div>

                                    {/* Mini stats */}
                                    <div className="qh-mini-stats">
                                        <div className="qh-mini-stat"><span className="qh-mini-label">🎧</span><span className="qh-mini-val">{mcqOk}/{mcqRes.length}</span></div>
                                        <div className="qh-mini-stat"><span className="qh-mini-label">🎤</span><span className="qh-mini-val">{spkOk}/{spkRes.length}</span></div>
                                    </div>

                                    {/* Chevron */}
                                    <svg className={`qh-chevron${isOpen ? " open" : ""}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="6 9 12 15 18 9"/>
                                    </svg>
                                </div>

                                {/* ── Expanded breakdown (CSS accordion — no animation clipping) ── */}
                                <div className={`qh-breakdown${isOpen ? " open" : ""}`}>
                                    <div className="qh-breakdown-inner">
                                        <div className="qh-section-label">Per-Question Breakdown</div>

                                        {(quiz.question_results || []).map((r, qi) => (
                                            <div key={qi} className="qh-q-row">
                                                {/* Pass/fail indicator */}
                                                <div
                                                    className="qh-q-circle"
                                                    style={{
                                                        background: r.correct ? "rgba(90,206,138,0.12)" : "rgba(229,115,115,0.12)",
                                                        border: `1.5px solid ${r.correct ? "#5ACE8A" : "#E57373"}`,
                                                    }}
                                                >
                                                    <span style={{ color: r.correct ? "#5ACE8A" : "#E57373", fontSize: "11px", fontWeight: 700 }}>
                                                        {r.correct ? "✓" : "✗"}
                                                    </span>
                                                </div>

                                                {/* Question body */}
                                                <div className="qh-q-body">
                                                    {/* Type + word/sentence */}
                                                    <div className="qh-q-meta">
                                                        <span className="qh-q-type">{r.type === "listening_mcq" ? "🎧 Listening" : "🎤 Speaking"}</span>
                                                        <span className="qh-q-num">Q{qi + 1}</span>
                                                        {r.word         && <span className="qh-q-word">{r.word}</span>}
                                                        {r.word_romanized && <span className="qh-q-roman">({r.word_romanized})</span>}
                                                    </div>
                                                    {r.sentence_en && (
                                                        <div className="qh-q-prompt">&ldquo;{r.sentence_en}&rdquo;</div>
                                                    )}

                                                    {/* MCQ options */}
                                                    {r.type === "listening_mcq" && r.options && (
                                                        <div className="qh-options-row">
                                                            {r.options.map((opt, oi) => {
                                                                const isRight = opt === r.correct_answer;
                                                                const isUser  = opt === r.user_answer;
                                                                const cls = isRight
                                                                    ? "qh-opt qh-opt-correct"
                                                                    : isUser && !r.correct
                                                                    ? "qh-opt qh-opt-wrong"
                                                                    : "qh-opt";
                                                                return <span key={oi} className={cls}>{opt}</span>;
                                                            })}
                                                        </div>
                                                    )}

                                                    {/* Speaking: your answer */}
                                                    {r.type === "speaking" && (
                                                        <>
                                                            <div className="qh-answer-row">
                                                                <span className="qh-ans-label">Your answer:</span>
                                                                <span className={`qh-ans-val ${r.correct ? "ans-correct" : r.user_answer ? "ans-partial" : "ans-skipped"}`}>
                                                                    {r.user_answer || "(skipped)"}
                                                                </span>
                                                            </div>
                                                            {!r.correct && (r.corrected_answer || r.expected_answer) && (
                                                                <div className="qh-answer-row">
                                                                    <span className="qh-ans-label">Expected:</span>
                                                                    <span className="qh-ans-val ans-correct">{r.corrected_answer || r.expected_answer}</span>
                                                                </div>
                                                            )}
                                                        </>
                                                    )}

                                                    {/* MCQ: simple wrong answer */}
                                                    {r.type === "listening_mcq" && !r.correct && (
                                                        <div className="qh-answer-row">
                                                            <span className="qh-ans-label">Your pick:</span>
                                                            <span className="qh-ans-val ans-wrong">{r.user_answer}</span>
                                                            <span className="qh-ans-label" style={{ marginLeft: 8 }}>Correct:</span>
                                                            <span className="qh-ans-val ans-correct">{r.correct_answer}</span>
                                                        </div>
                                                    )}

                                                    {/* Feedback */}
                                                    {r.feedback && <div className="qh-feedback">{r.feedback}</div>}
                                                    {r.pronunciation_tip && <div className="qh-pron-tip">💡 {r.pronunciation_tip}</div>}
                                                </div>

                                                {/* Score badge */}
                                                <div
                                                    className="qh-q-score"
                                                    style={{ color: r.correct ? "#5ACE8A" : r.score > 50 ? "#E8B84A" : r.score > 0 ? "#E8834A" : "#E57373" }}
                                                >
                                                    {r.score}<span style={{ fontSize: "9px" }}>pts</span>
                                                </div>
                                            </div>
                                        ))}

                                        {/* Summary bar */}
                                        <div className="qh-summary-bar">
                                            <div className="qh-sum-item"><span>Grade</span><strong style={{ color: gradeCol }}>{grade}</strong></div>
                                            <div className="qh-sum-item"><span>Score</span><strong>{quiz.total_score}%</strong></div>
                                            <div className="qh-sum-item"><span>Correct</span><strong>{quiz.correct_count}/{quiz.total_questions}</strong></div>
                                            {quiz.xp_earned > 0 && <div className="qh-sum-item"><span>XP</span><strong style={{ color: "#E8B84A" }}>+{quiz.xp_earned}</strong></div>}
                                            {duration && <div className="qh-sum-item"><span>Duration</span><strong>{duration}</strong></div>}
                                            <div className="qh-sum-item"><span>🎧 MCQ</span><strong>{mcqOk}/{mcqRes.length}</strong></div>
                                            <div className="qh-sum-item"><span>🎤 Speaking</span><strong>{spkOk}/{spkRes.length}</strong></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {/* Bottom padding */}
                    <div style={{ height: 40 }}/>
                </div>
            </main>
        </div>
    );
}
