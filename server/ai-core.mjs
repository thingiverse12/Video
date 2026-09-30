// Shared server-side logic for Skogsprataren, the game's optional AI endpoint.
//
// The provider key lives ONLY in server environment variables. It is never sent
// to the browser, never returned in a response and never written to a log from
// this module. Both the Netlify function (netlify/functions/ai.mjs) and the
// Vercel function (api/ai.js) delegate here, so the two hosts behave identically.

export const SERVICE = 'skogsprataren';
export const MAX_PROMPT_CHARS = 1200;
export const MAX_SYSTEM_CHARS = 800;
export const DEFAULT_MAX_TOKENS = 400;
export const MAX_TOKENS_LIMIT = 800;
/** Tidsgräns mot leverantören. Ett hängande svar blir 504 i stället för en död funktion. */
export const REQUEST_TIMEOUT_MS = 15_000;
/** Anrop per IP och minut till POST /api/ai; samma tal som Netlify-funktionens rateLimit. */
export const RATE_LIMIT_WINDOW_MS = 60_000;
export const RATE_LIMIT_MAX_REQUESTS = 20;

export const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';
export const DEFAULT_ANTHROPIC_MODEL = 'claude-sonnet-4-5';
export const DEFAULT_OPENAI_BASE_URL = 'https://api.openai.com/v1';
export const DEFAULT_ANTHROPIC_BASE_URL = 'https://api.anthropic.com';

export const DEFAULT_SYSTEM_PROMPT = [
  'Du är Skogsprataren, en påhittad person i den svenska skogsbyn Gråmyren.',
  'Svara kort på svenska, högst fem meningar, med torr humor och utan att hitta på',
  'att personerna Leffe och Bill finns på riktigt. Föreslå bara sådant som passar',
  'ett litet spel: skyltar, repliker, små uppdrag och byskvaller.',
].join(' ');

export const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
};

/**
 * Räknare per anropare i minnet. Räcker för en funktion av den här storleken:
 * varje varm funktionsinstans skyddar sig själv, utan databas eller extern kö.
 * Fasta fönster: första anropet öppnar fönstret, det (limit + 1):a inom fönstret
 * nekas med hur många sekunder som återstår.
 */
export function createRateLimiter({ windowMs = RATE_LIMIT_WINDOW_MS, limit = RATE_LIMIT_MAX_REQUESTS, maxKeys = 5000 } = {}) {
  const windows = new Map();
  const sweep = now => {
    for (const [key, entry] of windows) if (entry.resetAt <= now) windows.delete(key);
    // Fortfarande fullt: släpp de äldsta fönstren så att en ny nyckel får plats.
    for (const key of windows.keys()) { if (windows.size < maxKeys) break; windows.delete(key); }
  };
  return {
    /** Registrerar ett anrop och säger om det får gå vidare. */
    hit(key, now = Date.now()) {
      const id = typeof key === 'string' && key ? key : 'unknown';
      let entry = windows.get(id);
      if (!entry || entry.resetAt <= now) {
        if (windows.size >= maxKeys) sweep(now);
        entry = { count: 0, resetAt: now + windowMs };
        windows.set(id, entry);
      }
      entry.count += 1;
      const allowed = entry.count <= limit;
      return {
        allowed,
        limit,
        remaining: Math.max(0, limit - entry.count),
        retryAfterSeconds: allowed ? 0 : Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
      };
    },
    get size() { return windows.size; },
  };
}

const defaultLimiter = createRateLimiter();

/** Plockar ut anroparens IP ur de rubriker Netlify och Vercel sätter. Ingen rubrik → 'unknown'. */
export function clientAddress(headers, fallback = '') {
  const read = name => {
    if (!headers) return '';
    if (typeof headers.get === 'function') return headers.get(name) || '';
    const direct = headers[name] ?? headers[name.toLowerCase()];
    return Array.isArray(direct) ? direct[0] || '' : typeof direct === 'string' ? direct : '';
  };
  const forwarded = read('x-forwarded-for').split(',')[0].trim();
  return read('x-nf-client-connection-ip').trim() || forwarded || read('x-real-ip').trim() || trimmed(fallback) || 'unknown';
}

