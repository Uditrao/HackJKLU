import fs from 'fs';
import path from 'path';
import { readJSON, DEFAULTS } from '@/lib/fileUtils';

// ─── Paths ────────────────────────────────────────────────────────────────────
const DATA_DIR = path.join(process.cwd(), 'data');
const QUIZ_DIR = path.join(DATA_DIR, 'quiz_history');
const KNOWLEDGE_FILE = path.join(DATA_DIR, 'chat_knowledge.json');
const SESSIONS_DIR = path.join(DATA_DIR, 'chat_sessions');

function ensureDirs() {
  if (!fs.existsSync(QUIZ_DIR)) fs.mkdirSync(QUIZ_DIR, { recursive: true });
}

// ─── XP / Level (mirrored from process route) ────────────────────────────────
const LEVEL_THRESHOLDS = [0, 100, 250, 500, 800, 1200, 1700, 2300, 3000, 4000];

export function getLevel(xp) {
  let level = 1;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) { level = i + 1; break; }
  }
  return level;
}

export function getDifficulty(level) {
  if (level <= 2) return 'beginner';
  if (level <= 4) return 'intermediate';
  if (level <= 7) return 'advanced';
  return 'expert';
}

// ═══════════════════════════════════════════════════════════════════════════════
//  FULL MEMORY LOADER — gathers vocabulary + context from EVERY data source
// ═══════════════════════════════════════════════════════════════════════════════

