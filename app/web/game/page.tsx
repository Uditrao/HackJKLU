"use client";

import Link from "next/link";
import "../dashboard/Dashboard.css";

export default function GamePage(): JSX.Element {
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
            </aside>

            {/* ── GAME IFRAME ── */}
            <iframe
                src="/game/index.html"
                style={{
                    flex: 1,
                    height: "100vh",
                    border: "none",
                    display: "block",
                }}
                allow="fullscreen microphone"
                title="BOLI Game"
            />
        </div>
    );
}