class UpstreamError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'UpstreamError';
    this.status = status;
  }
}

function trimmed(value) {
  return typeof value === 'string' ? value.trim() : '';
}

/** Hide any configured secret that an upstream error message happened to echo. */
export function redactSecrets(text, secrets = []) {
  let output = typeof text === 'string' ? text : String(text ?? '');
  for (const secret of secrets) {
    if (typeof secret === 'string' && secret.length >= 8) output = output.split(secret).join('[dold nyckel]');
  }
  return output;
}

/**
 * Resolve the provider from environment variables only.
 *
 * Supported setups, in the order they are chosen:
 *  - AI_PROVIDER=anthropic + AI_API_KEY or ANTHROPIC_API_KEY
 *  - AI_PROVIDER=openai    + AI_API_KEY or OPENAI_API_KEY
 *  - auto: OpenRouter, Groq, a local model, the Netlify AI Gateway and OpenAI
 *    itself all speak the OpenAI chat-completions shape.
 */
export function readAiConfig(env = {}) {
  const requested = trimmed(env.AI_PROVIDER).toLowerCase();
  const shared = trimmed(env.AI_API_KEY);
  const openaiKey = shared || trimmed(env.OPENAI_API_KEY);
  const anthropicKey = shared || trimmed(env.ANTHROPIC_API_KEY);

  if (requested && !['openai', 'anthropic', 'netlify-ai-gateway', 'gateway'].includes(requested)) {
    return { configured: false, provider: null, model: null, baseUrl: null, key: '', reason: 'unsupported-provider' };
  }

  const provider = requested === 'anthropic' ? 'anthropic'
    : requested ? 'openai'
      : anthropicKey && !openaiKey ? 'anthropic' : 'openai';

  const key = provider === 'anthropic' ? anthropicKey : openaiKey;
  if (!key) return { configured: false, provider, model: null, baseUrl: null, key: '', reason: 'missing-key' };

  if (provider === 'anthropic') {
    return {
      configured: true,
      provider,
      key,
      baseUrl: (trimmed(env.AI_API_URL) || trimmed(env.ANTHROPIC_BASE_URL) || DEFAULT_ANTHROPIC_BASE_URL).replace(/\/+$/, ''),
      model: trimmed(env.AI_MODEL) || trimmed(env.ANTHROPIC_MODEL) || DEFAULT_ANTHROPIC_MODEL,
    };
  }
  return {
    configured: true,
    provider,
    key,
    baseUrl: (trimmed(env.AI_API_URL) || trimmed(env.OPENAI_BASE_URL) || DEFAULT_OPENAI_BASE_URL).replace(/\/+$/, ''),
    model: trimmed(env.AI_MODEL) || trimmed(env.OPENAI_MODEL) || DEFAULT_OPENAI_MODEL,
  };
}

/** Public status: never includes the key, only what the UI needs to explain. */
export function describeAiConfig(config) {
  if (!config?.configured) {
    return {
      ok: true,
      service: SERVICE,
      configured: false,
      reason: config?.reason ?? 'missing-key',
      hint: 'Sätt AI_API_KEY (och gärna AI_MODEL) som miljövariabel på värden, och publicera igen. Nyckeln stannar på servern.',
      maxPromptChars: MAX_PROMPT_CHARS,
      limitPerMinute: RATE_LIMIT_MAX_REQUESTS,
    };
  }
  return {
    ok: true,
    service: SERVICE,
    configured: true,
    provider: config.provider,
    model: config.model,
    maxPromptChars: MAX_PROMPT_CHARS,
    limitPerMinute: RATE_LIMIT_MAX_REQUESTS,
  };
}