export function loadFullLearnerProfile(language) {
  const memory = readJSON('memory.json', DEFAULTS['memory.json']);
  const words = readJSON('words.json', DEFAULTS['words.json']);
  const conversations = readJSON('conversations.json', DEFAULTS['conversations.json']);

  // ── 1. Build vocabulary map from words.json ──
  const vocabMap = new Map(); // word → { word, meaning, strength, contexts[], source }

  for (const w of (words.user_used || [])) {
    vocabMap.set(w.word, {
      word: w.word,
      meaning: w.meaning || '',
      strength: w.strength || 0,
      contexts: w.context ? [w.context] : [],
      source: 'user_used'
    });
  }
  for (const w of (words.scene_used || [])) {
    if (!vocabMap.has(w.word)) {
      vocabMap.set(w.word, {
        word: w.word,
        meaning: w.meaning || '',
        strength: w.strength || 0,
        contexts: [],
        source: 'scene_used'
      });
    }
  }
  for (const w of (words.all || [])) {
    if (!vocabMap.has(w.word)) {
      vocabMap.set(w.word, {
        word: w.word,
        meaning: w.meaning || '',
        strength: 0,
        contexts: [],
        source: 'all'
      });
    }
  }

  // ── 2. Merge from memory.json words_learned ──
  for (const [word, count] of Object.entries(memory.words_learned || {})) {
    if (vocabMap.has(word)) {
      const v = vocabMap.get(word);
      v.strength = Math.max(v.strength, Math.min(1, count * 0.15));
    } else {
      vocabMap.set(word, {
        word, meaning: '', strength: Math.min(1, count * 0.15),
        contexts: [], source: 'memory'
      });
    }
  }

  // ── 3. Merge from chat_knowledge.json (Facts Memory) ──
  let chatKnowledge = null;
  try {
    if (fs.existsSync(KNOWLEDGE_FILE)) {
      chatKnowledge = JSON.parse(fs.readFileSync(KNOWLEDGE_FILE, 'utf-8'));
      const langProfile = chatKnowledge.languages?.[language] || {};
      for (const [word, vm] of Object.entries(langProfile.vocabulary_mastery || {})) {
        if (vocabMap.has(word)) {
          const v = vocabMap.get(word);
          v.strength = Math.max(v.strength, vm.mastery || 0);
          if (!v.meaning && vm.meaning) v.meaning = vm.meaning;
        } else {
          vocabMap.set(word, {
            word, meaning: vm.meaning || '', strength: vm.mastery || 0,
            contexts: [], source: 'chat_knowledge'
          });
        }
      }
    }
  } catch {}

  // ── 4. Extract context sentences from conversations.json ──
  const contextSentences = [];
  for (const conv of conversations) {
    if (conv.user_input) contextSentences.push(conv.user_input);
    for (const wa of (conv.evaluation?.words_to_add || [])) {
      if (wa.context_sentence) {
        const v = vocabMap.get(wa.word);
        if (v && !v.contexts.includes(wa.context_sentence)) {
          v.contexts.push(wa.context_sentence);
        }
      }
    }
  }

  // ── 5. Extract context from chat sessions ──
  const chatTopics = [];
  const chatVocab = [];
  try {
    if (fs.existsSync(SESSIONS_DIR)) {
      const sessionFiles = fs.readdirSync(SESSIONS_DIR).filter(f => f.endsWith('.json'));
      for (const f of sessionFiles.slice(-5)) { // last 5 sessions
        try {
          const session = JSON.parse(fs.readFileSync(path.join(SESSIONS_DIR, f), 'utf-8'));
          if (session.language === language || !language) {
            chatTopics.push(...(session.topics_covered || []));
            for (const v of (session.vocabulary_used || [])) {
              chatVocab.push(v);
              if (vocabMap.has(v.word)) {
                const existing = vocabMap.get(v.word);
                existing.strength = Math.max(existing.strength, 0.3);
              }
            }
          }
        } catch {}
      }
    }
  } catch {}

  // ── 6. Build final vocabulary array sorted by strength (weakest first) ──
  const allVocab = Array.from(vocabMap.values()).filter(v => v.meaning);
  allVocab.sort((a, b) => a.strength - b.strength);

  // ── 7. Get language-specific stats from knowledge profile ──
  const langStats = chatKnowledge?.languages?.[language] || {};

  return {
    memory,
    level: getLevel(memory.xp || 0),
    difficulty: getDifficulty(getLevel(memory.xp || 0)),
    vocabulary: allVocab,
    vocab_count: allVocab.length,
    context_sentences: contextSentences.slice(-20),
    chat_topics: [...new Set(chatTopics)],
    chat_vocab: chatVocab,
    weak_topics: langStats.weak_topics || [],
    strong_topics: langStats.strong_topics || [],
    avg_fluency: langStats.avg_fluency || 0,
    total_sessions: langStats.total_sessions || 0
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  QUIZ CRUD
// ═══════════════════════════════════════════════════════════════════════════════

export function saveQuiz(quiz) {
  ensureDirs();
  const filePath = path.join(QUIZ_DIR, `${quiz.quizId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(quiz, null, 2), 'utf-8');
  console.log(`[quizEngine] Saved quiz ${quiz.quizId}`);
}

export function loadQuiz(quizId) {
  ensureDirs();
  const filePath = path.join(QUIZ_DIR, `${quizId}.json`);
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch (err) {
    console.error(`[quizEngine] Error loading quiz ${quizId}:`, err.message);
  }
  return null;
}

export function listQuizzes() {
  ensureDirs();
  try {
    return fs.readdirSync(QUIZ_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        try {
          const quiz = JSON.parse(fs.readFileSync(path.join(QUIZ_DIR, f), 'utf-8'));
          return {
            quizId: quiz.quizId,
            language: quiz.language,
            level: quiz.level,
            difficulty: quiz.difficulty,
            num_questions: quiz.questions?.length || 0,
            status: quiz.status,
            created_at: quiz.created_at,
            completed_at: quiz.completed_at || null,
            // Summary results for history view
            total_score: quiz.results?.total_score ?? null,
            xp_earned: quiz.results?.xp_earned ?? null,
            correct_count: quiz.results?.correct_count ?? null,
            total_questions: quiz.results?.total_questions ?? null,
            // Full question + answer + grading data for review
            questions: quiz.questions || [],
            answers: quiz.answers || null,
            question_results: quiz.results?.question_results || null
          };
        } catch { return null; }
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  } catch {
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  NVIDIA LLM HELPER (non-streaming, with retries)
// ═══════════════════════════════════════════════════════════════════════════════
const NVIDIA_API_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY ;

export async function callLLM(systemPrompt, userMessage, retries = 3) {
  if(!NVIDIA_API_KEY){
    console.log("Please insert an api key in .env folder");
    return ;
  }
  for (let attempt = 1; attempt <= retries; attempt++) {
    console.log(`[quizEngine] LLM attempt ${attempt}/${retries}`);
    try {
      const response = await fetch(NVIDIA_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${NVIDIA_API_KEY}`
        },
        body: JSON.stringify({
          model: 'qwen/qwen3-next-80b-a3b-instruct',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
          ],
          temperature: 0.5,
          top_p: 0.95,
          max_tokens: 4096,
          stream: false
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errText}`);
      }

      const data = await response.json();
      const raw = data.choices?.[0]?.message?.content || '';
      console.log('[quizEngine] Raw LLM:', raw.slice(0, 500));

      const cleaned = raw
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();

      return JSON.parse(cleaned);
    } catch (err) {
      console.error(`[quizEngine] LLM attempt ${attempt} failed:`, err.message);
      if (attempt === retries) throw new Error(`LLM failed: ${err.message}`);
    }
  }
}
