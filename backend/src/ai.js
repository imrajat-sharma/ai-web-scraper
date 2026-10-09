/**
 * Free-tier AI summarization.
 * Provider is auto-detected: Gemini if GEMINI_API_KEY is set, otherwise Groq.
 */

const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const AI_TIMEOUT_MS = 60000;

const SYSTEM_PROMPT =
  'You are a precise editorial assistant. Summarize web pages clearly and factually.';

function buildPrompt({ title, description, url, text }) {
  return [
    'Summarize the following web page for a reader who has not seen it.',
    'Write 3 short paragraphs or fewer (about 100-140 words total).',
    'Focus on what the page is about and its key points. Do not invent details.',
    'Reply with plain text only - no markdown headings, no bullet lists, no preamble.',
    '',
    `Page title: ${title || '(untitled)'}`,
    `URL: ${url}`,
    description ? `Meta description: ${description}` : '',
    '',
    '--- PAGE TEXT ---',
    text,
    '--- END PAGE TEXT ---',
  ]
    .filter(Boolean)
    .join('\n');
}

export function getProvider() {
  const explicit = (process.env.AI_PROVIDER || '').toLowerCase().trim();
  if (explicit) return explicit;
  if (process.env.GEMINI_API_KEY) return 'gemini';
  if (process.env.GROQ_API_KEY) return 'groq';
  return null;
}

export function describeConfig() {
  const provider = getProvider();
  if (provider === 'gemini') {
    return { provider, model: process.env.GEMINI_MODEL || 'gemini-2.5-flash', keyConfigured: true };
  }
  if (provider === 'groq') {
    return { provider, model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile', keyConfigured: true };
  }
  return { provider: null, model: null, keyConfigured: false };
}

function aiError(message, status = 502) {
  const err = new Error(message);
  err.status = status;
  return err;
}

async function readJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

async function callGemini(prompt) {
  const key = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  const res = await fetch(`${GEMINI_ENDPOINT}/${model}:generateContent`, {
    method: 'POST',
    signal: AbortSignal.timeout(AI_TIMEOUT_MS),
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4 },
    }),
  });

  const data = await readJson(res);
  if (!res.ok) {
    const msg = data?.error?.message || res.statusText;
    if (res.status === 400 || res.status === 404) {
      throw aiError(`Gemini request failed (${res.status}): ${msg}. Check GEMINI_API_KEY / GEMINI_MODEL in backend/.env.`);
    }
    if (res.status === 429) throw aiError('Gemini rate limit reached - try again in a minute.', 429);
    throw aiError(`Gemini request failed (${res.status}): ${msg}`);
  }

  const parts = data?.candidates?.[0]?.content?.parts || [];
  const text = parts.map((p) => p.text || '').join('').trim();
  if (!text) {
    const reason = data?.promptFeedback?.blockReason || data?.candidates?.[0]?.finishReason || 'empty response';
    throw aiError(`Gemini returned no summary (${reason}).`);
  }
  return { text, model };
}

async function callGroq(prompt) {
  const key = process.env.GROQ_API_KEY;
  const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

  const res = await fetch(GROQ_ENDPOINT, {
    method: 'POST',
    signal: AbortSignal.timeout(AI_TIMEOUT_MS),
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
    }),
  });

  const data = await readJson(res);
  if (!res.ok) {
    const msg = data?.error?.message || res.statusText;
    if (res.status === 401 || res.status === 403) {
      throw aiError(`Groq rejected the API key: ${msg}`, 502);
    }
    if (res.status === 404) {
      throw aiError(`Groq model "${model}" is unavailable - set GROQ_MODEL in backend/.env.`, 502);
    }
    if (res.status === 429) throw aiError('Groq rate limit reached - try again in a minute.', 429);
    throw aiError(`Groq request failed (${res.status}): ${msg}`);
  }

  const text = (data?.choices?.[0]?.message?.content || '').trim();
  if (!text) throw aiError('Groq returned an empty summary.');
  return { text, model };
}

export async function summarize(page) {
  const provider = getProvider();
  const prompt = buildPrompt(page);

  if (!provider) {
    throw aiError(
      'No AI API key configured. Copy backend/.env.example to backend/.env and set GEMINI_API_KEY (free at https://aistudio.google.com/apikey).',
      503
    );
  }

  if (provider === 'gemini') {
    if (!process.env.GEMINI_API_KEY) {
      throw aiError('AI_PROVIDER=gemini but GEMINI_API_KEY is missing from backend/.env.', 503);
    }
    const result = await callGemini(prompt);
    return { ...result, provider };
  }

  if (provider === 'groq') {
    if (!process.env.GROQ_API_KEY) {
      throw aiError('AI_PROVIDER=groq but GROQ_API_KEY is missing from backend/.env.', 503);
    }
    const result = await callGroq(prompt);
    return { ...result, provider };
  }

  throw aiError(`Unknown AI_PROVIDER "${provider}". Use "gemini" or "groq".`, 503);
}
