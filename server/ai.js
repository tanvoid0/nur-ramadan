/**
 * Gemini calls, server-side only so GEMINI_API_KEY never reaches the client bundle.
 * The routes are public (anonymous users cook too), so prompts are built here and
 * callers are rate limited.
 */
const MODEL = 'gemini-3-flash-preview';
const LIMIT = 10;
const WINDOW_MS = 60_000;
const hits = new Map();

// ponytail: in-memory, per instance. Use a shared store (Upstash etc.) if quota gets abused.
export function rateLimit(req, res, next) {
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress).split(',')[0].trim();
  const now = Date.now();
  if (hits.size > 5000) hits.clear();
  const recent = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= LIMIT) return res.status(429).json({ error: 'Too many requests' });
  hits.set(ip, [...recent, now]);
  next();
}

async function generate(prompt, generationConfig) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw Object.assign(new Error('AI not configured'), { status: 503 });
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    throw Object.assign(new Error('AI request failed'), { status: response.status === 429 ? 429 : 502 });
  }
  const data = await response.json();
  return (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('').trim();
}

const fail = (res, e) => res.status(e.status || 502).json({ error: e.message });

export async function reflection(_req, res) {
  try {
    const text = await generate(
      'Give me a short, 1-sentence spiritual reflection or Hadith for today in Ramadan. Focus on mercy, patience, or gratitude.',
    );
    res.json({ text });
  } catch (e) {
    fail(res, e);
  }
}

const STRING = { type: 'STRING' };
const RECIPE_SCHEMA = {
  type: 'OBJECT',
  properties: { name: STRING, ingredients: { type: 'ARRAY', items: STRING }, instructions: STRING, nutrition: STRING },
  required: ['name', 'ingredients', 'instructions', 'nutrition'],
};

export async function recipe(req, res) {
  const { type, preference = 'healthy', isDraft = false } = req.body || {};
  if (!['Sehri', 'Iftar'].includes(type) || typeof preference !== 'string' || preference.length > 1000) {
    return res.status(400).json({ error: 'Invalid request' });
  }
  const prompt = isDraft
    ? `Task: Create a structured Ramadan ${type} recipe based on user ideas: "${preference}". Output valid JSON with name, ingredients (array), instructions (string), and nutrition (string).`
    : `Task: Suggest a unique, nourishing Ramadan ${type} recipe. Context: ${preference}. Focus on slow-release energy and hydration. Output valid JSON with name, ingredients (array), instructions (string), and nutrition (string).`;
  try {
    const text = await generate(prompt, { responseMimeType: 'application/json', responseSchema: RECIPE_SCHEMA });
    res.json(JSON.parse(text.replace(/```json|```/g, '').trim()));
  } catch (e) {
    fail(res, e);
  }
}
