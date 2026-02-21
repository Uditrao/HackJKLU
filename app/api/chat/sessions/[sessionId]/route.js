import { NextResponse } from 'next/server';
import { loadSession, deleteSession } from '@/lib/chatMemory';

/**
 * GET /api/chat/sessions/[sessionId]
 * Returns the full session object including every message, fluency scores, etc.
 */
export async function GET(_request, { params }) {
  const { sessionId } = await params;
  const session = loadSession(sessionId);

  if (!session) {
    return NextResponse.json(
      { error: `Session "${sessionId}" not found.` },
      { status: 404 }
    );
  }

  return NextResponse.json(session);
}

/**
 * DELETE /api/chat/sessions/[sessionId]
 * Deletes a single session.
 */
export async function DELETE(_request, { params }) {
  const { sessionId } = await params;
  const deleted = deleteSession(sessionId);

  if (!deleted) {
    return NextResponse.json(
      { error: `Session "${sessionId}" not found.` },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    message: `Session "${sessionId}" deleted.`
  });
}
