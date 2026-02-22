import { NextResponse } from 'next/server';
import { readJSON, writeJSON, DEFAULTS } from '@/lib/fileUtils';
import OpenAI from 'openai';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);

// ─── NVIDIA / DeepSeek client ─────────────────────────────────────────────────
const client = new OpenAI({
  baseURL: 'https://integrate.api.nvidia.com/v1',
  apiKey: process.env.NVIDIA_API_KEY ,
});

// ─── System Prompt ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a dynamic language learning content generator. 
The user is playing an interactive game and has pointed at or encountered a situation described by an "outline".
Your task is to generate a single, natural, and highly useful sentence in the requested target language that perfectly fits the outline.

Rules:
- Generate ONLY a valid JSON object. Absolutely NO extra text, no markdown framing, no code fences.
- The output JSON must match this exact format:
{
  "sentence": "<The main sentence in the target language>",
  "translation": "<English translation of the sentence>",
  "vocabulary": [
    { "word": "<word in target language>", "meaning": "<english meaning>" }
  ]
}
- Do not add any explanatory text before or after the JSON.`;

async function callLLM(outline, language, retries = 3) {
  const userMessage = `Outline: ${outline}\nTarget Language: ${language}`;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    console.log(`[generate] LLM attempt ${attempt}/${retries}`);
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
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userMessage }
          ],
          temperature: 0.6,
          top_p: 0.95,
          max_tokens: 1024,
          stream: false // Non-streaming to easily capture API errors as text
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      const fullContent = data.choices?.[0]?.message?.content || '';

      console.log('[generate] Raw LLM response:', fullContent.slice(0, 300));

      const cleaned = fullContent
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();

      return JSON.parse(cleaned);
    } catch (err) {
      console.error(`[generate] LLM attempt ${attempt} failed:\n${err.message}`);
      if (attempt === retries) throw new Error(`LLM failed: ${err.message}`);
    }
  }
}

// ─── Save Scene Words ─────────────────────────────────────────────────────────
function saveSceneWords(wordsData, vocabularyList) {
  if (Array.isArray(wordsData)) {
    wordsData = { all: wordsData, user_used: [...wordsData], scene_used: [] };
  }

  for (const { word, meaning } of vocabularyList) {
    if (!word) continue;

    // 1. Add to 'all' list
    if (!wordsData.all.some((w) => w.word === word)) {
      wordsData.all.push({ word, meaning: meaning || '' });
    }

    // 2. Add to 'scene_used' ONLY if it's not already in 'user_used'
    const alreadyUsedByUser = wordsData.user_used.some((w) => w.word === word);
    if (!alreadyUsedByUser) {
      const existingSceneWord = wordsData.scene_used.find((w) => w.word === word);
      if (!existingSceneWord) {
        wordsData.scene_used.push({ 
          word, 
          meaning: meaning || '',
          strength: 0 // Flashcard logic prioritizes low strength 
        });
      }
    }
  }

  return wordsData;
}

export async function POST(request) {
  const startTime = Date.now();
  console.log('[generate] Received POST request');

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { outline, language } = body;

  if (!outline || !language) {
    return NextResponse.json(
      { error: 'Missing required fields: outline, language' },
      { status: 400 }
    );
  }

  try {
    const generatedData = await callLLM(outline, language);
    
    // Save generated vocabulary as scene_used words
    if (generatedData.vocabulary && Array.isArray(generatedData.vocabulary)) {
      const wordsData = readJSON('words.json', DEFAULTS['words.json']);
      const updatedWords = saveSceneWords(wordsData, generatedData.vocabulary);
      writeJSON('words.json', updatedWords);
    }
    
    // ─── Execute Piper local TTS ──────────────────────────────────────────────
    let audioBase64 = null;
    try {
      const sentence = generatedData.sentence;
      const piperDir = path.join(process.cwd(), 'piper');
      const textFile = path.join(piperDir, 'temp_input.txt');
      const outputFile = path.join(piperDir, 'output.wav');

      // Write sentence to file to avoid cmd.exe escaping issues with echo
      await fs.promises.writeFile(textFile, sentence, 'utf8');

      console.log(`[generate] Running Piper TTS for sentence: "${sentence}"`);
      // Run piper CLI
      await execAsync(`piper.exe --model models/hi_IN-priyamvada-medium.onnx --output_file output.wav < temp_input.txt`, {
        cwd: piperDir
      });

      // Read audio output back
      const audioBuffer = await fs.promises.readFile(outputFile);
      audioBase64 = audioBuffer.toString('base64');

      // Cleanup temp files
      await fs.promises.unlink(textFile).catch(() => {});
      await fs.promises.unlink(outputFile).catch(() => {});
      
      console.log(`[generate] Successfully generated TTS audio (${audioBase64.length} chars base64)`);
    } catch (piperErr) {
      console.error('[generate] Failed to run local Piper TTS:', piperErr);
      // We will still send the text response even if TTS fails
    }

    const elapsed = Date.now() - startTime;
    
    return NextResponse.json({
      success: true,
      ...generatedData,
      audio_base64: audioBase64,
      elapsed_ms: elapsed
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to generate contextual sentence', details: error.message },
      { status: 502 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: '/api/generate',
    method: 'POST',
    description: 'Generates a contextual sentence in a target language based on an outline.',
    body: {
      outline: 'string (e.g., "use word hot and something related to mug and coffee")',
      language: 'string (e.g., "Hindi")'
    }
  });
}
