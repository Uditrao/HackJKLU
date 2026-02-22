import { NextResponse } from 'next/server';
import { readJSON, writeJSON, DEFAULTS } from '@/lib/fileUtils';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);

// ─── NVIDIA client ────────────────────────────────────────────────────────────
// ─── Level XP Thresholds ─────────────────────────────────────────────────────
// Each level requires progressively more XP to reach the next one.
const LEVEL_THRESHOLDS = [
  0,     // Level 1 starts at 0 XP
  100,   // Level 2 starts at 100 XP
  250,   // Level 3
  500,   // Level 4
  800,   // Level 5
  1200,  // Level 6
  1700,  // Level 7
  2300,  // Level 8
  3000,  // Level 9
  4000,  // Level 10
];

function getLevel(xp) {
  let level = 1;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
      break;
    }
  }
  return level;
}

function getXPForNextLevel(level) {
  if (level >= LEVEL_THRESHOLDS.length) return null; // max level
  return LEVEL_THRESHOLDS[level]; // The XP threshold of the NEXT level
}

// ─── Difficulty tier based on level ──────────────────────────────────────────
function getDifficulty(level) {
  if (level <= 2) return 'beginner';
  if (level <= 4) return 'intermediate';
  if (level <= 7) return 'advanced';
  return 'expert';
}

// ─── System Prompt ────────────────────────────────────────────────────────────
function buildSystemPrompt(difficulty, level) {
  return `You are an NPC (non-player character) in a language-learning game AND an evaluation engine.
You play the role of a friendly character in the scene (e.g., a shopkeeper, teacher, waiter, etc.).

The player speaks to you in a target language. You must:

1. EVALUATE each task: Did the player's input complete the task? Score 0-100.
   - A task is "completed" if score >= 70
   - Meaning matters more than grammar
   - Accept Hinglish and natural variations
   - Minor spelling mistakes should not reduce score much

2. RESPOND IN CHARACTER as the NPC — write a short, natural reply in the SAME target language the player used.
   - If the player did well (score >= 70): respond positively and naturally, like a real person would.
   - If the player did poorly (score < 50): respond with confusion, gently correct them, and give a HINT showing how they could say it better.
   - If the player is in-between (50-69): acknowledge their attempt, give a small nudge or encouragement.

3. ADAPT to the player's level:
   - Current difficulty: "${difficulty}" (Level ${level})
   - For beginner: be very forgiving, use simple words in your NPC reply, give generous hints
   - For intermediate: expect better grammar, reply more naturally
   - For advanced: be strict with scoring, use complex sentences in NPC reply, minimal hints
   - For expert: expect near-native fluency, score harshly, respond with sophisticated language

4. EXTRACT VOCABULARY:
   - "words_to_add" MUST NOT BE EMPTY
   - Extract 1-3 meaningful words from the user's input (nouns, verbs, adjectives)
   - Include word, meaning, and the context sentence

Return ONLY a valid JSON object. NO extra text, NO markdown, NO code fences:

{
  "scene_id": "",
  "input_text": "",
  "tasks": [
    {
      "task_id": "",
      "score": 0,
      "completed": false,
      "feedback": ""
    }
  ],
  "npc_response": {
    "text": "<NPC's in-character reply in the target language>",
    "translation": "<English translation of the NPC reply>",
    "emotion": "<happy | confused | encouraging | impressed | neutral>"
  },
  "hint": "<If any task scored below 50, give a helpful hint here showing how to say it correctly. Otherwise set to null>",
  "xp_gained": 0,
  "words_to_add": [
    {
      "word": "",
      "meaning": "",
      "context_sentence": ""
    }
  ]
}`;
}

