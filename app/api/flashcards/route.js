import { NextResponse } from 'next/server';
import { readJSON, writeJSON, DEFAULTS } from '@/lib/fileUtils';

/**
 * GET /api/flashcards
 * Returns all stored flashcards based on learned words.
 * By default, merges 'user_used' and 'scene_used' words, sorting them so lowest strength appears first.
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const filterType = searchParams.get('type'); // 'user_used', 'scene_used', or 'all_merged'

  const wordsData = readJSON('words.json', DEFAULTS['words.json']);
  
  // If old array format exists, return it, but ideally we use object structure
  if (Array.isArray(wordsData)) {
    return NextResponse.json({ total: wordsData.length, flashcards: wordsData });
  }

  let flashcards = [];

  if (filterType === 'user_used') {
    flashcards = [...wordsData.user_used];
  } else if (filterType === 'scene_used') {
    flashcards = [...wordsData.scene_used];
  } else {
    // Default: merging both
    flashcards = [...wordsData.user_used, ...wordsData.scene_used];
  }

  // Sort by strength ascending so WEAKEST words come first
  flashcards.sort((a, b) => (a.strength || 0) - (b.strength || 0));

  return NextResponse.json({
    total: flashcards.length,
    flashcards,
  });
}

/**
 * DELETE /api/flashcards
 * Resets all flashcards/words (for development/testing).
 */
export async function DELETE() {
  writeJSON('words.json', DEFAULTS['words.json']);
  return NextResponse.json({ success: true, message: 'Flashcards reset.' });
}
