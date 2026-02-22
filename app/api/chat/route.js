import { NextResponse } from 'next/server';
import {
  loadSession, saveSession, createSession,
  extractAndMergeFacts, buildRAGContext, createActiveMemory
} from '@/lib/chatMemory';
import { recordHit } from '@/lib/streakTracker';

// ─── Constants ────────────────────────────────────────────────────────────────
const NVIDIA_API_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY
const MODEL = 'qwen/qwen3-next-80b-a3b-instruct'; // Faster text-only model
const FLUENCY_MARKER = '|||FLUENCY_DATA|||';
const MAX_HISTORY_TURNS = 20; // cap context window for speed

// ─── System Prompt Builder ────────────────────────────────────────────────────
function buildSystemPrompt(language, ragContext) {
  if(!NVIDIA_API_KEY){
    console.log("Please insert an api key in .env folder");
    return ;
  }
  let prompt = `You are an expert, warm, and adaptive multilingual language tutor. You help users practice and learn ${language} through natural conversation.

CORE RULES:
1. ALWAYS respond primarily in ${language} — use natural, conversational sentences appropriate to the learner's level.
2. After your ${language} response, give a concise English translation in parentheses.
3. Correct mistakes gently — rephrase what the user said correctly, highlight the fix, and explain briefly.
4. Introduce 1-3 new vocabulary words per response when natural. Bold them like **word** and give the meaning.
5. Keep responses concise (1-3 sentences max) to ensure fast responses, unless the user asks for detailed explanations.
6. Be encouraging and culturally aware.

FLUENCY EVALUATION (MANDATORY — include at the END of every response):
After your conversational reply, output the following marker on its own line, followed immediately by a valid JSON object on the SAME line. Do NOT add any text after the JSON.

${FLUENCY_MARKER}{"score": <0-100>, "feedback": "<one-sentence feedback on the user's ${language} usage>", "new_vocabulary": [{"word": "<${language} word>", "meaning": "<English meaning>"}], "topics": ["<topic discussed>"], "suggestions": ["<one actionable improvement tip>"]}

Scoring rubric:
- Grammar correctness: 0-30 pts
- Vocabulary richness & appropriateness: 0-30 pts
- Naturalness & fluency: 0-25 pts
- Contextual appropriateness: 0-15 pts
If user wrote in English only, score 5-20 based on engagement with ${language} learning.`;

  if (ragContext) {
    prompt += `\n\n${ragContext}`;
    prompt += `\nUse the above learner memory to personalize your teaching. Reinforce weak vocabulary naturally. Build upon known words. Do NOT mention you have a "memory" or "database" — seamlessly weave this knowledge into your responses.`;
  }

  return prompt;
}

// ─── Message Array Builder ────────────────────────────────────────────────────
function buildMessages(session, userMessage, images, systemPrompt) {
  const messages = [{ role: 'system', content: systemPrompt }];

  // Include recent history (cap for speed)
  const history = session.messages.slice(-MAX_HISTORY_TURNS);
  for (const msg of history) {
    messages.push({ role: msg.role, content: msg.content });
  }

  // Build current user turn with text
  messages.push({ role: 'user', content: userMessage });

  return messages;
}

// ─── Fluency Data Parser ──────────────────────────────────────────────────────
function parseFluencyData(fullText) {
  const idx = fullText.indexOf(FLUENCY_MARKER);
  const defaultFluency = {
    score: 0,
    feedback: 'Could not evaluate fluency this turn.',
    new_vocabulary: [],
    topics: [],
    suggestions: []
  };

  if (idx === -1) {
    return { responseText: fullText.trim(), fluencyData: defaultFluency };
  }

  const responseText = fullText.substring(0, idx).trim();
  const jsonStr = fullText.substring(idx + FLUENCY_MARKER.length).trim();

  try {
    const match = jsonStr.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      return {
        responseText,
        fluencyData: {
          score: typeof parsed.score === 'number' ? parsed.score : 0,
          feedback: parsed.feedback || '',
          new_vocabulary: Array.isArray(parsed.new_vocabulary) ? parsed.new_vocabulary : [],
          topics: Array.isArray(parsed.topics) ? parsed.topics : [],
          suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : []
        }
      };
    }
  } catch (err) {
    console.error('[chat] Fluency JSON parse error:', err.message);
  }

  return { responseText, fluencyData: defaultFluency };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  POST /api/chat — Main streaming chat endpoint
