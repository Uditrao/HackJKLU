import { NextResponse } from 'next/server';
import { readJSON, DEFAULTS } from '@/lib/fileUtils';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const SESSIONS_DIR = path.join(DATA_DIR, 'chat_sessions');
const KNOWLEDGE_FILE = path.join(DATA_DIR, 'chat_knowledge.json');
const QUIZ_DIR = path.join(DATA_DIR, 'quiz_history');

const LEVEL_THRESHOLDS = [0, 100, 250, 500, 800, 1200, 1700, 2300, 3000, 4000];

function getLevel(xp) {
  let level = 1;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) { level = i + 1; break; }
  }
  return level;
}

function getXPForNextLevel(level) {
  if (level >= LEVEL_THRESHOLDS.length) return null;
  return LEVEL_THRESHOLDS[level];
}

function getDifficulty(level) {
  if (level <= 2) return 'Beginner';
  if (level <= 4) return 'Intermediate';
  if (level <= 7) return 'Advanced';
  return 'Expert';
}

export async function GET() {
  // ── 1. Memory (XP, Level) ──
  const memory = readJSON('memory.json', DEFAULTS['memory.json']);
  const xp = memory.xp || 0;
  const level = getLevel(xp);
  const nextLevelXP = getXPForNextLevel(level);
  const currentLevelXP = LEVEL_THRESHOLDS[level - 1] || 0;
  const xpProgress = nextLevelXP
    ? Math.round(((xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100)
    : 100;
  const xpToNext = nextLevelXP ? nextLevelXP - xp : 0;

  // ── 2. User ──
  const user = readJSON('users.json', {});

  // ── 3. Words ──
  const words = readJSON('words.json', DEFAULTS['words.json']);
  const totalWords = (words.all || []).length;
  const masteredWords = (words.user_used || []).filter(w => w.strength >= 0.7).length;

  // ── 4. Chat sessions ──
  let chatSessions = [];
  let avgFluency = 0;
  let topics = [];
  let recentActivity = [];
  try {
    if (fs.existsSync(SESSIONS_DIR)) {
      const files = fs.readdirSync(SESSIONS_DIR).filter(f => f.endsWith('.json'));
      for (const f of files) {
        try {
          const s = JSON.parse(fs.readFileSync(path.join(SESSIONS_DIR, f), 'utf-8'));
          chatSessions.push(s);
          if (s.topics_covered) topics.push(...s.topics_covered);
          recentActivity.push({
            type: 'chat',
            language: s.language,
            label: (s.topics_covered?.[0]) || 'Chat session',
            timestamp: s.updated_at || s.created_at,
            fluency: s.avg_fluency || null
          });
        } catch {}
      }
    }
  } catch {}

  // ── 5. Chat knowledge (per-language stats) ──
  let knowledge = { languages: {} };
  try {
    if (fs.existsSync(KNOWLEDGE_FILE)) {
      knowledge = JSON.parse(fs.readFileSync(KNOWLEDGE_FILE, 'utf-8'));
    }
  } catch {}

  // Build per-language summary
  const languageSummaries = Object.entries(knowledge.languages || {}).map(([lang, data]) => ({
    language: lang,
    sessions: data.total_sessions || 0,
    avg_fluency: data.avg_fluency || 0,
    fluency_trend: data.fluency_trend || [],
    strong_topics: data.strong_topics || [],
    weak_topics: data.weak_topics || [],
    vocab_count: Object.keys(data.vocabulary_mastery || {}).length
  }));

  // Combined cross-language avg fluency
  if (languageSummaries.length > 0) {
    avgFluency = Math.round(
      languageSummaries.reduce((s, l) => s + l.avg_fluency, 0) / languageSummaries.length
    );
  }

  // ── 6. Quiz history ──
  let quizSummary = { total: 0, completed: 0, avg_score: 0, last_score: null };
  try {
    if (fs.existsSync(QUIZ_DIR)) {
      const files = fs.readdirSync(QUIZ_DIR).filter(f => f.endsWith('.json'));
      const quizzes = files.map(f => {
        try { return JSON.parse(fs.readFileSync(path.join(QUIZ_DIR, f), 'utf-8')); } catch { return null; }
      }).filter(Boolean);
      quizSummary.total = quizzes.length;
      const completed = quizzes.filter(q => q.status === 'completed');
      quizSummary.completed = completed.length;
      if (completed.length > 0) {
        quizSummary.avg_score = Math.round(
          completed.reduce((s, q) => s + (q.results?.total_score || 0), 0) / completed.length
        );
        // most recent completed
        completed.sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at));
        quizSummary.last_score = completed[0]?.results?.total_score ?? null;
        recentActivity.push({
          type: 'quiz',
          language: completed[0]?.language,
          label: `Quiz — ${completed[0]?.difficulty}`,
          timestamp: completed[0]?.completed_at,
          score: quizSummary.last_score
        });
      }
    }
  } catch {}

  // Sort recent activity by timestamp
  recentActivity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  // ── 7. Unique topics ──
  const uniqueTopics = [...new Set(topics)];

  return NextResponse.json({
    user,
    xp: {
      total: xp,
      level,
      difficulty: getDifficulty(level),
      xp_to_next: xpToNext,
      next_level_threshold: nextLevelXP,
      progress_pct: xpProgress
    },
    words: {
      total: totalWords,
      mastered: masteredWords,
      user_used: (words.user_used || []).length
    },
    sessions: {
      total: chatSessions.length,
      avg_fluency: avgFluency
    },
    quiz: quizSummary,
    languages: languageSummaries,
    topics: uniqueTopics,
    recent_activity: recentActivity.slice(0, 5)
  });
}
