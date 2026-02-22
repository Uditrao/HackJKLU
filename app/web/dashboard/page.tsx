"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import "./Dashboard.css";

type UserData = {
    name: string;
    age: string;
    area: string;
    id: string;
    createdAt: string;
    updatedAt: string;
};

type DashboardData = {
    user: UserData;
    xp: {
        total: number;
        level: number;
        difficulty: string;
        xp_to_next: number;
        next_level_threshold: number | null;
        progress_pct: number;
    };
    words: {
        total: number;
        mastered: number;
        user_used: number;
    };
    sessions: {
        total: number;
        avg_fluency: number;
    };
    quiz: {
        total: number;
        completed: number;
        avg_score: number;
        last_score: number | null;
    };
    languages: {
        language: string;
        sessions: number;
        avg_fluency: number;
        fluency_trend: number[];
        strong_topics: string[];
        weak_topics: string[];
        vocab_count: number;
    }[];
    topics: string[];
    recent_activity: {
        type: string;
        language: string;
        label: string;
        timestamp: string;
        fluency?: number;
        score?: number;
    }[];
};

export default function DashboardPage() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showResetModal, setShowResetModal] = useState(false);
    const [resetting, setResetting] = useState(false);

    const handleReset = async () => {
        setResetting(true);
        try {
            const res = await fetch('/api/reset', { method: 'POST' });
            const json = await res.json();
            if (json.success) {
                setShowResetModal(false);
                window.location.reload();
            }
        } catch { /* ignore */ } finally {
            setResetting(false);
        }
    };

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const res = await fetch("/api/dashboard");
                const json = await res.json();
                setData(json);
            } catch (error) {
                console.error("Failed to fetch dashboard data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchAll();
    }, []);

    const formatDate = (dateString: string) => {
        if (!dateString) return "Recent";
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const formatTime = (dateString: string) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const getCurrentDate = () => {
        return new Date().toLocaleDateString('en-US', {
            weekday: 'long', day: 'numeric', month: 'short', year: 'numeric'
        });
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#FAF9F3] flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-[#2D3A8C] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const user = data?.user;
    const xp = data?.xp;
    const words = data?.words;
    const sessions = data?.sessions;
    const quiz = data?.quiz;
    const languages = data?.languages || [];
    const activity = data?.recent_activity || [];
    const topics = data?.topics || [];

    const initials = user?.name?.slice(0, 2).toUpperCase() || "B";
    const firstName = user?.name?.split(" ")[0] || "Learner";

    // Ring stroke calc for XP ring
    const RING_R = 54;
    const RING_C = 2 * Math.PI * RING_R;
    const fillDash = RING_C * ((xp?.progress_pct || 0) / 100);

    return (
        <div className="dashboard-container">
            {/* ── SIDEBAR ── */}
            <aside className="sidebar">
                <div className="logo">BOLI</div>
                <div className="logo-sub">Language Learning</div>

                <nav className="nav">
                    <Link href="/web/dashboard" className="nav-item active">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                            <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
                        </svg>
                        Dashboard
                    </Link>

                    <Link href="/web/analyse" className="nav-item">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" />
                            <line x1="6" y1="20" x2="6" y2="14" />
                        </svg>
                        Analyse
                    </Link>

                    <Link href="/web/chat" className="nav-item">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        Chat
                    </Link>

                    <Link href="/web/game" className="nav-item">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="6" y1="12" x2="10" y2="12" /><line x1="8" y1="10" x2="8" y2="14" />
                            <circle cx="15" cy="11" r="1" fill="currentColor" /><circle cx="17" cy="13" r="1" fill="currentColor" />
                            <rect x="2" y="6" width="20" height="12" rx="4" />
                        </svg>
                        Game
                    </Link>

                    <Link href="/web/shadow" className="nav-item">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                        </svg>
                        Shadow Mode
                    </Link>

                    <Link href="/web/quiz-history" className="nav-item">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                        </svg>
                        Quiz History
                    </Link>

                    <div className="nav-divider"></div>
                </nav>

                <div className="profile-section">
                    <div className="avatar">{initials}</div>
                    <div>
                        <div className="profile-name">{user?.name || "User"}</div>
                        <div className="profile-label">Level {xp?.level} · {xp?.difficulty}</div>
                    </div>
                </div>

                {/* Reset button */}
                <button
                    onClick={() => setShowResetModal(true)}
                    style={{
                        marginTop: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '12px',
                        border: '1.5px solid #FDDEDE',
                        background: '#FFF5F5',
                        color: '#C0392B',
                        fontSize: '13px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'background 0.18s',
                        fontFamily: 'inherit',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#FDDEDE')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#FFF5F5')}
                >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="1 4 1 10 7 10" />
                        <path d="M3.51 15a9 9 0 1 0 .49-3.75" />
                    </svg>
                    Reset Progress
                </button>
            </aside>

            {/* ── MAIN CONTENT ── */}
            <main className="main">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="greeting-row"
                >
                    <div className="greeting-text">
                        <h1>ਸਤ ਸ੍ਰੀ ਅਕਾਲ, {firstName} 👋</h1>
                        <p>You&apos;re doing great — keep the momentum going.</p>
                    </div>
                    <div className="date-pill">
                        <span className="date-dot"></span>
                        {getCurrentDate()}
                    </div>
                </motion.div>

                <div className="top-row">
                    {/* EXP Card — real XP from memory.json */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 }}
                        className="card exp-card"
                    >
                        <div className="exp-ring-wrap">
                            <svg viewBox="0 0 120 120">
                                <circle className="exp-ring-bg" cx="60" cy="60" r={RING_R} />
                                {/* Dynamic fill based on real XP progress */}
                                <circle
                                    className="exp-ring-fill"
                                    cx="60"
                                    cy="60"
                                    r={RING_R}
                                    strokeDasharray={`${fillDash} ${RING_C}`}
                                    strokeDashoffset={RING_C * 0.25}
                                />
                            </svg>
                            <div className="exp-center">
                                <div className="exp-number">{(xp?.total || 0).toLocaleString()}</div>
                                <div className="exp-label">EXP</div>
                            </div>
                        </div>

                        <div className="level-badge">
                            <div className="level-badge-dot"></div>
                            <span>Level {xp?.level} — {xp?.difficulty}</span>
                        </div>

                        <div className="exp-hint">
                            {xp?.xp_to_next
                                ? `${xp.xp_to_next} XP to reach Level ${(xp.level || 0) + 1}`
                                : "Max level reached! 🏆"}
                        </div>
                    </motion.div>

                    {/* Personal Info Card — real user + stats */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                        className="card info-card"
                    >
                        <div className="card-title">Personal Summary</div>

                        <div className="info-row">
                            <span className="info-key">Name</span>
                            <span className="info-val">{user?.name || "Not set"}</span>
                        </div>
                        <div className="info-row">
                            <span className="info-key">Learning Since</span>
                            <span className="info-val">{formatDate(user?.createdAt || "")}</span>
                        </div>
                        <div className="info-row">
                            <span className="info-key">Location</span>
                            <span className="info-pill">{user?.area || "Not set"}</span>
                        </div>
                        <div className="info-row">
                            <span className="info-key">Words Learned</span>
                            <span className="info-val">{words?.total || 0} words</span>
                        </div>
                        <div className="info-row">
                            <span className="info-key">Words Mastered</span>
                            <span className="info-pill orange">{words?.mastered || 0} mastered</span>
                        </div>
                        <div className="info-row">
                            <span className="info-key">Chat Sessions</span>
                            <span className="info-val">{sessions?.total || 0} sessions</span>
                        </div>
                        {quiz && quiz.completed > 0 && (
                            <div className="info-row">
                                <span className="info-key">Quiz Avg Score</span>
                                <span className="info-pill">{quiz.avg_score}%</span>
                            </div>
                        )}
                    </motion.div>
                </div>

                {/* Language Cards */}
                {languages.length > 0 && languages.map((lang, i) => (
                    <motion.div
                        key={lang.language}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 + i * 0.1 }}
                        className="card lang-card"
                    >
                        <div className="lang-icon-wrap">🎯</div>

                        <div className="lang-info">
                            <div className="lang-title">{lang.language}</div>
                            <div className="lang-sub">
                                {lang.sessions} session{lang.sessions !== 1 ? 's' : ''} · Avg fluency {lang.avg_fluency}% · {lang.vocab_count} words learned
                            </div>

                            <div className="progress-row">
                                <div className="progress-track">
                                    <div className="progress-fill" style={{ width: `${lang.avg_fluency}%` }}></div>
                                </div>
                                <div className="progress-pct">{lang.avg_fluency}%</div>
                            </div>

                            <div className="hints-row">
                                {lang.strong_topics.slice(0, 2).map(t => (
                                    <div key={t} className="hint-chip">
                                        <span className="dot dot-green"></span>{t}
                                    </div>
                                ))}
                                {lang.weak_topics.slice(0, 2).map(t => (
                                    <div key={t} className="hint-chip">
                                        <span className="dot dot-orange"></span>{t} (practice more)
                                    </div>
                                ))}
                                {topics.length > 0 && (
                                    <div className="hint-chip">
                                        <span className="dot dot-indigo"></span>
                                        {topics.filter(t => !lang.strong_topics.includes(t) && !lang.weak_topics.includes(t))[0] || 'Keep exploring!'}
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                ))}

                {/* Fallback if no languages yet */}
                {languages.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="card lang-card"
                    >
                        <div className="lang-icon-wrap">🌱</div>
                        <div className="lang-info">
                            <div className="lang-title">Start your journey</div>
                            <div className="lang-sub">You haven&apos;t started any language sessions yet.</div>
                            <div className="hints-row">
                                <div className="hint-chip"><span className="dot dot-indigo"></span>Try the Chat to begin</div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Recent Activity */}
                {activity.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="card"
                        style={{ marginTop: '1rem' }}
                    >
                        <div className="card-title">Recent Activity</div>
                        {activity.map((a, i) => (
                            <div key={i} className="info-row">
                                <span className="info-key" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {a.type === 'quiz' ? '🧩' : '💬'}
                                    {a.label}
                                    {a.language && <span className="info-pill" style={{ fontSize: '11px', padding: '1px 6px' }}>{a.language}</span>}
                                </span>
                                <span className="info-val" style={{ fontSize: '12px', color: '#999' }}>
                                    {formatTime(a.timestamp)}
                                    {a.fluency !== undefined && a.fluency !== null && ` · ${a.fluency}% fluency`}
                                    {a.score !== undefined && a.score !== null && ` · ${a.score}% score`}
                                </span>
                            </div>
                        ))}
                    </motion.div>
                )}

                <div className="mt-4 flex justify-center">
                    <Link
                        href="/web/chat"
                        className="text-[#2D3A8C] font-semibold text-sm hover:underline"
                    >
                        Go to Chat Practice →
                    </Link>
                </div>
            </main>
            {/* ── RESET CONFIRMATION MODAL ── */}
            {showResetModal && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 1000,
                    background: 'rgba(0,0,0,0.45)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }} onClick={() => setShowResetModal(false)}>
                    <div style={{
                        background: '#FFFFFF',
                        borderRadius: '20px',
                        padding: '36px 32px',
                        width: '100%', maxWidth: '400px',
                        boxShadow: '0 24px 80px rgba(0,0,0,0.18)',
                        fontFamily: 'DM Sans, sans-serif',
                    }} onClick={e => e.stopPropagation()}>
                        <div style={{ fontSize: '32px', textAlign: 'center', marginBottom: '12px' }}>⚠️</div>
                        <div style={{ fontSize: '20px', fontWeight: 700, color: '#2E2E2E', textAlign: 'center', marginBottom: '8px' }}>Reset All Progress?</div>
                        <div style={{ fontSize: '14px', color: '#9E9E9E', textAlign: 'center', lineHeight: 1.6, marginBottom: '28px' }}>
                            This will permanently erase your XP, words, chat history, quiz results, and streaks. You&apos;ll start fresh as a beginner.
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                onClick={() => setShowResetModal(false)}
                                style={{
                                    flex: 1, padding: '12px', border: '1.5px solid #E8E8E8',
                                    borderRadius: '12px', background: '#F3F2EC',
                                    color: '#2E2E2E', fontSize: '14px', fontWeight: 600,
                                    cursor: 'pointer', fontFamily: 'inherit',
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleReset}
                                disabled={resetting}
                                style={{
                                    flex: 1, padding: '12px', border: 'none',
                                    borderRadius: '12px', background: resetting ? '#E57373' : '#C0392B',
                                    color: '#FFFFFF', fontSize: '14px', fontWeight: 600,
                                    cursor: resetting ? 'not-allowed' : 'pointer',
                                    fontFamily: 'inherit', opacity: resetting ? 0.7 : 1,
                                    transition: 'background 0.2s',
                                }}
                            >
                                {resetting ? 'Resetting…' : 'Yes, Reset Everything'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
