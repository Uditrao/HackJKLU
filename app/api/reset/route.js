import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

// Default states to reset each file to
const DEFAULTS = {
  'memory.json': { xp: 0, level: 1, difficulty: 'beginner', words_learned: {} },
  'conversations.json': [],
  'words.json': [],
  // Must match DEFAULT_KNOWLEDGE in lib/chatMemory.js
  'chat_knowledge.json': { languages: {}, last_updated: null },
  'daily_streak.json': { streak: 0, last_date: null, history: [] },
};

function clearDir(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    try { fs.unlinkSync(filePath); } catch { /* ignore */ }
  }
}

export async function POST() {
  try {
    // 1. Reset each data file to its default
    for (const [filename, defaultVal] of Object.entries(DEFAULTS)) {
      const filePath = path.join(DATA_DIR, filename);
      fs.writeFileSync(filePath, JSON.stringify(defaultVal, null, 2), 'utf-8');
    }

    // 2. Clear all chat sessions
    clearDir(path.join(DATA_DIR, 'chat_sessions'));

    // 3. Clear all quiz history
    clearDir(path.join(DATA_DIR, 'quiz_history'));

    console.log('[reset] All data files reset to defaults');

    return NextResponse.json({
      success: true,
      message: 'All progress has been reset. Welcome back, beginner! 🌱',
    });
  } catch (err) {
    console.error('[reset] Error:', err);
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 }
    );
  }
}
