import fs from 'fs';
import path from 'path';

// ─── Directory Constants ──────────────────────────────────────────────────────
const DATA_DIR = path.join(process.cwd(), 'data');
const SESSIONS_DIR = path.join(DATA_DIR, 'chat_sessions');
const KNOWLEDGE_FILE = path.join(DATA_DIR, 'chat_knowledge.json');

// ─── Ensure directories exist ─────────────────────────────────────────────────
function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(SESSIONS_DIR)) fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

// ─── Default Shapes ───────────────────────────────────────────────────────────
const DEFAULT_KNOWLEDGE = {
  languages: {},
  last_updated: null
};

// ═══════════════════════════════════════════════════════════════════════════════
//  TIER 1 — ACTIVE MEMORY  (request-scoped, in-memory only)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Creates an ephemeral Active Memory object that lives only during one request.
 * Holds the assembled prompt state, RAG context, image analysis state, etc.
 * Discarded automatically after the response is sent.
 */
export function createActiveMemory(session, ragContext, images) {
  return {
    sessionId: session.id,
    language: session.language,
    ragContext,          // null if RAG was skipped
    imageCount: images?.length || 0,
    turnStart: Date.now(),
    fluencyData: null    // filled after LLM response
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  TIER 2 — SESSION MEMORY  (per-session JSON files)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a brand-new session object.
 */
export function createSession(sessionId, language) {
  return {
    id: sessionId,
    language,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    fluency_scores: [],
    avg_fluency: 0,
    topics_covered: [],
    vocabulary_used: [],
    messages: []
  };
}

/**
 * Load a session from disk. Returns null if not found.
 */
export function loadSession(sessionId) {
  ensureDirs();
  const filePath = path.join(SESSIONS_DIR, `${sessionId}.json`);
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch (err) {
    console.error(`[chatMemory] Error loading session ${sessionId}:`, err.message);
  }
  return null;
}

/**
 * Persist a session to disk. Recalculates avg_fluency automatically.
 */
export function saveSession(session) {
  ensureDirs();
  session.updated_at = new Date().toISOString();
  if (session.fluency_scores.length > 0) {
    session.avg_fluency = Math.round(
      session.fluency_scores.reduce((a, b) => a + b, 0) / session.fluency_scores.length
    );
  }
  const filePath = path.join(SESSIONS_DIR, `${session.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(session, null, 2), 'utf-8');
  console.log(`[chatMemory] Saved session ${session.id} (${session.messages.length} msgs, avg fluency ${session.avg_fluency})`);
}

/**
 * List all sessions with lightweight metadata (no full message history).
 */
export function listSessions() {
  ensureDirs();
  try {
    const files = fs.readdirSync(SESSIONS_DIR).filter(f => f.endsWith('.json'));
    return files
      .map(f => {
        try {
          const raw = fs.readFileSync(path.join(SESSIONS_DIR, f), 'utf-8');
          const session = JSON.parse(raw);
          const lastMsg = session.messages?.[session.messages.length - 1];
          return {
            id: session.id,
            language: session.language,
            created_at: session.created_at,
            updated_at: session.updated_at,
            message_count: session.messages?.length || 0,
            avg_fluency: session.avg_fluency || 0,
            topics_covered: session.topics_covered || [],
            last_message_preview: lastMsg ? String(lastMsg.content || '').substring(0, 120) : null
          };
        } catch { return null; }
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  } catch (err) {
    console.error('[chatMemory] Error listing sessions:', err.message);
    return [];
  }
}

/**
 * Delete a single session. Returns true if deleted.
 */
export function deleteSession(sessionId) {
  const filePath = path.join(SESSIONS_DIR, `${sessionId}.json`);
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`[chatMemory] Deleted session ${sessionId}`);
      return true;
    }
  } catch (err) {
    console.error(`[chatMemory] Error deleting session ${sessionId}:`, err.message);
  }
  return false;
}

/**
 * Delete every session file. Returns number deleted.
 */
export function deleteAllSessions() {
  ensureDirs();
  const files = fs.readdirSync(SESSIONS_DIR).filter(f => f.endsWith('.json'));
  let count = 0;
  for (const f of files) {
    try {
      fs.unlinkSync(path.join(SESSIONS_DIR, f));
      count++;
    } catch {}
  }
  console.log(`[chatMemory] Cleared ${count} sessions`);
  return count;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  TIER 3 — FACTS MEMORY  (permanent cross-session knowledge)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Load the aggregated knowledge profile from disk.
 */
export function loadKnowledge() {
  ensureDirs();
  try {
    if (fs.existsSync(KNOWLEDGE_FILE)) {
      return JSON.parse(fs.readFileSync(KNOWLEDGE_FILE, 'utf-8'));
    }
  } catch (err) {
    console.error('[chatMemory] Error loading knowledge:', err.message);
  }
  return JSON.parse(JSON.stringify(DEFAULT_KNOWLEDGE)); // deep copy
}

/**
 * Save the knowledge profile to disk.
 */
export function saveKnowledge(knowledge) {
  ensureDirs();
  knowledge.last_updated = new Date().toISOString();
  fs.writeFileSync(KNOWLEDGE_FILE, JSON.stringify(knowledge, null, 2), 'utf-8');
  console.log('[chatMemory] Updated knowledge profile');
}

// ─── Fact Extractor ───────────────────────────────────────────────────────────

/**
 * Extracts facts from a session turn's fluency data and merges them into the
 * persistent knowledge profile. Called after every assistant response.
 *
 * @param {object} session   The current session object (already saved)
 * @param {object} fluencyData  Parsed fluency object from the LLM
 * @param {string} language  Target language name
 * @returns {object}  Updated knowledge object
 */
export function extractAndMergeFacts(session, fluencyData, language) {
  const knowledge = loadKnowledge();

  // Guard: migrate old / malformed knowledge files that lack a `languages` key
  if (!knowledge.languages || typeof knowledge.languages !== 'object' || Array.isArray(knowledge.languages)) {
    knowledge.languages = {};
  }

  // Bootstrap language entry if first time
  if (!knowledge.languages[language]) {
    knowledge.languages[language] = {
      total_sessions: 0,
      total_messages: 0,
      avg_fluency: 0,
      fluency_trend: [],
      strong_topics: [],
      weak_topics: [],
      vocabulary_mastery: {}
    };
  }

  const lp = knowledge.languages[language]; // language profile shorthand

  // ── Session & message counts (derived from session files) ──
  const allSessions = listSessions().filter(s => s.language === language);
  lp.total_sessions = allSessions.length;
  lp.total_messages = allSessions.reduce((sum, s) => sum + s.message_count, 0);

  // ── Fluency trend ──
  if (fluencyData && typeof fluencyData.score === 'number' && fluencyData.score > 0) {
    lp.fluency_trend.push(fluencyData.score);
    if (lp.fluency_trend.length > 100) {
      lp.fluency_trend = lp.fluency_trend.slice(-100); // keep last 100
    }
    lp.avg_fluency = Math.round(
      lp.fluency_trend.reduce((a, b) => a + b, 0) / lp.fluency_trend.length
    );
  }

  // ── Vocabulary mastery ──
  if (fluencyData?.new_vocabulary && Array.isArray(fluencyData.new_vocabulary)) {
    for (const item of fluencyData.new_vocabulary) {
      const word = typeof item === 'string' ? item : item?.word;
      if (!word) continue;
      const meaning = typeof item === 'object' ? item.meaning || '' : '';

      if (!lp.vocabulary_mastery[word]) {
        lp.vocabulary_mastery[word] = {
          meaning,
          mastery: 0.0,
          uses: 0,
          first_seen: new Date().toISOString(),
          last_used: new Date().toISOString()
        };
      }
      const vm = lp.vocabulary_mastery[word];
      vm.uses += 1;
      vm.mastery = Math.min(1.0, vm.mastery + 0.08); // gradual growth
      vm.last_used = new Date().toISOString();
      if (meaning && !vm.meaning) vm.meaning = meaning;
    }
  }

  // ── Topic management ──
  if (fluencyData?.topics && Array.isArray(fluencyData.topics)) {
    for (const topic of fluencyData.topics) {
      if (!topic) continue;
      const inStrong = lp.strong_topics.includes(topic);
      const inWeak = lp.weak_topics.includes(topic);

      if (!inStrong && !inWeak) {
        // Brand-new topic starts as weak
        lp.weak_topics.push(topic);
      }

      // Promote weak → strong when fluency is consistently good
      if (fluencyData.score >= 70 && inWeak) {
        lp.weak_topics = lp.weak_topics.filter(t => t !== topic);
        if (!inStrong) lp.strong_topics.push(topic);
      }

      // Demote strong → weak if fluency drops
      if (fluencyData.score < 40 && inStrong) {
        lp.strong_topics = lp.strong_topics.filter(t => t !== topic);
        if (!inWeak) lp.weak_topics.push(topic);
      }
    }
  }

  saveKnowledge(knowledge);
  return knowledge;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SMART RAG ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Determines whether RAG context is needed for this message and, if so,
 * builds a compact context string to inject into the system prompt.
 *
 * Returns null if RAG is not needed (no keyword/topic overlap detected).
 */
export function buildRAGContext(message, language) {
  const knowledge = loadKnowledge();
  const lp = knowledge.languages?.[language];

  // No prior knowledge → nothing to recall
  if (!lp || Object.keys(lp.vocabulary_mastery).length === 0) {
    return null;
  }

  const msgLower = (message || '').toLowerCase();
  const knownWords = Object.keys(lp.vocabulary_mastery);

  // ── Keyword overlap check ──
  const matchedWords = knownWords.filter(w => msgLower.includes(w.toLowerCase()));

  // ── Topic overlap check ──
  const allTopics = [...(lp.strong_topics || []), ...(lp.weak_topics || [])];
  const matchedTopics = allTopics.filter(t => msgLower.includes(t.toLowerCase()));

  // If no overlap at all → skip RAG entirely
  if (matchedWords.length === 0 && matchedTopics.length === 0) {
    console.log('[chatMemory/RAG] No overlap detected — skipping RAG');
    return null;
  }

  console.log(`[chatMemory/RAG] Overlap found — ${matchedWords.length} words, ${matchedTopics.length} topics`);

  // ── Build compact context ──
  const parts = [];
  parts.push(`[LEARNER MEMORY — AUTO-RECALLED]`);
  parts.push(`Language: ${language} | Overall Fluency: ${lp.avg_fluency}/100 | Sessions: ${lp.total_sessions} | Messages: ${lp.total_messages}`);

  if (matchedWords.length > 0) {
    const details = matchedWords.slice(0, 15).map(w => {
      const vm = lp.vocabulary_mastery[w];
      return `"${w}" (${vm.meaning || '?'}, mastery ${Math.round(vm.mastery * 100)}%, ${vm.uses}× used)`;
    });
    parts.push(`Relevant known vocabulary: ${details.join(', ')}`);
  }

  if (lp.weak_topics.length > 0) {
    parts.push(`Weak areas needing reinforcement: ${lp.weak_topics.join(', ')}`);
  }
  if (lp.strong_topics.length > 0) {
    parts.push(`Already confident in: ${lp.strong_topics.join(', ')}`);
  }

  // Grab vocabulary the user is weakest at for targeted practice
  const weakVocab = Object.entries(lp.vocabulary_mastery)
    .filter(([, v]) => v.mastery < 0.4)
    .sort((a, b) => a[1].mastery - b[1].mastery)
    .slice(0, 8)
    .map(([w, v]) => `"${w}" (${v.meaning || '?'}, ${Math.round(v.mastery * 100)}%)`)
    .join(', ');

  if (weakVocab) {
    parts.push(`Low-mastery vocabulary to reinforce if relevant: ${weakVocab}`);
  }

  parts.push(`[END LEARNER MEMORY]`);

  return parts.join('\n');
}

// ─── Export Paths for External Use ────────────────────────────────────────────
export { SESSIONS_DIR, KNOWLEDGE_FILE };
