import fs from 'fs';
import path from 'path';

const STREAK_FILE = path.join(process.cwd(), 'data', 'daily_streak.json');

/**
 * Get today's date key in YYYY-MM-DD (local, IST-friendly via ISO slice)
 */
function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Load the streak JSON, defaulting to empty object on missing file.
 * Schema: { "YYYY-MM-DD": { hits: Number, last_hit: ISOString }, ... }
 */
export function loadStreakData() {
  try {
    if (fs.existsSync(STREAK_FILE)) {
      return JSON.parse(fs.readFileSync(STREAK_FILE, 'utf-8'));
    }
  } catch {}
  return {};
}

/**
 * Record one API hit for today. Returns updated today entry.
 */
export function recordHit() {
  const data = loadStreakData();
  const key = todayKey();
  const now = new Date().toISOString();

  if (!data[key]) {
    data[key] = { hits: 0, last_hit: now };
  }
  data[key].hits += 1;
  data[key].last_hit = now;

  fs.writeFileSync(STREAK_FILE, JSON.stringify(data, null, 2), 'utf-8');
  return data[key];
}

/**
 * Compute current consecutive active-day streak (ending on today or yesterday).
 * A day is "active" if it has >= 1 hit.
 */
export function computeStreak(data) {
  const keys = Object.keys(data).sort(); // oldest → newest
  if (keys.length === 0) return { current: 0, longest: 0, total_active_days: 0 };

  const today = todayKey();
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  // build a set for fast lookup
  const activeDays = new Set(keys.filter(k => data[k].hits > 0));

  // walk backwards from today
  let current = 0;
  let cursor = today;
  while (activeDays.has(cursor)) {
    current++;
    const d = new Date(cursor);
    d.setDate(d.getDate() - 1);
    cursor = d.toISOString().slice(0, 10);
  }
  // if today has no hit yet, allow streak to count from yesterday
  if (current === 0 && activeDays.has(yesterday)) {
    cursor = yesterday;
    while (activeDays.has(cursor)) {
      current++;
      const d = new Date(cursor);
      d.setDate(d.getDate() - 1);
      cursor = d.toISOString().slice(0, 10);
    }
  }

  // longest streak
  let longest = 0;
  let run = 0;
  let prev = null;
  for (const k of keys) {
    if (!activeDays.has(k)) { run = 0; prev = null; continue; }
    if (!prev) { run = 1; }
    else {
      const expected = new Date(prev);
      expected.setDate(expected.getDate() + 1);
      if (expected.toISOString().slice(0, 10) === k) { run++; }
      else { run = 1; }
    }
    longest = Math.max(longest, run);
    prev = k;
  }

  return {
    current,
    longest,
    total_active_days: activeDays.size,
    today_hits: data[today]?.hits || 0
  };
}

/**
 * Get last N days as array [{date, hits}], newest first.
 */
export function getRecentDays(data, n = 14) {
  const result = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(Date.now() - i * 86400000);
    const key = d.toISOString().slice(0, 10);
    result.push({
      date: key,
      day: d.toLocaleDateString('en-US', { weekday: 'short' }),
      hits: data[key]?.hits || 0,
      active: (data[key]?.hits || 0) > 0
    });
  }
  return result.reverse(); // oldest first for chart
}
