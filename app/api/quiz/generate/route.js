import { NextResponse } from 'next/server';
import { loadFullLearnerProfile, callLLM, saveQuiz } from '@/lib/quizEngine';

// ═══════════════════════════════════════════════════════════════════════════════
//  POST /api/quiz/generate — Generate a quiz from all learned vocabulary
// ═══════════════════════════════════════════════════════════════════════════════
export async function POST(request) {
  const startTime = Date.now();

  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { language, num_questions } = body;
  if (!language) {
    return NextResponse.json({ error: 'Missing required field: language' }, { status: 400 });
  }

  const questionCount = Math.min(Math.max(num_questions || 6, 4), 8);

  // ══════════════════════════════════════════════════════════════════════════════
  //  Load FULL learner profile from ALL memory sources
  // ══════════════════════════════════════════════════════════════════════════════
  const profile = loadFullLearnerProfile(language);

  if (profile.vocabulary.length < 4) {
    return NextResponse.json({
      error: 'Not enough vocabulary to generate a quiz. Learn at least 4 words with meanings first!',
      vocab_count: profile.vocab_count,
      suggestion: 'Use /api/chat or /api/generate to learn more words.'
    }, { status: 400 });
  }

  console.log(`[quiz/generate] Profile loaded — Level=${profile.level} Difficulty=${profile.difficulty} Vocab=${profile.vocab_count} Topics=${profile.chat_topics.length} Fluency=${profile.avg_fluency}`);

  // ── Pick target words: prioritize weak, sprinkle in some strong ──
  const weakWords = profile.vocabulary.filter(v => v.strength < 0.5);
  const strongWords = profile.vocabulary.filter(v => v.strength >= 0.5);
  const targetCount = Math.min(questionCount * 2, profile.vocabulary.length);

  // 70% weak words, 30% strong words for reinforcement
  const weakCount = Math.min(Math.ceil(targetCount * 0.7), weakWords.length);
  const strongCount = Math.min(targetCount - weakCount, strongWords.length);
  const targetWords = [
    ...weakWords.slice(0, weakCount),
    ...strongWords.slice(0, strongCount)
  ];

  // ══════════════════════════════════════════════════════════════════════════════
  //  Build comprehensive AI prompt with all learner context
  // ══════════════════════════════════════════════════════════════════════════════

  const systemPrompt = `You are an expert language quiz generator for a ${language} learning application.
Your task is to generate a quiz with EXACTLY ${questionCount} questions.

═══ LEARNER PROFILE ═══
• Level: ${profile.level}/10 (${profile.difficulty})
• Total XP: ${profile.memory.xp || 0}
• Known vocabulary count: ${profile.vocab_count}
• Average fluency score: ${profile.avg_fluency}/100
• Total chat sessions: ${profile.total_sessions}
• Strong topics: ${profile.strong_topics.length > 0 ? profile.strong_topics.join(', ') : 'None yet'}
• Weak topics: ${profile.weak_topics.length > 0 ? profile.weak_topics.join(', ') : 'None yet'}

═══ DIFFICULTY CALIBRATION ═══
${profile.difficulty === 'beginner' ? `BEGINNER MODE:
- Use only simple, high-frequency words
- MCQ distractors should be clearly different from correct answer
- Speaking sentences should be 2-4 words maximum
- Example speaking: "I want water" → "मुझे पानी चाहिए"
- Be generous — focus on building confidence` : ''}
${profile.difficulty === 'intermediate' ? `INTERMEDIATE MODE:
- Mix simple and moderately complex vocabulary
- MCQ distractors should be plausible but distinguishable
- Speaking sentences should be 4-6 words
- Example speaking: "Please give me hot coffee" → "कृपया मुझे गरम कॉफी दीजिए"
- Moderate difficulty — challenge but don't frustrate` : ''}
${profile.difficulty === 'advanced' ? `ADVANCED MODE:
- Use complex vocabulary and idiomatic expressions
- MCQ distractors should be subtle (similar meanings, related words)
- Speaking sentences should be 6-10 words with proper grammar
- Include verb conjugations and postpositions
- Challenge the learner meaningfully` : ''}
${profile.difficulty === 'expert' ? `EXPERT MODE:
- Use advanced vocabulary, idioms, and compound sentences
- MCQ distractors must be very close in meaning (near-synonyms)
- Speaking sentences should be 8+ words with complex structures
- Expect near-native level answers
- Be strict and demanding` : ''}

═══ QUESTION TYPES ═══

TYPE 1 — "listening_mcq" (Multiple Choice — Listening)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
How it works on the frontend:
1. A word in ${language} is played through the speaker (TTS)
2. The user sees 4 English options on screen
3. The user taps/clicks the option they think matches the spoken word
4. Frontend sends the selected option as the "answer" string

Your output for this type:
{
  "id": <number>,
  "type": "listening_mcq",
  "word": "<the ${language} word that will be spoken>",
  "word_romanized": "<romanized pronunciation for fallback>",
  "correct_answer": "<the correct English meaning>",
  "options": ["<option_A>", "<option_B>", "<option_C>", "<option_D>"],
  "audio_text": "<exact ${language} text for TTS to speak>"
}

Rules for listening_mcq:
- "options" MUST be an array of EXACTLY 4 unique English strings
- ONE of the 4 options MUST be the exact "correct_answer" string
- Distractors must be real English words, plausible, and from a similar domain
- Shuffle the position of the correct answer randomly — NOT always first or last
- The "word" and "audio_text" should be the same ${language} word

TYPE 2 — "speaking" (Voice Translation)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
How it works on the frontend:
1. An English sentence is displayed and read aloud (TTS)
2. The user speaks the ${language} translation into their microphone
3. Frontend uses Web Speech Recognition API to convert speech to text
4. Frontend sends the recognized text as the "answer" string
5. Backend AI compares the answer to the expected_answer during evaluation

Your output for this type:
{
  "id": <number>,
  "type": "speaking",
  "sentence_en": "<the English sentence to translate>",
  "expected_answer": "<the ideal ${language} translation>",
  "expected_answer_romanized": "<romanized version for comparison>",
  "acceptable_variations": ["<alt translation 1>", "<alt translation 2>"],
  "hint_words": [{"word": "<key word>", "meaning": "<meaning>"}],
  "audio_text": "<the English sentence for TTS>"
}

Rules for speaking:
- "sentence_en" must use vocabulary from the provided word list
- "expected_answer" must be in proper ${language} script
- "expected_answer_romanized" helps the evaluator match speech recognition output
- "acceptable_variations" should include 2-3 alternative correct translations
- "hint_words" should list 1-3 key vocabulary words with meanings as hints for the user
- The sentence should feel natural, not forced

═══ OUTPUT FORMAT ═══
Return ONLY a valid JSON object. NO markdown code fences. NO extra text before or after.

{
  "questions": [
    { ... type 1 question ... },
    { ... type 2 question ... },
    ...
  ],
  "quiz_metadata": {
    "theme": "<topic/theme of this quiz e.g. 'Daily Basics', 'Food & Drink'>",
    "focus_area": "<what skill this quiz tests e.g. 'listening comprehension', 'vocabulary recall'>",
    "estimated_difficulty": "<easy | medium | hard>"
  }
}

CRITICAL RULES:
1. Generate EXACTLY ${questionCount} questions with sequential IDs starting from 0
2. Mix types roughly equally — approximately half listening_mcq and half speaking
3. Every question MUST use words from the provided vocabulary list
4. Do NOT repeat the same word in multiple questions
5. All ${language} text MUST use the correct native script (Devanagari for Hindi, etc.)
6. Ensure all JSON is properly escaped and valid`;

  // ── Build the user message with all vocabulary data ──
  const vocabLines = targetWords.map((v, i) =>
    `${i + 1}. "${v.word}" = "${v.meaning}" (strength: ${Math.round(v.strength * 100)}%, source: ${v.source}${v.contexts.length > 0 ? ', used in: "' + v.contexts[0] + '"' : ''})`
  ).join('\n');

  const userMessage = `Generate a ${questionCount}-question ${language} quiz.

═══ VOCABULARY TO USE ═══
${vocabLines}

═══ LEARNER CONTEXT ═══
${profile.context_sentences.length > 0 ? `Recent sentences the learner has practiced:\n${profile.context_sentences.slice(-5).map(s => `• "${s}"`).join('\n')}` : 'No practice sentences yet.'}
${profile.chat_topics.length > 0 ? `\nTopics from recent chats: ${profile.chat_topics.join(', ')}` : ''}
${profile.weak_topics.length > 0 ? `\nWeak areas to focus on: ${profile.weak_topics.join(', ')}` : ''}

Generate the quiz now. Return ONLY the JSON.`;

  // ── Call LLM ──
  let quizData;
  try {
    quizData = await callLLM(systemPrompt, userMessage);
  } catch (err) {
    console.error('[quiz/generate] LLM failed:', err.message);
    return NextResponse.json({ error: 'Failed to generate quiz', details: err.message }, { status: 502 });
  }

  if (!quizData.questions || !Array.isArray(quizData.questions) || quizData.questions.length === 0) {
    return NextResponse.json({ error: 'AI returned invalid quiz format', raw: quizData }, { status: 502 });
  }

  // ── Validate and normalize question structure ──
  const validatedQuestions = quizData.questions.map((q, idx) => {
    q.id = idx; // ensure sequential IDs

    if (q.type === 'listening_mcq') {
      // Ensure correct_answer is in options
      if (!q.options || !Array.isArray(q.options)) q.options = [q.correct_answer, 'unknown', 'unclear', 'other'];
      if (!q.options.includes(q.correct_answer)) q.options[0] = q.correct_answer;
      q.options = q.options.slice(0, 4);
      while (q.options.length < 4) q.options.push('(no option)');
    }

    if (q.type === 'speaking') {
      if (!q.acceptable_variations) q.acceptable_variations = [];
      if (!q.hint_words) q.hint_words = [];
      if (!q.expected_answer_romanized) q.expected_answer_romanized = '';
    }

    return q;
  });

  // ── Build final quiz object ──
  const quizId = `quiz_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const quiz = {
    quizId,
    language,
    level: profile.level,
    difficulty: profile.difficulty,
    num_questions: validatedQuestions.length,
    questions: validatedQuestions,
    quiz_metadata: quizData.quiz_metadata || { theme: 'Mixed', focus_area: 'vocabulary', estimated_difficulty: profile.difficulty },
    learner_snapshot: {
      xp: profile.memory.xp,
      level: profile.level,
      vocab_count: profile.vocab_count,
      avg_fluency: profile.avg_fluency
    },
    status: 'pending',
    results: null,
    answers: null,
    created_at: new Date().toISOString(),
    completed_at: null
  };

  saveQuiz(quiz);

  const elapsed = Date.now() - startTime;
  console.log(`[quiz/generate] Quiz ${quizId} — ${quiz.num_questions} questions, ${quiz.difficulty}, ${elapsed}ms`);

  // ══════════════════════════════════════════════════════════════════════════════
  //  RESPONSE FORMAT — designed for frontend consumption
  // ══════════════════════════════════════════════════════════════════════════════
  return NextResponse.json({
    success: true,
    quizId: quiz.quizId,
    language: quiz.language,
    level: quiz.level,
    difficulty: quiz.difficulty,
    quiz_metadata: quiz.quiz_metadata,

    // ── Questions array: the frontend renders these ──
    // For listening_mcq: play audio_text via TTS, show options as buttons
    // For speaking: show sentence_en + hint_words, record user voice
    questions: quiz.questions,
    num_questions: quiz.num_questions,

    // ── How to submit answers ──
    evaluation_instructions: {
      endpoint: 'POST /api/quiz/evaluate',
      body_format: {
        quizId: quiz.quizId,
        answers: [
          { questionId: 0, answer: '<selected option string for MCQ or recognized speech text for speaking>' }
        ]
      },
      notes: [
        'For listening_mcq: send the exact option string the user selected',
        'For speaking: send the speech-to-text output from Web Speech API',
        'Include an answer object for every question, even if unanswered (send empty string)'
      ]
    },

    elapsed_ms: elapsed
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  GET /api/quiz/generate — API documentation
// ═══════════════════════════════════════════════════════════════════════════════
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/quiz/generate',
    method: 'POST',
    description: 'Generates a vocabulary quiz using ALL learned words from every memory source (words.json, memory.json, chat sessions, conversations, knowledge profile). Adapts difficulty to user level.',
    body: {
      language: 'string — required (e.g. "Hindi", "Japanese")',
      num_questions: 'number — optional, 4-8 (default 6)'
    },
    question_types: {
      listening_mcq: {
        description: 'Frontend plays a target-language word via TTS. User picks correct English meaning from 4 options.',
        frontend_flow: '1. Play audio_text → 2. Show options as buttons → 3. User taps one → 4. Send selected string as answer'
      },
      speaking: {
        description: 'Frontend shows an English sentence. User speaks the target-language translation. Frontend sends speech recognition text.',
        frontend_flow: '1. Show sentence_en + hint_words → 2. Record user voice → 3. Run Web Speech API → 4. Send recognized text as answer'
      }
    },
    next_step: 'POST /api/quiz/evaluate with quizId and answers array',
    related: {
      evaluate: 'POST /api/quiz/evaluate',
      history: 'GET /api/quiz/history'
    }
  });
}
