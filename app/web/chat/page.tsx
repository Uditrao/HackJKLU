"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import "./Chat.css";

type UserData = {
    name: string;
    age: string;
    area: string;
    id: string;
    createdAt: string;
    updatedAt: string;
};

type Message = {
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
    punjabiText?: string;
    transliteration?: string;
    culturalNote?: string;
    note?: string;
};

type Session = {
    id: string;
    timestamp: string;
    topics_covered?: string[];
    messages?: any[];
};

function ChatPageInner() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [user, setUser] = useState<UserData | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [showWelcome, setShowWelcome] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const [sessionId, setSessionId] = useState<string | null>(null);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [showResetModal, setShowResetModal] = useState(false);
    const [resetting, setResetting] = useState(false);

    const handleReset = async () => {
        setResetting(true);
        try {
            const res = await fetch('/api/reset', { method: 'POST' });
            const json = await res.json();
            if (json.success) { setShowResetModal(false); window.location.reload(); }
        } catch { /* ignore */ } finally { setResetting(false); }
    };

    // On first load: fetch sessions, then auto-load session from URL if present
    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await fetch("/web/api/user-details");
                const data = await res.json();
                setUser(data);
            } catch (error) {
                console.error("Failed to fetch user:", error);
            }
        };
        fetchUser();
        fetchSessions();
    }, []);

    // When URL changes, load the session from the `?id=` param
    useEffect(() => {
        const idFromUrl = searchParams.get("id");
        if (idFromUrl && idFromUrl !== sessionId) {
            loadSessionById(idFromUrl);
        } else if (!idFromUrl && sessionId) {
            // URL cleared → new chat
            setSessionId(null);
            setMessages([]);
            setShowWelcome(true);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

    const fetchSessions = async () => {
        try {
            const res = await fetch("/api/chat/sessions");
            const data = await res.json();
            setSessions(data.sessions || []);
        } catch (error) {
            console.error("Failed to fetch sessions:", error);
        }
    };

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    // Internal loader — called by sidebar click (pushes URL) or by URL effect
    const loadSessionById = async (id: string) => {
        setSessionId(id);
        setShowWelcome(false);
        setMessages([]); // clear while loading
        try {
            const res = await fetch(`/api/chat/sessions/${id}`);
            // API returns the session object directly at the top level:
            // { id, language, messages: [{role, content, timestamp, fluency?}], ... }
            const data = await res.json();
            const rawMessages: any[] = data.messages || [];

            const loadedMessages = rawMessages
                .filter((m: any) => m.role === 'user' || m.role === 'assistant')
                .map((m: any, i: number) => {
                    // Show timestamp and fluency score as a note under the bubble
                    const parts: string[] = [];
                    if (m.timestamp) {
                        const t = new Date(m.timestamp);
                        parts.push(t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
                    }
                    if (m.fluency !== undefined) {
                        parts.push(`Fluency: ${m.fluency}/100`);
                    }
                    return {
                        id: `loaded_${i}`,
                        role: m.role as "user" | "assistant",
                        content: m.content,
                        note: parts.length > 0 ? parts.join(' · ') : undefined
                    };
                });

            setMessages(loadedMessages);
        } catch (error) {
            console.error("Failed to load session:", error);
        }
    };

    // Clicking a sidebar session updates the URL → URL effect fires loadSessionById
    const handleSelectSession = (id: string) => {
        router.push(`/web/chat?id=${id}`);
    };

    const handleSend = useCallback(async () => {
        if (!inputValue.trim() || isTyping) return;
        const userText = inputValue.trim();
        
        const userMessage: Message = {
            id: Date.now().toString(),
            role: "user",
            content: userText,
        };
        setMessages(prev => [...prev, userMessage]);
        setInputValue("");
        setShowWelcome(false);
        setIsTyping(true);

        const botMessageId = (Date.now() + 1).toString();
        setMessages(prev => [...prev, { id: botMessageId, role: "assistant", content: "" }]);

        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: userText,
                    language: "Punjabi", 
                    sessionId: sessionId
                })
            });

            if (!response.body) throw new Error("No response body");

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let done = false;
            let assistantContent = "";
            let botNote = "";

            setIsTyping(false); 

            while (!done) {
                const { value, done: doneReading } = await reader.read();
                done = doneReading;
                if (value) {
                    const chunk = decoder.decode(value, { stream: true });
                    const lines = chunk.split("\n");
                    for (const line of lines) {
                        if (line.startsWith("data: ")) {
                            const dataStr = line.replace("data: ", "").trim();
                            if (!dataStr) continue;
                            try {
                                const data = JSON.parse(dataStr);
                                if (data.type === "token") {
                                    assistantContent += data.content;
                                    setMessages(prev => prev.map(m => m.id === botMessageId ? { ...m, content: assistantContent } : m));
                                } else if (data.type === "fluency") {
                                    if (data.feedback || data.score) {
                                        botNote = `Fluency: ${data.score}/100${data.feedback ? ' - ' + data.feedback : ''}`;
                                        setMessages(prev => prev.map(m => m.id === botMessageId ? { ...m, note: botNote } : m));
                                    }
                                } else if (data.type === "done") {
                                    if (data.sessionId) {
                                        setSessionId(data.sessionId);
                                        // Push session ID into URL without causing a reload
                                        router.replace(`/web/chat?id=${data.sessionId}`);
                                        fetchSessions();
                                    }
                                }
                            } catch (e) {
                                // Ignore parse errors for partial chunks if any
                            }
                        }
                    }
                }
            }
        } catch (e) {
            console.error("Chat error:", e);
            setIsTyping(false);
        }
    }, [inputValue, isTyping, sessionId]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleNewChat = () => {
        setInputValue("");
        // Pushing clean URL triggers the URL effect which resets state
        router.push("/web/chat");
    };

    const initials = user?.name?.slice(0, 2).toUpperCase() || "U";
    const firstName = user?.name?.split(" ")[0] || "Learner";

    return (
        <div className="chat-container">

            {/* ══════════════════════════════════
                COLUMN 1 — Standard Nav Sidebar
                (identical shell to Dashboard/Game)
                ══════════════════════════════════ */}
            <aside className="sidebar">
                <div className="logo">BOLI</div>
                <div className="logo-sub">Language Learning</div>

                <nav className="nav">
                    <Link href="/web/dashboard" className="nav-item">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                            <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
                        </svg>
                        Dashboard
                    </Link>

                    <Link href="/web/analyse" className="nav-item">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
                        </svg>
                        Analyse
                    </Link>

                    <Link href="/web/chat" className="nav-item active">
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

                    <div className="nav-divider" />
                </nav>

                <div className="profile-section">
                    <div className="avatar">{initials}</div>
                    <div>
                        <div className="profile-name">{user?.name || "Learner"}</div>
                        <div className="profile-label">Language Learner</div>
                    </div>
                </div>

                {/* Reset button */}
                <button
                    onClick={() => setShowResetModal(true)}
                    style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1.5px solid #FDDEDE', background: '#FFF5F5', color: '#C0392B', fontSize: '13px', fontWeight: 500, cursor: 'pointer', transition: 'background 0.18s', fontFamily: 'inherit' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#FDDEDE')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#FFF5F5')}
                >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-3.75" />
                    </svg>
                    Reset Progress
                </button>
            </aside>

            {/* ══════════════════════════════════
                COLUMN 2 — Main Chat Area
                ══════════════════════════════════ */}
            <div className="chat-main">
                {/* Top Bar */}
                <div className="chat-topbar">
                    <div className="topbar-left">
                        <div className="topbar-title">Chat Practice</div>
                        <div className="topbar-sub">Practising with BOLI</div>
                    </div>
                    <div className="topbar-right">
                        <div className="lang-badge">
                            <span className="lang-badge-dot"></span>
                            Active
                        </div>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9E9E9E" strokeWidth="2" strokeLinecap="round">
                            <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                        </svg>
                    </div>
                </div>

                {/* Scroll Area */}
                <div className="chat-scroll" ref={scrollRef}>
                    <div className="chat-inner">

                        {/* Welcome State */}
                        <AnimatePresence>
                            {showWelcome && messages.length === 0 && (
                                <motion.div
                                    key="welcome"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="welcome-state"
                                >
                                    <div className="welcome-logo">BOLI</div>
                                    <div className="welcome-greeting">Welcome, {firstName}!</div>
                                    <p className="welcome-sub">Your safe space to practise. Ask anything, make mistakes freely.</p>
                                    <div className="suggestion-chips">
                                        {["How do I greet an elder?", "Teach me 5 market words", "Correct my sentence"].map(chip => (
                                            <button key={chip} className="chip" onClick={() => { setInputValue(chip); inputRef.current?.focus(); }}>
                                                {chip}
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Messages */}
                        <AnimatePresence>
                            {messages.map((msg) => (
                                <motion.div
                                    key={msg.id}
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className={`msg-row ${msg.role}`}
                                >
                                    <div className={`bubble ${msg.role}`}>
                                        {msg.content}
                                        {msg.punjabiText && (
                                            <>
                                                <span className="punjabi-script">{msg.punjabiText}</span>
                                                {msg.transliteration && (
                                                    <span className="transliteration">{msg.transliteration}</span>
                                                )}
                                            </>
                                        )}
                                        {msg.culturalNote && (
                                            <div className="cultural-note">🪔 {msg.culturalNote}</div>
                                        )}
                                    </div>
                                    {msg.note && (
                                        <div className="bubble-note">{msg.note}</div>
                                    )}
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {/* Typing Indicator */}
                        <AnimatePresence>
                            {isTyping && (
                                <motion.div
                                    key="typing"
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    className="msg-row assistant"
                                >
                                    <div className="typing-bubble">
                                        <div className="typing-dot" />
                                        <div className="typing-dot" />
                                        <div className="typing-dot" />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Input Zone */}
                <div className="chat-input-zone">
                    <div className="input-row">
                        <textarea
                            ref={inputRef}
                            className="chat-input"
                            rows={1}
                            value={inputValue}
                            onChange={e => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask anything or ask to learn..."
                        />
                        <button
                            className="send-btn"
                            onClick={handleSend}
                            disabled={!inputValue.trim() || isTyping}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="22" y1="2" x2="11" y2="13" />
                                <polygon points="22 2 15 22 11 13 2 9 22 2" fill="white" stroke="none" />
                            </svg>
                        </button>
                    </div>
                    <div className="input-reassurance">
                        BOLI is here to help you learn, not judge. Every question is a good question.
                    </div>
                </div>
            </div>

            {/* ══════════════════════════════════
                COLUMN 3 — Chat History Panel (right edge)
                ══════════════════════════════════ */}
            <div className="chat-panel">
                <div className="chat-panel-top">
                    <button className="new-chat-btn" onClick={handleNewChat}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        New Chat
                    </button>
                </div>

                <div className="history-label">Recent Conversations</div>

                <div className="chat-history">
                    {sessions.map(item => {
                        const dateObj = new Date(item.timestamp);
                        const displayDate = dateObj.toLocaleDateString() + " " + dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                        const topic = (item.topics_covered && item.topics_covered.length > 0) 
                            ? item.topics_covered[0]
                            : "General Chat";

                        return (
                            <div 
                                key={item.id} 
                                className={`history-item ${item.id === sessionId ? "active" : ""}`}
                                onClick={() => handleSelectSession(item.id)}
                            >
                                <svg className="history-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                </svg>
                                <div style={{ display: "flex", flexDirection: "column" }}>
                                    <span className="history-title" style={{ fontSize: "14px" }}>{topic}</span>
                                    <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>{displayDate}</span>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* ── RESET MODAL ── */}
            {showResetModal && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowResetModal(false)}>
                    <div style={{ background: '#FFF', borderRadius: '20px', padding: '36px 32px', width: '100%', maxWidth: '400px', boxShadow: '0 24px 80px rgba(0,0,0,0.18)', fontFamily: 'DM Sans, sans-serif' }} onClick={e => e.stopPropagation()}>
                        <div style={{ fontSize: '32px', textAlign: 'center', marginBottom: '12px' }}>⚠️</div>
                        <div style={{ fontSize: '20px', fontWeight: 700, color: '#2E2E2E', textAlign: 'center', marginBottom: '8px' }}>Reset All Progress?</div>
                        <div style={{ fontSize: '14px', color: '#9E9E9E', textAlign: 'center', lineHeight: 1.6, marginBottom: '28px' }}>This will permanently erase your XP, words, chat history, quiz results, and streaks. You&apos;ll start fresh as a beginner.</div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button onClick={() => setShowResetModal(false)} style={{ flex: 1, padding: '12px', border: '1.5px solid #E8E8E8', borderRadius: '12px', background: '#F3F2EC', color: '#2E2E2E', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                            <button onClick={handleReset} disabled={resetting} style={{ flex: 1, padding: '12px', border: 'none', borderRadius: '12px', background: '#C0392B', color: '#FFF', fontSize: '14px', fontWeight: 600, cursor: resetting ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: resetting ? 0.7 : 1 }}>{resetting ? 'Resetting…' : 'Yes, Reset Everything'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function ChatPage() {
    return (
        <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'DM Sans, sans-serif', color: '#9E9E9E' }}>Loading…</div>}>
            <ChatPageInner />
        </Suspense>
    );
}

