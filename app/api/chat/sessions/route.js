import { NextResponse } from 'next/server';
import { listSessions, deleteAllSessions } from '@/lib/chatMemory';

/**
 * GET /api/chat/sessions
 * Returns a lightweight list of all chat sessions (no full message history).
 */
export async function GET() {
  const sessions = listSessions();
  return NextResponse.json({
    sessions,
    count: sessions.length
  });
}

/**
 * DELETE /api/chat/sessions
 * Clears ALL chat sessions.
 */
export async function DELETE() {
  const count = deleteAllSessions();
  return NextResponse.json({
    success: true,
    message: `Deleted ${count} session(s).`
  });
}
