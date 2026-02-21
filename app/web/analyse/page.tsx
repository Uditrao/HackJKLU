"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import "./Analyse.css";

type HistogramBar = {
    date: string;
    day: string;
    avg_score: number;
    quiz_count: number;
    has_data: boolean;
};

type CalendarDay = {
    date: string;
    day: string;
    hits: number;
    active: boolean;
};

type AnalyseData = {
    xp: { total: number; level: number };
    words: { total: number; user_used: number; mastered: number };
    sessions: { total: number; avg_fluency: number };
    quiz: {
        total: number;
        total_xp: number;
        recent: { id: string; language: string; difficulty: string; score: number; correct: number; total: number; xp: number; date: string }[];
        histogram: HistogramBar[];
    };
    streak: { current: number; longest: number; total_active_days: number; today_hits: number; calendar: CalendarDay[] };
    skills: { listening: number; speaking: number; vocabulary: number; fluency: number };
    languages: { language: string; sessions: number; avg_fluency: number; weak_topics: string[]; strong_topics: string[]; vocab_count: number }[];
};

export default function AnalysePage() {
    const [data, setData] = useState<AnalyseData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [userName, setUserName] = useState("Learner");

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [analyseRes, userRes] = await Promise.all([
                    fetch("/api/analyse"),
                    fetch("/web/api/user-details").catch(() => null)
                ]);
                const analyseJson = await analyseRes.json();
                setData(analyseJson);
                if (userRes) {
                    const u = await userRes.json();
                    if (u?.name) setUserName(u.name.split(" ")[0]);
                }
            } catch (err) {
                console.error("Failed to fetch analyse data:", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchAll();
    }, []);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#FAF9F3] flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-[#2D3A8C] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const hist = data?.quiz.histogram || [];
    const maxScore = Math.max(...hist.map(b => b.avg_score), 100);
    const calendarDays = data?.streak.calendar || [];
    const todayKey = new Date().toISOString().slice(0, 10);
    const skills = data?.skills;
    const quizRecent = data?.quiz.recent || [];

    return (
        <div className="analyse-container">
            {/* SIDEBAR */}
            <aside className="sidebar">
                <div className="logo">BOLI</div>
                <div className="logo-sub">Language Learning</div>
                <nav className="nav">
                    <Link href="/web/dashboard" className="nav-item">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
                        Dashboard
                    </Link>
                    <Link href="/web/analyse" className="nav-item active">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
                        Analyse
                    </Link>
                    <Link href="/web/chat" className="nav-item">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                        Chat
                    </Link>
                    <Link href="/web/game" className="nav-item">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="6" y1="12" x2="10" y2="12" /><line x1="8" y1="10" x2="8" y2="14" /><circle cx="15" cy="11" r="1" fill="currentColor" /><circle cx="17" cy="13" r="1" fill="currentColor" /><rect x="2" y="6" width="20" height="12" rx="4" /></svg>
                        Game
                    </Link>
                    <Link href="/web/shadow" className="nav-item">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
                        Shadow Mode
                    </Link>
                    <div className="nav-divider"></div>
                </nav>
                <div className="profile-section">
                    <div className="avatar">{userName.slice(0, 2).toUpperCase()}</div>
                    <div>
                        <div className="profile-name">{userName}</div>
                        <div className="profile-label">Level {data?.xp.level || 1}</div>
                    </div>
                </div>
            </aside>

            {/* MAIN */}
            <main className="main">
                {/* Page Header */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="page-header">
                    <div>
                        <div className="card-label">Your Progress</div>
                        <h1>Learning Analytics</h1>
                        <p>A calm look at how far you&apos;ve come.</p>
                    </div>
                </motion.div>

                {/* Overview Stats Row */}
                <div className="overview-row">
                    {[
                        { icon: "📚", num: String(data?.words.total || 0), desc: "Words learned", delta: `${data?.words.user_used || 0} used by you`, color: "indigo" },
                        { icon: "✅", num: String(data?.sessions.total || 0), desc: "Chat sessions", delta: `Avg fluency: ${data?.sessions.avg_fluency || 0}%`, color: "green" },
                        { icon: "🎯", num: String(data?.quiz.total || 0), unit: "", desc: "Quizzes taken", delta: `+${data?.quiz.total_xp || 0} XP earned`, color: "teal", deltaStyle: { color: "#5C6BC0", background: "#E8EAF6" } },
                        { icon: "🔥", num: String(data?.streak.current || 0), unit: "", desc: "Day streak", delta: `Best: ${data?.streak.longest || 0} days`, color: "orange" },
                    ].map((stat, i) => (
                        <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 * i }} className="card stat-card">
                            <div className={`stat-icon ${stat.color}`}>{stat.icon}</div>
                            <div className="stat-number">{stat.num}{stat.unit && <span style={{ fontSize: '18px', color: '#9E9E9E' }}>{stat.unit}</span>}</div>
                            <div className="stat-desc">{stat.desc}</div>
                            <div className="stat-delta" style={(stat as any).deltaStyle}>{stat.delta}</div>
                        </motion.div>
                    ))}
                </div>

                {/* Bar Chart (Quiz Scores) + Streak Calendar */}
                <div className="graphs-row">
                    {/* Quiz Score Histogram */}
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }} className="card">
                        <div className="card-label">Quizzes</div>
                        <div className="card-title">Daily Quiz Score — Last 14 Days</div>
                        <div className="bar-chart-wrap chart-area">
                            <div className="gridlines">
                                <div className="gridline"></div><div className="gridline"></div>
                                <div className="gridline"></div><div className="gridline"></div>
                            </div>
                            <div className="chart-yaxis">
                                <span>100</span><span>75</span><span>50</span><span>0</span>
                            </div>
                            <div className="chart-body">
                                <div className="bar-chart">
                                    {hist.map((bar, i) => {
                                        const heightPct = bar.has_data ? `${Math.round((bar.avg_score / maxScore) * 100)}%` : "4%";
                                        const isToday = bar.date === todayKey;
                                        return (
                                            <div key={i} className="bar-col">
                                                <div className="bar-val" style={{ fontSize: '10px' }}>
                                                    {bar.has_data ? bar.avg_score : "—"}
                                                </div>
                                                <div className="bar-wrap">
                                                    <div
                                                        className={`bar ${bar.has_data ? (isToday ? "fill-orange" : "fill-indigo") : ""}`}
                                                        style={{ height: heightPct, backgroundColor: bar.has_data ? undefined : "#F3F2EC" }}
                                                    ></div>
                                                </div>
                                                <div className="bar-day" style={{ fontSize: '10px' }}>{bar.day}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                        <div style={{ marginTop: '12px', fontSize: '11px', color: '#9E9E9E', fontStyle: 'italic' }}>
                            Average quiz score per day · orange = today · grey = no quiz
                        </div>
                    </motion.div>

                    {/* Streak Calendar */}
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }} className="card">
                        <div className="card-label">Consistency</div>
                        <div className="streak-header">
                            <div>
                                <div className="streak-fire">🔥 {data?.streak.current || 0}</div>
                                <div className="streak-days">day{(data?.streak.current || 0) !== 1 ? "s" : ""} in a row</div>
                            </div>
                            <div className="streak-badge">
                                {(data?.streak.current || 0) > 0 ? "Active Streak" : "Start Today!"}
                            </div>
                        </div>

                        <div className="cal-labels">
                            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((l, i) => (
                                <span key={i} className="cal-label">{l}</span>
                            ))}
                        </div>
                        <div className="calendar-grid">
                            {calendarDays.map((day, i) => {
                                const isToday = day.date === todayKey;
                                let cls = "cal-day ";
                                if (isToday) cls += "today";
                                else if (day.active) cls += "done";
                                else cls += "empty";
                                return (
                                    <div key={i} className={cls} title={`${day.date}: ${day.hits} hit${day.hits !== 1 ? 's' : ''}`}></div>
                                );
                            })}
                        </div>
                        <div style={{ marginTop: '14px', fontSize: '11px', color: '#9E9E9E', display: 'flex', gap: '14px', alignItems: 'center' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '10px', height: '10px', background: '#2D3A8C', borderRadius: '3px', display: 'inline-block' }}></span>Active</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '10px', height: '10px', background: '#E8834A', borderRadius: '3px', display: 'inline-block' }}></span>Today</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '10px', height: '10px', background: '#F3F2EC', borderRadius: '3px', display: 'inline-block' }}></span>Rest</span>
                        </div>
                    </motion.div>
                </div>

                {/* XP total + Skill Bars */}
                <div className="xp-row">
                    {/* XP card */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="card">
                        <div className="card-label">Experience</div>
                        <div className="card-title">Total XP Earned</div>
                        <div className="xp-meta">
                            <div>
                                <div className="xp-total">{(data?.xp.total || 0).toLocaleString()} XP</div>
                                <div className="xp-sub">Level {data?.xp.level || 1} · Total experience</div>
                            </div>
                            <div style={{ alignSelf: 'flex-end' }}>
                                <div className="xp-delta">+{data?.quiz.total_xp || 0} XP from quizzes</div>
                            </div>
                        </div>
                        {/* Fluency trend from languages */}
                        {(data?.languages || []).map(lang => (
                            <div key={lang.language} style={{ marginTop: '12px' }}>
                                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px', fontWeight: 600 }}>{lang.language} — Avg Fluency</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ flex: 1, background: '#F3F2EC', borderRadius: '4px', height: '8px' }}>
                                        <div style={{ width: `${lang.avg_fluency}%`, background: '#2D3A8C', borderRadius: '4px', height: '8px', transition: 'width 0.8s' }}></div>
                                    </div>
                                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#2D3A8C' }}>{lang.avg_fluency}%</span>
                                </div>
                            </div>
                        ))}
                    </motion.div>

                    {/* Skill Progress */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="card">
                        <div className="card-label">Skills</div>
                        <div className="card-title">Skill Breakdown</div>
                        <div className="skills-list">
                            {[
                                { emoji: "👂", name: "Listening (MCQ Accuracy)", pct: skills?.listening || 0, color: "fill-indigo", hint: `Based on ${data?.quiz.total || 0} quiz attempt${(data?.quiz.total || 0) !== 1 ? 's' : ''}` },
                                { emoji: "📖", name: "Vocabulary", pct: skills?.vocabulary || 0, color: "fill-green", hint: `${data?.words.user_used || 0} of ${data?.words.total || 0} words used actively` },
                                { emoji: "🗣️", name: "Speaking (AI Score)", pct: skills?.speaking || 0, color: "fill-orange", hint: "Average speaking question score from quizzes" },
                                { emoji: "🤝", name: "Fluency (Chat)", pct: skills?.fluency || 0, color: "fill-teal", hint: "Average fluency score across all chat sessions" }
                            ].map((skill, i) => (
                                <div key={i} className="skill-row">
                                    <div className="skill-top">
                                        <div className="skill-name"><span className="skill-emoji">{skill.emoji}</span> {skill.name}</div>
                                        <div className="skill-pct">{skill.pct}%</div>
                                    </div>
                                    <div className="skill-track"><div className={`skill-fill ${skill.color}`} style={{ width: `${skill.pct}%` }}></div></div>
                                    <div className="skill-hint">{skill.hint}</div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>

                {/* Bottom: Recent Quiz Results + Language Breakdown */}
                <div className="bottom-row">
                    {/* Recent Quiz Results */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="card">
                        <div className="card-label">History</div>
                        <div className="card-title">Recent Quiz Results</div>
                        {quizRecent.length === 0 ? (
                            <div style={{ color: '#9E9E9E', fontSize: '13px', marginTop: '12px' }}>No quizzes taken yet. Start your first quiz!</div>
                        ) : quizRecent.map((q, i) => {
                            const d = new Date(q.date);
                            const dayStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                            const dotColor = q.score >= 80 ? "#5A9E7A" : q.score >= 50 ? "#E8834A" : "#C0392B";
                            return (
                                <div key={i} className="session-row">
                                    <div className="session-dot" style={{ background: dotColor }}></div>
                                    <div className="session-info">
                                        <div className="session-name">{q.language} Quiz · {q.difficulty}</div>
                                        <div className="session-meta">{dayStr} · {q.correct}/{q.total} correct · Score: {q.score}%</div>
                                    </div>
                                    <div className="session-xp">+{q.xp} XP</div>
                                </div>
                            );
                        })}
                    </motion.div>

                    {/* Language Weak Topics */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                        <div>
                            <div className="card-label">Focus Areas</div>
                            <div className="card-title">What Needs Attention</div>
                            {(data?.languages || []).length === 0 ? (
                                <div style={{ color: '#9E9E9E', fontSize: '13px', marginTop: '12px' }}>Start chatting to see your weak areas!</div>
                            ) : (data?.languages || []).map(lang => (
                                <div key={lang.language} style={{ marginTop: '14px' }}>
                                    <div style={{ fontWeight: 700, fontSize: '13px', color: '#2D3A8C', marginBottom: '6px' }}>{lang.language}</div>
                                    {lang.weak_topics.length === 0 && lang.strong_topics.length === 0 ? (
                                        <div style={{ fontSize: '12px', color: '#9E9E9E' }}>Keep practising to discover weak areas.</div>
                                    ) : (
                                        <>
                                            {lang.strong_topics.slice(0, 2).map(t => (
                                                <div key={t} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', marginBottom: '4px' }}>
                                                    <span style={{ width: '8px', height: '8px', background: '#5A9E7A', borderRadius: '50%', flexShrink: 0 }}></span>
                                                    <span style={{ color: '#333' }}>{t} — strong</span>
                                                </div>
                                            ))}
                                            {lang.weak_topics.slice(0, 3).map(t => (
                                                <div key={t} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', marginBottom: '4px' }}>
                                                    <span style={{ width: '8px', height: '8px', background: '#E8834A', borderRadius: '50%', flexShrink: 0 }}></span>
                                                    <span style={{ color: '#333' }}>{t} — needs practice</span>
                                                </div>
                                            ))}
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="motivation-note">
                            &quot;Every session brings you closer to fluency. ਸ਼ਾਬਾਸ਼, {userName}.&quot;
                        </div>
                    </motion.div>
                </div>
            </main>
        </div>
    );
}
