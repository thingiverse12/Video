import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { describeAiConfig, handleAiRequest, readAiConfig, DEFAULT_SYSTEM_PROMPT, MAX_PROMPT_CHARS } from '../server/ai-core.mjs';

// No network calls and no real keys: every provider response below is a fixture.
const FAKE_KEY = 'sk-test-only-not-a-real-key-0123456789';
let checks = 0;
const ok = (label, condition) => { assert.ok(condition, label); checks += 1; };

function fakeFetch(payload, { status = 200, inspect } = {}) {
  const calls = [];
  const impl = async (url, options) => {
    calls.push({ url, options });
    inspect?.(url, options);
    return new Response(typeof payload === 'string' ? payload : JSON.stringify(payload), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  };
  impl.calls = calls;
  return impl;
}

const json = result => JSON.stringify(result.json);

// 1. Status endpoint tells the UI the truth without leaking anything.
const unconfigured = describeAiConfig(readAiConfig({}));
ok('status explains a missing key', unconfigured.configured === false && unconfigured.reason === 'missing-key');
const status = await handleAiRequest({ method: 'GET', env: {} });
ok('GET returns 200 with configured:false', status.status === 200 && status.json.configured === false);
ok('GET response has no key field', !/"key"/.test(json(status)) && !json(status).includes(FAKE_KEY));

// 2. Method and body validation.
ok('PUT is rejected', (await handleAiRequest({ method: 'PUT', env: {} })).status === 405);
ok('broken JSON is rejected', (await handleAiRequest({ method: 'POST', body: '{nope', env: {} })).status === 400);
ok('empty prompt is rejected', (await handleAiRequest({ method: 'POST', body: '{}', env: {} })).status === 400);
const tooLong = await handleAiRequest({ method: 'POST', body: JSON.stringify({ prompt: 'a'.repeat(MAX_PROMPT_CHARS + 1) }), env: { AI_API_KEY: FAKE_KEY } });
ok('over-long prompt is rejected before any call', tooLong.status === 413 && tooLong.json.error === 'prompt-too-long');
const badTokens = await handleAiRequest({ method: 'POST', body: { prompt: 'Hej där', maxTokens: 5000 }, env: { AI_API_KEY: FAKE_KEY } });
ok('absurd maxTokens is rejected', badTokens.status === 400 && badTokens.json.error === 'invalid-max-tokens');

// 3. A published site without a key must answer clearly instead of failing open.
const missingKey = await handleAiRequest({ method: 'POST', body: { prompt: 'Hitta på en skylt' }, env: {} });
ok('no key gives 501 not-configured', missingKey.status === 501 && missingKey.json.error === 'not-configured');
ok('501 hint names the environment variable', /AI_API_KEY/.test(missingKey.json.message));

// 4. A configured OpenAI-compatible provider is called correctly and kept secret.
const openaiFetch = fakeFetch({ model: 'gpt-4o-mini', choices: [{ message: { content: 'Skylt: Här vilar ingen.' } }] }, {
  inspect: (url, options) => {
    ok('OpenAI-compatible URL is used', url === 'https://api.openai.com/v1/chat/completions');
    ok('provider key travels in the Authorization header', options.headers.authorization === `Bearer ${FAKE_KEY}`);
    const sent = JSON.parse(options.body);
    ok('system prompt and user prompt are sent', sent.messages[0].content === DEFAULT_SYSTEM_PROMPT && sent.messages[1].content === 'Hitta på en skylt');
    ok('token budget is passed through', sent.max_tokens === 400);
  },
});
const generated = await handleAiRequest({ method: 'POST', body: { prompt: 'Hitta på en skylt' }, env: { OPENAI_API_KEY: FAKE_KEY }, fetchImpl: openaiFetch });
ok('generated text is returned', generated.status === 200 && generated.json.text === 'Skylt: Här vilar ingen.');
ok('response never contains the key', !json(generated).includes(FAKE_KEY));
ok('exactly one provider call was made', openaiFetch.calls.length === 1);

// 5. A provider error that echoes the key must not leak it to the browser.
const echoFetch = fakeFetch({ error: { message: `Invalid API key: ${FAKE_KEY}` } }, { status: 401 });
const upstreamFailure = await handleAiRequest({ method: 'POST', body: { prompt: 'Hej' }, env: { AI_API_KEY: FAKE_KEY, AI_PROVIDER: 'openai' }, fetchImpl: echoFetch });
ok('upstream failure becomes 502', upstreamFailure.status === 502 && upstreamFailure.json.error === 'upstream-failed');
ok('upstream status is passed on', upstreamFailure.json.upstreamStatus === 401);
ok('key echoed by the provider is redacted', !json(upstreamFailure).includes(FAKE_KEY) && json(upstreamFailure).includes('[dold nyckel]'));

// 6. Anthropic is detected from its own variable and called in its own shape.
const anthropicFetch = fakeFetch({ model: 'claude-sonnet-4-5', content: [{ type: 'text', text: 'Bill hälsar.' }] }, {
  inspect: (url, options) => {
    ok('Anthropic messages endpoint is used', url === 'https://api.anthropic.com/v1/messages');
    ok('Anthropic receives x-api-key', options.headers['x-api-key'] === FAKE_KEY);
    ok('Anthropic version header is set', options.headers['anthropic-version'] === '2023-06-01');
    ok('Anthropic body has no messages[system]', JSON.parse(options.body).system === DEFAULT_SYSTEM_PROMPT);
  },
});
const anthropic = await handleAiRequest({ method: 'POST', body: { prompt: 'Vad säger Bill?' }, env: { ANTHROPIC_API_KEY: FAKE_KEY }, fetchImpl: anthropicFetch });
ok('auto-detected provider is anthropic', anthropic.status === 200 && anthropic.json.provider === 'anthropic' && anthropic.json.text === 'Bill hälsar.');

// 7. Third-party OpenAI-compatible services and explicit provider choices work.
ok('unknown AI_PROVIDER is refused, not guessed', (await handleAiRequest({ method: 'POST', body: { prompt: 'Hej' }, env: { AI_PROVIDER: 'mystery', AI_API_KEY: FAKE_KEY } })).status === 501);
const customFetch = fakeFetch({ choices: [{ message: { content: 'Hej från lokala modellen.' } }] }, {
  inspect: url => ok('AI_API_URL override is respected', url === 'https://openrouter.ai/api/v1/chat/completions'),
});
const custom = await handleAiRequest({
  method: 'POST',
  body: { prompt: 'Hej', system: 'Var kort.', maxTokens: 120 },
  env: { AI_PROVIDER: 'openai', AI_API_KEY: FAKE_KEY, AI_API_URL: 'https://openrouter.ai/api/v1/', AI_MODEL: 'x-ai/grok-4-fast' },
  fetchImpl: customFetch,
});
ok('custom gateway answers normally', custom.status === 200 && custom.json.model === 'x-ai/grok-4-fast');
ok('system field reaches the request', JSON.parse(customFetch.calls[0].options.body).messages[0].content === 'Var kort.');

// 8. Both host adapters answer end to end, through their real exported shapes.
const netlifyHandler = (await import('../netlify/functions/ai.mjs')).default;
const vercelHandler = (await import('../api/ai.js')).default;
const realFetch = globalThis.fetch;
try {
  globalThis.fetch = fakeFetch({ model: 'gpt-4o-mini', choices: [{ message: { content: 'Hej från funktionen.' } }] });
  process.env.AI_API_KEY = FAKE_KEY;
  process.env.AI_PROVIDER = 'openai';

  const netlifyResponse = await netlifyHandler(new Request('https://gramyren.test/api/ai', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ prompt: 'Hej där' }),
  }));
  const netlifyPayload = await netlifyResponse.json();
  ok('Netlify adapter answers POST with generated text', netlifyResponse.status === 200 && netlifyPayload.text === 'Hej från funktionen.');
  ok('Netlify adapter leaks no key', !JSON.stringify(netlifyPayload).includes(FAKE_KEY));

  const netlifyStatus = await netlifyHandler(new Request('https://gramyren.test/api/ai'));
  const netlifyStatusPayload = await netlifyStatus.json();
  ok('Netlify adapter answers GET status', netlifyStatus.status === 200 && netlifyStatusPayload.service === 'skogsprataren' && netlifyStatusPayload.configured === true);
  ok('Netlify adapter sets no-store', netlifyStatus.headers.get('cache-control') === 'no-store');

  const vercelResponse = {
    statusCode: 0, headers: {}, body: '',
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    send(payload) { this.body = payload; return this; },
  };
  await vercelHandler({ method: 'POST', body: { prompt: 'Hej där' } }, vercelResponse);
  ok('Vercel adapter answers POST with generated text', vercelResponse.statusCode === 200 && JSON.parse(vercelResponse.body).text === 'Hej från funktionen.');
  ok('Vercel adapter leaks no key', !vercelResponse.body.includes(FAKE_KEY));

  delete process.env.AI_API_KEY;
  delete process.env.AI_PROVIDER;
  const netlifyUnconfigured = await netlifyHandler(new Request('https://gramyren.test/api/ai', { method: 'POST', body: '{}', headers: { 'content-type': 'application/json' } }));
  ok('published site without a key answers 400 for an empty prompt', netlifyUnconfigured.status === 400);
} finally {
  globalThis.fetch = realFetch;
  delete process.env.AI_API_KEY;
  delete process.env.AI_PROVIDER;
}

