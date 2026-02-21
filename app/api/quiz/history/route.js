import { NextResponse } from 'next/server';
import { listQuizzes, loadQuiz } from '@/lib/quizEngine';

/**
 * GET /api/quiz/history
 * Returns all past quizzes with full questions, answers, and grading.
 * Frontend can render a complete review screen from this data.
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const quizId = searchParams.get('quizId');

  // ── Single quiz detail view ──
  if (quizId) {
    const quiz = loadQuiz(quizId);
    if (!quiz) {
      return NextResponse.json({ error: `Quiz "${quizId}" not found.` }, { status: 404 });
    }
    return NextResponse.json(quiz);
  }

  // ── Full history list ──
  const quizzes = listQuizzes();

  return NextResponse.json({
    quizzes,
    count: quizzes.length,
    usage: {
      single_quiz: 'GET /api/quiz/history?quizId=<id> — returns full quiz with questions, answers, and grading',
      all_quizzes: 'GET /api/quiz/history — returns all quizzes (most recent first)'
    }
  });
}