/**
 * Samma sak som AbortSignal.timeout(ms), men med en timer som håller processen
 * vid liv tills den löst ut. Signalen avbryter både anslutningen och läsningen
 * av svarskroppen, så en leverantör som hänger kan aldrig hålla funktionen upptagen.
 */
function timeoutSignal(timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new DOMException(`Tidsgränsen på ${timeoutMs} ms passerades.`, 'TimeoutError')), timeoutMs);
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
}

async function requestJson(url, options, fetchImpl, timeoutMs) {
  const timeout = timeoutSignal(timeoutMs);
  try {
    const response = await fetchImpl(url, { ...options, signal: timeout.signal });
    const raw = await response.text();
    let parsed = null;
    try { parsed = raw ? JSON.parse(raw) : null; } catch { /* keep the raw text for diagnostics */ }
    return { response, parsed, raw };
  } finally {
    timeout.clear();
  }
}

const isTimeout = error => error?.name === 'TimeoutError' || error?.name === 'AbortError';

function upstreamMessage(parsed, raw, secrets) {
  const detail = parsed?.error?.message || parsed?.message || parsed?.error || raw;
  const text = typeof detail === 'string' ? detail : JSON.stringify(detail ?? '');
  return redactSecrets(text, secrets).slice(0, 300) || 'Inget svar från tjänsten.';
}

/**
 * Call the configured provider and return the generated text.
 * Throws UpstreamError with a redacted message when the provider refuses.
 */