// 9. Structural guards: the two host adapters exist and share this core.
const workspace = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const netlifyAdapter = await readFile(join(workspace, 'netlify/functions/ai.mjs'), 'utf8');
const vercelAdapter = await readFile(join(workspace, 'api/ai.js'), 'utf8');
ok('Netlify adapter serves /api/ai', /path:\s*\[\s*'\/api\/ai'/.test(netlifyAdapter));
ok('Netlify adapter mounts a rate limit', /rateLimit/.test(netlifyAdapter));
ok('both adapters import the shared core', [netlifyAdapter, vercelAdapter].every(text => text.includes('ai-core.mjs')));
for (const relative of ['netlify/functions/ai.mjs', 'api/ai.js']) {
  const file = join(workspace, relative);
  ok(`${relative} exists`, (await stat(file)).isFile());
}

// 10. Secret hygiene: the browser code must never read a key or hardcode one.
// Prose that names an environment variable in a help text is fine; reading one
// or pasting a key value is not.
const forbiddenInBrowser = [
  [/process\.env/, 'reads process.env'],
  [/import\.meta\.env\.VITE_[A-Z_]*(?:KEY|TOKEN|SECRET)/, 'reads a VITE_ secret'],
  [/\bsk-[A-Za-z0-9_-]{12,}/, 'contains a hardcoded provider key'],
  [/(?:AI_API_KEY|OPENAI_API_KEY|ANTHROPIC_API_KEY)\s*[:=]\s*['"`]/, 'hardcodes a provider key'],
];
async function scanBrowserSources(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = join(directory, entry.name);
    if (entry.isDirectory()) { await scanBrowserSources(full); continue; }
    if (!/\.(ts|tsx|css)$/.test(entry.name)) continue;
    const text = await readFile(full, 'utf8');
    const problem = forbiddenInBrowser.find(([pattern]) => pattern.test(text));
    ok(`${entry.name} ${problem ? problem[1] : 'keeps secrets server-side'}`, !problem);
  }
}
await scanBrowserSources(join(workspace, 'src'));

console.log(`✓ ${checks} kontroller av API-endpointen gick igenom`);
console.log('✓ Ingen nyckel finns i webbläsarkoden, i svaren eller i felloggen');
console.log('Inga riktiga nycklar eller nätverksanrop användes i det här testet.');
