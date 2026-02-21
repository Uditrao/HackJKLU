import { NextResponse } from 'next/server';
import { readJSON, writeJSON, DEFAULTS } from '@/lib/fileUtils';
import { loadQuiz, saveQuiz, callLLM, getLevel, getDifficulty } from '@/lib/quizEngine';
import { recordHit } from '@/lib/streakTracker';

// ═══════════════════════════════════════════════════════════════════════════════
//  POST /api/quiz/evaluate — Submit answers, AI evaluates, awards XP
// ═══════════════════════════════════════════════════════════════════════════════
export async function POST(request) {
  const startTime = Date.now();
  recordHit(); // track active day for streak

  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { quizId, answers } = body;
  if (!quizId || !Array.isArray(answers)) {
    return NextResponse.json({
      error: 'Missing required fields: quizId, answers',
      expected_format: {
        quizId: 'string',
        answers: [{ questionId: 0, answer: 'string' }]
      }
    }, { status: 400 });
  }

  // ── Load the quiz ──
  const quiz = loadQuiz(quizId);
  if (!quiz) {
    return NextResponse.json({ error: `Quiz "${quizId}" not found.` }, { status: 404 });
  }
  if (quiz.status === 'completed') {
    return NextResponse.json({
      error: 'This quiz has already been evaluated.',
      results: quiz.results,
      question_results: quiz.results?.question_results || []
    }, { status: 400 });
  }

  // ══════════════════════════════════════════════════════════════════════════════
  //  STEP 1: Grade MCQs instantly (exact string match — no AI needed)
  // ══════════════════════════════════════════════════════════════════════════════
  const questionResults = [];
  const speakingForAI = [];

  for (const q of quiz.questions) {
    const userAnswer = answers.find(a => a.questionId === q.id);
    const answered = (userAnswer?.answer || '').trim();

    if (q.type === 'listening_mcq') {
      const isCorrect = answered.toLowerCase() === (q.correct_answer || '').toLowerCase();
      questionResults.push({
        questionId: q.id,
        type: 'listening_mcq',
        word: q.word,
        word_romanized: q.word_romanized || '',
        user_answer: answered,
        correct_answer: q.correct_answer,
        options: q.options,
        correct: isCorrect,
        score: isCorrect ? 100 : 0,
        feedback: isCorrect
          ? '✅ Correct! Great listening skills.'
          : `❌ Incorrect. "${q.word}" means "${q.correct_answer}".`
      });
    } else if (q.type === 'speaking') {
      speakingForAI.push({
        questionId: q.id,
        sentence_en: q.sentence_en,
        expected_answer: q.expected_answer,
        expected_answer_romanized: q.expected_answer_romanized || '',
        acceptable_variations: q.acceptable_variations || [],
        user_answer: answered
      });
    }
  }

  // ══════════════════════════════════════════════════════════════════════════════
  //  STEP 2: AI-evaluate speaking questions (batched in ONE call)
  // ══════════════════════════════════════════════════════════════════════════════
  if (speakingForAI.length > 0) {
    const systemPrompt = `You are a ${quiz.language} language quiz evaluator.
Learner level: ${quiz.level}/10 (${quiz.difficulty}).

You will receive speaking quiz answers where the learner was asked to translate English sentences into ${quiz.language}.
The user's answer comes from speech recognition (Web Speech API), so it may be:
- In romanized/transliterated form (e.g. "mujhe garam coffee chahiye" instead of "मुझे गरम कॉफी चाहिए")
- Have minor transcription errors from speech-to-text
- Use informal/colloquial phrasing

EVALUATION RULES:
1. MEANING is most important — if the core meaning matches, give a good score
2. Accept romanized text as valid (compare phonetically to the expected ${quiz.language} answer)
3. Accept Hinglish, mixed-script, and informal alternatives
4. Minor spelling/transcription errors should reduce score only slightly
5. Empty or nonsensical answers = score 0-10
6. Compare against expected_answer AND acceptable_variations

SCORING RUBRIC:
- 90-100: Perfect or near-perfect match (meaning + grammar correct)
- 75-89: Correct meaning with minor grammar/word-order issues
- 60-74: Mostly correct, understandable but has noticeable errors
- 40-59: Partially correct, some key words present but meaning unclear
- 20-39: Poor attempt, very few correct elements
- 0-19: Wrong, empty, or unintelligible

A question is marked "correct" if score >= 60.

Return ONLY valid JSON (no markdown, no extra text):
{
  "evaluations": [
    {
      "questionId": <number>,
      "score": <0-100>,
      "correct": <true/false>,
      "feedback": "<specific, encouraging feedback explaining what was right/wrong>",
      "corrected_answer": "<the ideal ${quiz.language} answer>",
      "pronunciation_tip": "<optional tip for better pronunciation>"
    }
  ]
}`;

    const userMessage = `Evaluate these ${speakingForAI.length} speaking answers:

${speakingForAI.map((sq, i) => `
Question ${sq.questionId}:
  English prompt: "${sq.sentence_en}"
  Expected ${quiz.language}: "${sq.expected_answer}"
  Romanized expected: "${sq.expected_answer_romanized}"
  Acceptable alternatives: ${JSON.stringify(sq.acceptable_variations)}
  User's answer (from speech recognition): "${sq.user_answer}"
`).join('\n---\n')}

Grade each one carefully. Return the JSON.`;

    try {
      const aiResult = await callLLM(systemPrompt, userMessage);
      if (aiResult.evaluations && Array.isArray(aiResult.evaluations)) {
        for (const ev of aiResult.evaluations) {
          const orig = speakingForAI.find(q => q.questionId === ev.questionId);
          questionResults.push({
            questionId: ev.questionId,
            type: 'speaking',
            sentence_en: orig?.sentence_en || '',
            user_answer: orig?.user_answer || '',
            expected_answer: orig?.expected_answer || '',
            corrected_answer: ev.corrected_answer || orig?.expected_answer || '',
            pronunciation_tip: ev.pronunciation_tip || '',
            correct: ev.correct || false,
            score: typeof ev.score === 'number' ? Math.max(0, Math.min(100, ev.score)) : 0,
            feedback: ev.feedback || 'No feedback available.'
          });
        }
      }
    } catch (err) {
      console.error('[quiz/evaluate] AI evaluation failed:', err.message);
      for (const sq of speakingForAI) {
        questionResults.push({
          questionId: sq.questionId,
          type: 'speaking',
          sentence_en: sq.sentence_en,
          user_answer: sq.user_answer,
          expected_answer: sq.expected_answer,
          corrected_answer: sq.expected_answer,
          correct: false,
          score: 0,
          feedback: '⚠️ AI could not evaluate this answer. Please try again.'
        });
      }
    }
  }

  // Sort results by question ID for consistent frontend rendering
  questionResults.sort((a, b) => a.questionId - b.questionId);

  // ══════════════════════════════════════════════════════════════════════════════
  //  STEP 3: Calculate totals and award XP
  // ══════════════════════════════════════════════════════════════════════════════
  const totalQuestions = questionResults.length;
  const correctCount = questionResults.filter(r => r.correct).length;
  const totalScore = totalQuestions > 0
    ? Math.round(questionResults.reduce((s, r) => s + r.score, 0) / totalQuestions)
    : 0;

  // XP formula: (avg_score / 100) × num_questions × 5
  // Max XP per quiz: 8 × 5 = 40 XP
  const xpEarned = Math.round((totalScore / 100) * totalQuestions * 5);

  // ── Update player memory ──
  const memory = readJSON('memory.json', DEFAULTS['memory.json']);
  const oldLevel = getLevel(memory.xp || 0);
  memory.xp = (memory.xp || 0) + xpEarned;
  const newLevel = getLevel(memory.xp);
  memory.level = newLevel;
  memory.difficulty = getDifficulty(newLevel);
  const leveledUp = newLevel > oldLevel;
  writeJSON('memory.json', memory);

  // ══════════════════════════════════════════════════════════════════════════════
  //  STEP 4: Save completed quiz with full grading
  // ══════════════════════════════════════════════════════════════════════════════
  quiz.status = 'completed';
  quiz.completed_at = new Date().toISOString();
  quiz.answers = answers;
  quiz.results = {
    question_results: questionResults,
    total_score: totalScore,
    correct_count: correctCount,
    total_questions: totalQuestions,
    xp_earned: xpEarned,
    leveled_up: leveledUp,
    graded_at: new Date().toISOString()
  };
  saveQuiz(quiz);

  const elapsed = Date.now() - startTime;
  console.log(`[quiz/evaluate] Quiz ${quizId} — Score: ${totalScore}/100, ${correctCount}/${totalQuestions} correct, +${xpEarned} XP, Level ${oldLevel}→${newLevel}, ${elapsed}ms`);

  // ══════════════════════════════════════════════════════════════════════════════
  //  RESPONSE — designed for frontend to render a results screen
  // ══════════════════════════════════════════════════════════════════════════════
  return NextResponse.json({
    success: true,
    quizId,

    // ── Summary for results header ──
    summary: {
      total_score: totalScore,
      correct_count: correctCount,
      total_questions: totalQuestions,
      percentage: `${totalScore}%`,
      grade: totalScore >= 90 ? 'A+' : totalScore >= 80 ? 'A' : totalScore >= 70 ? 'B' : totalScore >= 60 ? 'C' : totalScore >= 50 ? 'D' : 'F',
      message: totalScore >= 90 ? '🌟 Outstanding! You nailed it!'
        : totalScore >= 70 ? '🎯 Great job! Keep it up!'
        : totalScore >= 50 ? '💪 Good effort! Practice makes perfect.'
        : '📖 Keep learning! Review the corrections below.',
    },

    // ── XP and leveling ──
    xp: {
      xp_earned: xpEarned,
      total_xp: memory.xp,
      level: memory.level,
      difficulty: memory.difficulty,
      leveled_up: leveledUp
    },

    // ── Per-question results for detail view ──
    // Each item has: questionId, type, user_answer, correct_answer, correct, score, feedback
    question_results: questionResults,

    elapsed_ms: elapsed
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  GET /api/quiz/evaluate — API docs
// ═══════════════════════════════════════════════════════════════════════════════
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/quiz/evaluate',
    method: 'POST',
    description: 'Submit quiz answers for grading. MCQs graded instantly; speaking answers AI-evaluated with flexible matching. Awards XP.',
    body: {
      quizId: 'string — from /api/quiz/generate response',
      answers: [
        { questionId: 0, answer: '"hot" for MCQ or "mujhe garam coffee chahiye" for speaking (from speech recognition)' }
      ]
    },
    response_structure: {
      summary: 'total_score, grade (A+ to F), message',
      xp: 'xp_earned, total_xp, level, leveled_up',
      question_results: 'Array with per-question grading, feedback, and corrections'
    }
  });
}