export async function callProvider(config, { system, prompt, maxTokens, fetchImpl = fetch, timeoutMs = REQUEST_TIMEOUT_MS } = {}) {
  const secrets = config?.key ? [config.key] : [];
  const instructions = system || DEFAULT_SYSTEM_PROMPT;

  if (config.provider === 'anthropic') {
    const { response, parsed, raw } = await requestJson(`${config.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        'x-api-key': config.key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: maxTokens,
        system: instructions,
        messages: [{ role: 'user', content: prompt }],
      }),
    }, fetchImpl, timeoutMs);
    if (!response.ok) throw new UpstreamError(upstreamMessage(parsed, raw, secrets), response.status);
    const text = Array.isArray(parsed?.content)
      ? parsed.content.filter(block => block?.type === 'text').map(block => block.text).join('\n').trim()
      : '';
    if (!text) throw new UpstreamError('Tjänsten svarade utan text.', 502);
    return { text, model: parsed?.model || config.model, provider: config.provider };
  }

  const { response, parsed, raw } = await requestJson(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json',
      authorization: `Bearer ${config.key}`,
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: maxTokens,
      temperature: 0.85,
      messages: [
        { role: 'system', content: instructions },
        { role: 'user', content: prompt },
      ],
    }),
  }, fetchImpl, timeoutMs);
  if (!response.ok) throw new UpstreamError(upstreamMessage(parsed, raw, secrets), response.status);
  const text = typeof parsed?.choices?.[0]?.message?.content === 'string' ? parsed.choices[0].message.content.trim() : '';
  if (!text) throw new UpstreamError('Tjänsten svarade utan text.', 502);
  return { text, model: parsed?.model || config.model, provider: config.provider };
}

function parseRequestBody(body) {
  if (body === undefined || body === null || body === '') return { value: {}, error: null };
  if (typeof body === 'string') {
    try { return { value: JSON.parse(body), error: null }; } catch { return { value: null, error: 'invalid-json' }; }
  }
  if (typeof body === 'object') return { value: body, error: null };
  return { value: null, error: 'invalid-json' };
}

const fail = (status, error, message, extra = {}) => ({
  status,
  headers: JSON_HEADERS,
  json: { ok: false, service: SERVICE, error, ...(message ? { message } : {}), ...extra },
});

/**
 * Host-independent request handler. Returns { status, headers, json } and never
 * exposes the provider key, not even through a provider error message.
 */
export async function handleAiRequest({ method = 'GET', body, env = {}, fetchImpl = fetch, timeoutMs = REQUEST_TIMEOUT_MS, clientIp = 'unknown', limiter = defaultLimiter, now = Date.now() } = {}) {
  const verb = String(method || 'GET').toUpperCase();
  const config = readAiConfig(env);

  if (verb === 'GET' || verb === 'HEAD') return { status: 200, headers: JSON_HEADERS, json: describeAiConfig(config) };
  if (verb !== 'POST') return fail(405, 'method-not-allowed', 'Använd GET för status eller POST med { "prompt": "..." }.');

  // Gränsen per anropare räknas före all annan kontroll, så att inte heller
  // ogiltiga anrop kan användas för att hålla funktionen sysselsatt.
  const quota = limiter.hit(clientIp, now);
  if (!quota.allowed) {
    const limited = fail(429, 'rate-limited', `För många anrop: högst ${quota.limit} per minut och anropare. Försök igen om ${quota.retryAfterSeconds} sekunder.`, { retryAfterSeconds: quota.retryAfterSeconds });
    return { ...limited, headers: { ...JSON_HEADERS, 'retry-after': String(quota.retryAfterSeconds) } };
  }

  const { value, error } = parseRequestBody(body);
  if (error) return fail(400, 'invalid-json', 'Kroppen måste vara giltig JSON.');
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail(400, 'invalid-json', 'Skicka ett JSON-objekt.');

  const prompt = typeof value.prompt === 'string' ? value.prompt.trim() : '';
  if (prompt.length < 3) return fail(400, 'prompt-required', 'Fältet "prompt" saknas eller är för kort.');
  if (prompt.length > MAX_PROMPT_CHARS) return fail(413, 'prompt-too-long', `Fältet "prompt" får vara högst ${MAX_PROMPT_CHARS} tecken.`);

  const system = typeof value.system === 'string' ? value.system.trim() : '';
  if (system.length > MAX_SYSTEM_CHARS) return fail(413, 'system-too-long', `Fältet "system" får vara högst ${MAX_SYSTEM_CHARS} tecken.`);

  let maxTokens = DEFAULT_MAX_TOKENS;
  if (value.maxTokens !== undefined && value.maxTokens !== null) {
    maxTokens = Number(value.maxTokens);
    if (!Number.isFinite(maxTokens) || maxTokens < 1 || maxTokens > MAX_TOKENS_LIMIT) {
      return fail(400, 'invalid-max-tokens', `Fältet "maxTokens" måste vara ett tal mellan 1 och ${MAX_TOKENS_LIMIT}.`);
    }
    maxTokens = Math.round(maxTokens);
  }

  if (!config.configured) {
    const reason = config.reason === 'unsupported-provider'
      ? 'AI_PROVIDER måste vara "openai" eller "anthropic".'
      : 'Servern har ingen API-nyckel. Sätt AI_API_KEY (och gärna AI_MODEL) som miljövariabel på värden och publicera igen.';
    return fail(501, 'not-configured', reason, { reason: config.reason ?? 'missing-key' });
  }

  try {
    const result = await callProvider(config, { system, prompt, maxTokens, fetchImpl, timeoutMs });
    return {
      status: 200,
      headers: JSON_HEADERS,
      json: { ok: true, service: SERVICE, provider: result.provider, model: result.model, text: redactSecrets(result.text, [config.key]) },
    };
  } catch (error) {
    if (error?.name === 'UpstreamError') {
      return fail(502, 'upstream-failed', error.message, { upstreamStatus: error.status });
    }
    if (isTimeout(error)) {
      return fail(504, 'upstream-timeout', `Tjänsten svarade inte inom ${Math.round(timeoutMs / 1000)} sekunder. Försök igen om en stund.`, { timeoutMs });
    }
    return fail(502, 'request-failed', redactSecrets(error?.message ?? 'Okänt fel.', [config.key]));
  }
}

export function jsonResponse({ status, headers, json }) {
  return new Response(JSON.stringify(json), { status, headers });
}