// ═══════════════════════════════════════════════════════════════════════════════
export async function POST(request) {
  const startTime = Date.now();

  // ── Parse body ──
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { sessionId: inputSessionId, message, images, language, enableThinking } = body;

  if (!message || !language) {
    return NextResponse.json(
      { error: 'Missing required fields: message, language' },
      { status: 400 }
    );
  }

  // ── Session Memory: load or create ──
  const sessionId = inputSessionId || `chat_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  let session = loadSession(sessionId);
  if (!session) {
    session = createSession(sessionId, language);
    console.log(`[chat] New session created: ${sessionId}`);
  }

  // ── Smart RAG: only when relevant ──
  const ragContext = buildRAGContext(message, language);
  console.log(`[chat] RAG ${ragContext ? 'ACTIVATED ✓' : 'SKIPPED ✗'} | session=${sessionId}`);

  // ── Active Memory (ephemeral) ──
  createActiveMemory(session, ragContext, []);

  // ── Build LLM payload ──
  const systemPrompt = buildSystemPrompt(language, ragContext);
  const apiMessages = buildMessages(session, message, [], systemPrompt);

  const payload = {
    model: MODEL,
    messages: apiMessages,
    max_tokens: 4096,
    temperature: 0.70,
    top_p: 0.80,
    top_k: 20,
    presence_penalty: 0,
    repetition_penalty: 1,
    stream: true,
    chat_template_kwargs: { enable_thinking: enableThinking === true }
  };

  // ── SSE Stream ──
  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      const sendSSE = (obj) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      };

      try {
        // Call NVIDIA API
        const res = await fetch(NVIDIA_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${NVIDIA_API_KEY}`,
            'Accept': 'text/event-stream'
          },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          const errText = await res.text();
          console.error(`[chat] NVIDIA API error ${res.status}:`, errText);
          sendSSE({ type: 'error', error: `Model API returned ${res.status}`, details: errText.slice(0, 300) });
          controller.close();
          return;
        }

        // ── Stream-read with marker detection ──
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let sentLen = 0;
        let markerFound = false;
        let lineBuf = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          lineBuf += decoder.decode(value, { stream: true });
          const lines = lineBuf.split('\n');
          lineBuf = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const raw = line.slice(6).trim();
            if (raw === '[DONE]') continue;

            let content;
            try {
              content = JSON.parse(raw).choices?.[0]?.delta?.content || '';
            } catch { continue; }
            if (!content) continue;

            fullText += content;

            if (!markerFound) {
              const mIdx = fullText.indexOf(FLUENCY_MARKER);
              if (mIdx !== -1) {
                // Flush everything before marker
                const unsent = fullText.substring(sentLen, mIdx);
                if (unsent) sendSSE({ type: 'token', content: unsent });
                sentLen = fullText.length;
                markerFound = true;
              } else {
                // Stream tokens but hold back last N chars in case marker is split
                const safeEnd = Math.max(sentLen, fullText.length - FLUENCY_MARKER.length);
                if (safeEnd > sentLen) {
                  sendSSE({ type: 'token', content: fullText.substring(sentLen, safeEnd) });
                  sentLen = safeEnd;
                }
              }
            }
            // after marker: accumulate silently
          }
        }

        // Handle remaining buffer
        if (lineBuf.startsWith('data: ')) {
          const raw = lineBuf.slice(6).trim();
          if (raw !== '[DONE]') {
            try {
              const c = JSON.parse(raw).choices?.[0]?.delta?.content || '';
              if (c) fullText += c;
            } catch {}
          }
        }

        // Flush any unsent text if marker was never found
        if (!markerFound && sentLen < fullText.length) {
          sendSSE({ type: 'token', content: fullText.substring(sentLen) });
        }

        // ── Parse fluency ──
        const { responseText, fluencyData } = parseFluencyData(fullText);

        // ── Persist to Session Memory ──
        session.messages.push({
          role: 'user',
          content: message,
          timestamp: new Date().toISOString(),
          fluency: fluencyData.score
        });
        session.messages.push({
          role: 'assistant',
          content: responseText,
          timestamp: new Date().toISOString()
        });

        if (fluencyData.score > 0) {
          session.fluency_scores.push(fluencyData.score);
        }

        // Update session vocab
        if (Array.isArray(fluencyData.new_vocabulary)) {
          for (const item of fluencyData.new_vocabulary) {
            const w = typeof item === 'string' ? item : item?.word;
            if (!w) continue;
            const existing = session.vocabulary_used.find(v => v.word === w);
            if (existing) existing.count++;
            else session.vocabulary_used.push({ word: w, meaning: item.meaning || '', count: 1 });
          }
        }

        // Update session topics
        if (Array.isArray(fluencyData.topics)) {
          for (const t of fluencyData.topics) {
            if (t && !session.topics_covered.includes(t)) session.topics_covered.push(t);
          }
        }

        saveSession(session);

        // ── Persist to Facts Memory ──
        extractAndMergeFacts(session, fluencyData, language);

        // ── Send final SSE events ──
        sendSSE({ type: 'fluency', ...fluencyData });
        sendSSE({ type: 'done', sessionId, elapsed_ms: Date.now() - startTime });

        controller.close();
      } catch (err) {
        console.error('[chat] Fatal stream error:', err);
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`)
          );
        } catch {}
        controller.close();
      }
    }
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  GET /api/chat — API documentation
// ═══════════════════════════════════════════════════════════════════════════════
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/chat',
    method: 'POST',
    description: 'Language-learning chat powered by NVIDIA Qwen3-Next-80B. Supports text conversation, fluency scoring, session memory, and smart RAG.',
    body: {
      sessionId: 'string — optional, auto-generated if omitted',
      message: 'string — required, user message text',
      language: 'string — required, target language (e.g. "Hindi", "Japanese")',
      enableThinking: 'boolean — optional, enables extended thinking mode'
    },
    response_format: 'SSE stream (text/event-stream)',
    event_types: {
      token: '{ type:"token", content:"..." } — streamed response tokens',
      fluency: '{ type:"fluency", score:N, feedback:"...", new_vocabulary:[...], topics:[...], suggestions:[...] }',
      done: '{ type:"done", sessionId:"...", elapsed_ms:N }',
      error: '{ type:"error", error:"...", details:"..." }'
    },
    related: {
      list_sessions: 'GET /api/chat/sessions',
      get_session: 'GET /api/chat/sessions/{sessionId}',
      delete_session: 'DELETE /api/chat/sessions/{sessionId}',
      clear_all: 'DELETE /api/chat/sessions'
    }
  });
}
