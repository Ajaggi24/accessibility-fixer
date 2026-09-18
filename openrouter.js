// openrouter.js
// Owner: Role 5 — shared LLM transport.
//
// A tiny OpenRouter client. OpenRouter is OpenAI-compatible, so this posts to
// its /chat/completions endpoint. Reads OPENROUTER_API_KEY and OPENROUTER_MODEL
// from the environment (.env). Used by fixer-openrouter.js.
//
// We ask the model to reply with a single JSON object and parse it defensively
// (stripping ```json fences and grabbing the outermost {...} if needed).

import 'dotenv/config';

const BASE_URL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
const MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet';

export function hasOpenRouterKey() {
  const k = (process.env.OPENROUTER_API_KEY || '').trim();
  return k.length > 0 && k !== 'your-key-here';
}

export function openRouterModel() {
  return MODEL;
}

// Send one prompt, return the raw assistant text.
// Retries on 429 (rate limit) and 5xx with backoff, honoring Retry-After.
export async function chat(prompt, { maxTokens = 400, temperature = 0.2, maxRetries = 5 } = {}) {
  const key = (process.env.OPENROUTER_API_KEY || '').trim();
  if (!key) throw new Error('OPENROUTER_API_KEY is not set');

  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/Ajaggi24/accessibility-fixer',
        'X-Title': 'Accessibility Fixer'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens,
        temperature,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (res.ok) {
      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content;
      if (!text) throw new Error('OpenRouter returned no message content');
      return text;
    }

    // Retryable? 429 = rate limit, 5xx = transient server error.
    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || attempt >= maxRetries) {
      const body = await res.text().catch(() => '');
      throw new Error(`OpenRouter ${res.status}: ${body.slice(0, 200)}`);
    }

    // Honor Retry-After header if present, else exponential backoff.
    const retryAfter = Number(res.headers.get('retry-after'));
    const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
      ? retryAfter * 1000
      : Math.min(30000, 2000 * 2 ** attempt); // 2s,4s,8s,16s,30s cap
    attempt++;
    await new Promise((r) => setTimeout(r, waitMs));
  }
}

// Send a prompt and parse the reply as a JSON object.
export async function chatJSON(prompt, opts = {}) {
  const text = await chat(prompt, opts);
  return parseJsonLoose(text);
}

// Tolerant JSON extraction: handles ```json fences and surrounding prose.
export function parseJsonLoose(text) {
  let s = String(text).trim();
  // strip code fences
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try {
    return JSON.parse(s);
  } catch {
    // fall back to the outermost {...}
    const start = s.indexOf('{');
    const end = s.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      return JSON.parse(s.slice(start, end + 1));
    }
    throw new Error(`Could not parse JSON from model reply: ${s.slice(0, 200)}`);
  }
}

// Quick connectivity check: `node openrouter.js`
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(`[openrouter.js] model: ${MODEL}, key set: ${hasOpenRouterKey()}`);
  const reply = await chatJSON(
    'Reply with ONLY this JSON and nothing else: {"ok": true, "hello": "world"}'
  );
  console.log('[openrouter.js] test reply parsed:', reply);
}
