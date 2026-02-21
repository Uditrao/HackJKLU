import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { readJSON, DEFAULTS } from '@/lib/fileUtils';
import { loadStreakData, computeStreak, getRecentDays, recordHit } from '@/lib/streakTracker';

const DATA_DIR = path.join(process.cwd(), 'data');
const QUIZ_DIR = path.join(DATA_DIR, 'quiz_history');
const KNOWLEDGE_FILE = path.join(DATA_DIR, 'chat_knowledge.json');

const LEVEL_THRESHOLDS = [0, 100, 250, 500, 800, 1200, 1700, 2300, 3000, 4000];
function getLevel(xp) {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) return i + 1;
  }
  return 1;
}

export async function GET() {
  // ── Record this visit ──
  recordHit();

  // ── 1. Memory ──
  const memory = readJSON('memory.json', DEFAULTS['memory.json']);
  const xp = memory.xp || 0;
  const level = getLevel(xp);

  // ── 2. Words ──
  const words = readJSON('words.json', DEFAULTS['words.json']);
  const allWords = words.all || [];
  const userUsed = words.user_used || [];
  const sceneUsed = words.scene_used || [];
  const totalWords = allWords.length;
  const masteredWords = userUsed.filter(w => w.strength >= 0.7).length;

  // ── 3. Quiz history → daily score histogram ──
  const quizByDate = {};   // { "YYYY-MM-DD": [score, ...] }
  const quizList = [];
  let totalQuizXP = 0;
  
  try {
    if (fs.existsSync(QUIZ_DIR)) {
      const files = fs.readdirSync(QUIZ_DIR).filter(f => f.endsWith('.json'));
      for (const f of files) {
        try {
          const q = JSON.parse(fs.readFileSync(path.join(QUIZ_DIR, f), 'utf-8'));
          if (q.status === 'completed' && q.results) {
            const dateKey = (q.completed_at || q.created_at || '').slice(0, 10);
            if (dateKey) {
              if (!quizByDate[dateKey]) quizByDate[dateKey] = [];
              quizByDate[dateKey].push(q.results.total_score || 0);
            }
            totalQuizXP += q.results.xp_earned || 0;
            quizList.push({
              id: q.quizId,
              language: q.language,
              difficulty: q.difficulty,
              score: q.results.total_score,
              correct: q.results.correct_count,
              total: q.results.total_questions,
              xp: q.results.xp_earned,
              date: q.completed_at || q.created_at
            });
          }
        } catch {}
      }
    }
  } catch {}

  // Daily quiz score histogram — last 14 days
  const quizHistogram = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const key = d.toISOString().slice(0, 10);
    const dayScores = quizByDate[key] || [];
    const avg = dayScores.length > 0
      ? Math.round(dayScores.reduce((s, v) => s + v, 0) / dayScores.length)
      : 0;
    quizHistogram.push({
      date: key,
      day: d.toLocaleDateString('en-US', { weekday: 'short' }),
      avg_score: avg,
      quiz_count: dayScores.length,
      has_data: dayScores.length > 0
    });
  }

  // ── 4. Chat / fluency stats ──
  let knowledge = { languages: {} };
  try {
    if (fs.existsSync(KNOWLEDGE_FILE)) {
      knowledge = JSON.parse(fs.readFileSync(KNOWLEDGE_FILE, 'utf-8'));
    }
  } catch {}

  const languageStats = Object.entries(knowledge.languages || {}).map(([lang, d]) => ({
    language: lang,
    sessions: d.total_sessions || 0,
    messages: d.total_messages || 0,
    avg_fluency: d.avg_fluency || 0,
    fluency_trend: d.fluency_trend || [],
    strong_topics: d.strong_topics || [],
    weak_topics: d.weak_topics || [],
    vocab_count: Object.keys(d.vocabulary_mastery || {}).length,
    vocab_mastery: Object.entries(d.vocabulary_mastery || {}).map(([word, v]) => ({
      word,
      meaning: v.meaning,
      mastery: Math.round((v.mastery || 0) * 100),
      uses: v.uses || 0
    }))
  }));

  const totalSessions = languageStats.reduce((s, l) => s + l.sessions, 0);
  const overallFluency = languageStats.length > 0
    ? Math.round(languageStats.reduce((s, l) => s + l.avg_fluency, 0) / languageStats.length)
    : 0;

  // ── 5. Streak ──
  const streakData = loadStreakData();
  const streak = computeStreak(streakData);
  const recentDays = getRecentDays(streakData, 21); // 3 weeks for calendar

  // ── 6. Score breakdown for skill cards ──
  // Listening MCQ accuracy from quiz results
  let listeningCorrect = 0, listeningTotal = 0;
  let speakingScoreSum = 0, speakingCount = 0;
  for (const q of quizList) {
    // re-read to get question_results — these are already in quizList if parsed
  }
  // re-read quiz files for per-question breakdown
  try {
    if (fs.existsSync(QUIZ_DIR)) {
      const files = fs.readdirSync(QUIZ_DIR).filter(f => f.endsWith('.json'));
      for (const f of files) {
        try {
          const q = JSON.parse(fs.readFileSync(path.join(QUIZ_DIR, f), 'utf-8'));
          if (q.status === 'completed' && q.results?.question_results) {
            for (const qr of q.results.question_results) {
              if (qr.type === 'listening_mcq') {
                listeningTotal++;
                if (qr.correct) listeningCorrect++;
              } else if (qr.type === 'speaking') {
                speakingCount++;
                speakingScoreSum += qr.score || 0;
              }
            }
          }
        } catch {}
      }
    }
  } catch {}

  const listeningAccuracy = listeningTotal > 0
    ? Math.round((listeningCorrect / listeningTotal) * 100) : 0;
  const speakingAccuracy = speakingCount > 0
    ? Math.round(speakingScoreSum / speakingCount) : 0;
  const vocabPct = totalWords > 0
    ? Math.round((userUsed.length / Math.max(totalWords, 1)) * 100) : 0;

  return NextResponse.json({
    xp: { total: xp, level },
    words: { total: totalWords, user_used: userUsed.length, mastered: masteredWords },
    sessions: { total: totalSessions, avg_fluency: overallFluency },
    quiz: {
      total: quizList.length,
      total_xp: totalQuizXP,
      recent: quizList.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5),
      histogram: quizHistogram
    },
    streak: {
      current: streak.current,
      longest: streak.longest,
      total_active_days: streak.total_active_days,
      today_hits: streak.today_hits,
      calendar: recentDays
    },
    skills: {
      listening: listeningAccuracy,
      speaking: speakingAccuracy,
      vocabulary: vocabPct,
      fluency: overallFluency
    },
    languages: languageStats
  });
}
