import { NextResponse } from 'next/server';
import { readJSON, writeJSON, DEFAULTS } from '@/lib/fileUtils';

/**
 * GET /api/memory
 * Returns the current player memory (XP, level, words_learned).
 */
export async function GET() {
  const memory = readJSON('memory.json', DEFAULTS['memory.json']);
  return NextResponse.json(memory);
}

/**
 * DELETE /api/memory
 * Resets memory to default (development/testing).
 */
export async function DELETE() {
  writeJSON('memory.json', DEFAULTS['memory.json']);
  return NextResponse.json({ success: true, message: 'Memory reset to default.' });
}
