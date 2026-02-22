"use client";

import { useState } from "react";
import Link from "next/link";
import "../dashboard/Dashboard.css";

const ResetModal = ({ onClose, onConfirm, resetting }: { onClose: () => void; onConfirm: () => void; resetting: boolean }) => (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
        <div style={{ background: '#FFF', borderRadius: '20px', padding: '36px 32px', width: '100%', maxWidth: '400px', boxShadow: '0 24px 80px rgba(0,0,0,0.18)', fontFamily: 'DM Sans, sans-serif' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '32px', textAlign: 'center', marginBottom: '12px' }}>⚠️</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#2E2E2E', textAlign: 'center', marginBottom: '8px' }}>Reset All Progress?</div>
            <div style={{ fontSize: '14px', color: '#9E9E9E', textAlign: 'center', lineHeight: 1.6, marginBottom: '28px' }}>
                This will permanently erase your XP, words, chat history, quiz results, and streaks. You&apos;ll start fresh as a beginner.
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={onClose} style={{ flex: 1, padding: '12px', border: '1.5px solid #E8E8E8', borderRadius: '12px', background: '#F3F2EC', color: '#2E2E2E', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                <button onClick={onConfirm} disabled={resetting} style={{ flex: 1, padding: '12px', border: 'none', borderRadius: '12px', background: '#C0392B', color: '#FFF', fontSize: '14px', fontWeight: 600, cursor: resetting ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: resetting ? 0.7 : 1 }}>
                    {resetting ? 'Resetting…' : 'Yes, Reset Everything'}
                </button>
            </div>
        </div>
    </div>
);

const ResetButton = ({ onClick }: { onClick: () => void}) => (
    <button
        onClick={onClick}
        style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1.5px solid #FDDEDE', background: '#FFF5F5', color: '#C0392B', fontSize: '13px', fontWeight: 500, cursor: 'pointer', transition: 'background 0.18s', fontFamily: 'inherit' }}
        onMouseEnter={e => (e.currentTarget.style.background = '#FDDEDE')}
        onMouseLeave={e => (e.currentTarget.style.background = '#FFF5F5')}
    >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-3.75" />
        </svg>
        Reset Progress
    </button>
);

export default function GamePage() {
    const [showReset, setShowReset] = useState(false);
    const [resetting, setResetting] = useState(false);

    const handleReset = async () => {
        setResetting(true);
        try {
            const res = await fetch('/api/reset', { method: 'POST' });
            const json = await res.json();
            if (json.success) { setShowReset(false); window.location.reload(); }
        } catch { /* ignore */ } finally { setResetting(false); }
    };

    return (
        <div className="dashboard-container">
            {/* ── SIDEBAR ── */}
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
                    <Link href="/web/chat" className="nav-item">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        Chat
                    </Link>
                    <Link href="/web/game" className="nav-item active">
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
                    <div className="nav-divider" />
                </nav>

                <div className="profile-section">
                    <div className="avatar">N</div>
                    <div>
                        <div className="profile-name">Player</div>
                        <div className="profile-label">Game Mode</div>
                    </div>
                </div>

                <ResetButton onClick={() => setShowReset(true)} />
            </aside>

            {/* ── GAME IFRAME ── */}
            <iframe
                src="/game/index.html"
                style={{ flex: 1, height: "100vh", border: "none", display: "block" }}
                allow="fullscreen microphone"
                title="BOLI Game"
            />

            {showReset && <ResetModal onClose={() => setShowReset(false)} onConfirm={handleReset} resetting={resetting} />}
        </div>
    );
}