// ─── Call LLM with retry ──────────────────────────────────────────────────────
async function callLLM(systemPrompt, userMessage, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    console.log(`[process] LLM attempt ${attempt}/${retries}`);
    try {
      if(!process.env.NVIDIA_API_KEY){
        console.log("Please insert an api key in .env folder");
        return ;
      }
      const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NVIDIA_API_KEY}`
        },
        body: JSON.stringify({
          model: 'qwen/qwen3-next-80b-a3b-instruct',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
          ],
          temperature: 0.4,
          top_p: 0.95,
          max_tokens: 2048,
          stream: false
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      const fullContent = data.choices?.[0]?.message?.content || '';

      console.log('[process] Raw LLM response:', fullContent.slice(0, 400));

      // Strip markdown code fences if the model wraps the JSON
      const cleaned = fullContent
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();

      const parsed = JSON.parse(cleaned);
      return parsed;
    } catch (err) {
      console.error(`[process] LLM attempt ${attempt} failed:\n${err.message}`);
      if (attempt === retries) throw new Error(`LLM failed after ${retries} attempts: ${err.message}`);
    }
  }
}

// ─── Update words (User Used) ────────────────────────────────────────────────
function updateUserWords(wordsData, wordsToAdd) {
  if (Array.isArray(wordsData)) {
    wordsData = { all: wordsData, user_used: [...wordsData], scene_used: [] };
  }

  for (const { word, meaning, context_sentence } of wordsToAdd) {
    if (!word) continue;
    
    if (!wordsData.all.some((w) => w.word === word)) {
      wordsData.all.push({ word, meaning: meaning || '' });
    }

    const existingUser = wordsData.user_used.find((w) => w.word === word);
    if (existingUser) {
      existingUser.strength = Math.min(1, existingUser.strength + 0.1);
      existingUser.context = context_sentence || existingUser.context;
      existingUser.meaning = meaning || existingUser.meaning;
    } else {
      wordsData.user_used.push({ 
        word, 
        meaning: meaning || '', 
        context: context_sentence || '', 
        strength: 0.5 
      });
    }

    wordsData.scene_used = wordsData.scene_used.filter((w) => w.word !== word);
  }
  
  return wordsData;
}

// ─── POST /api/process ────────────────────────────────────────────────────────
export async function POST(request) {
  const startTime = Date.now();
  console.log('[process] Received POST request');

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { scene_id, user_input, tasks, scene_context } = body;

  if (!scene_id || !user_input || !Array.isArray(tasks) || tasks.length === 0) {
    return NextResponse.json(
      { error: 'Missing required fields: scene_id, user_input, tasks (array)' },
      { status: 400 }
    );
  }

  console.log(`[process] scene_id=${scene_id} input="${user_input}"`);

  // 1. Read memory
  const memory = readJSON('memory.json', DEFAULTS['memory.json']);
  const currentLevel = getLevel(memory.xp || 0);
  const difficulty = getDifficulty(currentLevel);
  const xpForNext = getXPForNextLevel(currentLevel);

  console.log(`[process] Player level=${currentLevel} difficulty=${difficulty} xp=${memory.xp}`);

  // 2. Build dynamic system prompt based on player level
  const systemPrompt = buildSystemPrompt(difficulty, currentLevel);

  // 3. Build user message for LLM with full context
  const userMessage = `
Scene ID: ${scene_id}
${scene_context ? `Scene Context: ${scene_context}` : ''}
Player Level: ${currentLevel} (${difficulty})
Player XP: ${memory.xp}

User Input: "${user_input}"

Tasks to evaluate:
${JSON.stringify(tasks, null, 2)}

Evaluate the user input, respond in character as the NPC, and return ONLY the JSON.
`.trim();

  // 4. Call LLM
  let llmResult;
  try {
    llmResult = await callLLM(systemPrompt, userMessage);
  } catch (err) {
    console.error('[process] LLM failed completely:', err.message);
    return NextResponse.json({ error: 'LLM evaluation failed', details: err.message }, { status: 502 });
  }

  // 5. Validate LLM response shape
  if (!llmResult.tasks || !Array.isArray(llmResult.tasks)) {
    return NextResponse.json({ error: 'LLM returned unexpected format', raw: llmResult }, { status: 502 });
  }

  // 6. Calculate XP
  const computedXP = llmResult.tasks.reduce((sum, t) => sum + Math.floor((t.score || 0) / 5), 0);
  const xpGained = computedXP;

  // 7. Update memory
  memory.xp = (memory.xp || 0) + xpGained;
  const newLevel = getLevel(memory.xp);
  const leveledUp = newLevel > currentLevel;
  memory.level = newLevel;
  memory.difficulty = getDifficulty(newLevel);

  // Track words learned
  if (!memory.words_learned || typeof memory.words_learned !== 'object') {
    memory.words_learned = {};
  }
  for (const word of llmResult.words_to_add || []) {
    if (word.word) {
      memory.words_learned[word.word] = (memory.words_learned[word.word] || 0) + 1;
    }
  }

  writeJSON('memory.json', memory);

  // 8. Store conversation
  const conversations = readJSON('conversations.json', DEFAULTS['conversations.json']);
  const conversationEntry = {
    id: `conv_${Date.now()}`,
    timestamp: new Date().toISOString(),
    scene_id,
    user_input,
    tasks,
    evaluation: llmResult,
    xp_gained: xpGained,
    memory_after: { xp: memory.xp, level: memory.level, difficulty: memory.difficulty },
  };
  conversations.push(conversationEntry);
  writeJSON('conversations.json', conversations);

  // 9. Update words.json (User Used words)
  const wordsData = readJSON('words.json', DEFAULTS['words.json']);
  const updatedWords = updateUserWords(wordsData, llmResult.words_to_add || []);
  writeJSON('words.json', updatedWords);

  const elapsed = Date.now() - startTime;
  console.log(`[process] Done in ${elapsed}ms. XP +${xpGained}. Total XP: ${memory.xp}. Level: ${memory.level}`);

  // 10. Execute Piper local TTS for NPC response ──────────────────────────────
  let audioBase64 = null;
  if (llmResult.npc_response && llmResult.npc_response.text) {
    try {
      const npcText = llmResult.npc_response.text;
      const piperDir = path.join(process.cwd(), 'piper');
      const textFile = path.join(piperDir, 'temp_input.txt');
      const outputFile = path.join(piperDir, 'output.wav');

      // Write text to a file so Windows CMD doesn't mangle quotes
      await fs.promises.writeFile(textFile, npcText, 'utf8');

      console.log(`[process] Running Piper TTS for NPC response: "${npcText}"`);
      await execAsync(`piper.exe --model models/hi_IN-priyamvada-medium.onnx --output_file output.wav < temp_input.txt`, {
        cwd: piperDir
      });

      const audioBuffer = await fs.promises.readFile(outputFile);
      audioBase64 = audioBuffer.toString('base64');

      // Cleanup
      await fs.promises.unlink(textFile).catch(() => {});
      await fs.promises.unlink(outputFile).catch(() => {});

      console.log(`[process] Successfully generated NPC audio (${audioBase64.length} chars)`);
    } catch (err) {
      console.error('[process] Failed to run Piper TTS for NPC:', err.message);
    }
  }

  // 11. Return full result
  return NextResponse.json({
    success: true,
    scene_id,
    user_input,

    // NPC response for the frontend to display/speak
    npc_response: {
      ...(llmResult.npc_response || {}),
      audio_base64: audioBase64
    },

    // Hint if the player needs help
    hint: llmResult.hint || null,

    // Task evaluation details
    evaluation: {
      tasks: llmResult.tasks,
      words_to_add: llmResult.words_to_add || [],
    },

    // XP and leveling
    xp_gained: xpGained,
    memory: {
      xp: memory.xp,
      level: memory.level,
      difficulty: memory.difficulty,
      xp_for_next_level: getXPForNextLevel(memory.level),
    },
    leveled_up: leveledUp,

    flashcards_updated: (llmResult.words_to_add || []).length,
    elapsed_ms: elapsed,
  });
}

// ─── GET /api/process → usage info ───────────────────────────────────────────
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/process',
    method: 'POST',
    description: 'Main game brain. Evaluates user input, returns NPC response, hints, XP, and adaptive difficulty.',
    body: {
      scene_id: 'string',
      user_input: 'string (what the player said)',
      scene_context: 'string (optional — describe the scene, e.g. "You are at a tea stall")',
      tasks: [{ task_id: 'string', expected_intent: 'string', keywords: ['string'] }],
    },
    level_thresholds: LEVEL_THRESHOLDS,
    difficulties: ['beginner (1-2)', 'intermediate (3-4)', 'advanced (5-7)', 'expert (8-10)'],
  });
}
