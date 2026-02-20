import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

/** Ensure the data directory exists */
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/** Safely read a JSON file, returning a default value if missing or corrupt */
export function readJSON(filename, defaultValue) {
  ensureDataDir();
  const filePath = path.join(DATA_DIR, filename);
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`[fileUtils] ${filename} not found — creating with default value`);
      writeJSON(filename, defaultValue);
      return defaultValue;
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`[fileUtils] Error reading ${filename}:`, err.message);
    console.log(`[fileUtils] Resetting ${filename} to default`);
    writeJSON(filename, defaultValue);
    return defaultValue;
  }
}

/** Safely write a JSON file */
export function writeJSON(filename, data) {
  ensureDataDir();
  const filePath = path.join(DATA_DIR, filename);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`[fileUtils] Wrote ${filename}`);
  } catch (err) {
    console.error(`[fileUtils] Error writing ${filename}:`, err.message);
    throw err;
  }
}

/** Default shapes for each data file */
export const DEFAULTS = {
  'memory.json': { xp: 0, level: 1, difficulty: 'beginner', words_learned: {} },
  'flashcards.json': [],
  'conversations.json': [],
  'words.json': {
    all: [],
    user_used: [],
    scene_used: [],
  },
};
