import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { sealPreviewResult, publicPreviewDetails } from './netlify-preview-envelope.mjs';
import { emitEncryptedResult } from './emit-netlify-result.mjs';

const repository = 'thingiverse12/Video';
const branch = 'arena/01a0e9e1-video';
const out = '.netlify/preview-result';

// Netlify's anonymous deploy path refuses to run when a project contains
// serverless functions: `checkForFunctions()` in netlify-cli 27.10.0 exits(1)
// without a message before anything is uploaded. Pointing --functions at an
// empty folder keeps the check quiet, so the static game can still be
// published, while the API lives on the Vercel project that is connected to
// this same repository. Set the repository variable AI_API_BASE to that
// project's HTTPS origin and this script also adds a proxy rule, so /api/ai
// keeps working from the Netlify address.
const emptyFunctions = '.netlify/empty-functions';
const deployArgs = ['deploy', '--allow-anonymous', '--dir=dist', '--no-build', '--json', '--timeout=120', '--functions', emptyFunctions];

/** The CLI normally prints pure JSON, but tolerate a stray log line. */
function parseCliJson(stdout) {
  const text = (stdout ?? '').trim();
  if (!text) return null;
  try { return JSON.parse(text); } catch { /* look at the last JSON-looking line instead */ }
  for (const line of text.split('\n').reverse()) {
    if (!line.trim().startsWith('{')) continue;
    try { return JSON.parse(line); } catch { /* keep looking */ }
  }
  return null;
}

export function withApiProxy(redirectsFile, apiBase) {
  const origin = (apiBase ?? '').trim().replace(/\/+$/, '');
  if (!origin) return false;
  const proxy = new URL(origin);
  if (proxy.protocol !== 'https:' || proxy.username || proxy.password || proxy.search || proxy.hash) {
    throw new Error('AI_API_BASE must be a plain https:// origin, for example https://your-project.vercel.app');
  }
  const rules = readFileSync(redirectsFile, 'utf8').split('\n');
  const already = rules.some(line => line.trim().startsWith('/api/*'));
  if (!already) {
    // Netlify uses the first matching rule, so the proxy must come before the
    // single-page-app fallback that is already in the file.
    const firstRule = rules.findIndex(line => line.trim() && !line.trim().startsWith('#'));
    rules.splice(firstRule === -1 ? rules.length : firstRule, 0, `/api/*  ${origin}/api/:splat  200`);
    writeFileSync(redirectsFile, rules.join('\n'));
  }
  return true;
}

function main() {
  if (process.env.GITHUB_ACTIONS !== 'true' || process.env.GITHUB_REPOSITORY !== repository || process.env.GITHUB_REF !== `refs/heads/${branch}`) {
    throw new Error('This publisher only runs in the approved GitHub repository and working branch.');
  }
  const request = JSON.parse(readFileSync('.github/netlify-preview-request.json', 'utf8'));
  if (request.mode !== 'anonymous-preview' || request.branch !== branch || !request.requestId) throw new Error('An explicit preview request is required.');
  if (!existsSync('dist/index.html') || !existsSync('dist/_redirects') || !existsSync('dist/_headers')) throw new Error('Build output or Netlify routing files are missing.');
  const recipient = readFileSync('.github/netlify-preview-public.pem', 'utf8');
  // Validate encryption BEFORE contacting Netlify so a bad key never strands a claim link.
  sealPreviewResult({ validation: true }, recipient);
  mkdirSync(out, { recursive: true });

  let proxied = false;
  try {
    proxied = withApiProxy('dist/_redirects', process.env.AI_API_BASE);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
    return;
  }
  mkdirSync(emptyFunctions, { recursive: true });

  const env = { ...process.env, NETLIFY_TELEMETRY_DISABLED: '1' };
  delete env.NETLIFY_AUTH_TOKEN;
  delete env.NETLIFY_SITE_ID;
  // Explicitly a new anonymous preview: never use a team's token or --prod.
  const result = spawnSync('netlify', deployArgs, {
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env,
    timeout: 300_000, maxBuffer: 8 * 1024 * 1024,
  });
  const stdout = result.stdout ?? '', stderr = result.stderr ?? '';
  const identity = {
    repository, branch, commit: process.env.GITHUB_SHA,
    runId: process.env.GITHUB_RUN_ID, requestId: request.requestId,
    completedAt: new Date().toISOString(),
  };
  // Preserve even failed/partial CLI output for the owner, but NEVER log it:
  // Netlify's JSON output can contain a bearer claim token and a password.
  const envelope = sealPreviewResult({
    ...identity, deployArgs, proxied,
    attempt: { exitCode: result.status, error: result.error?.message ?? null, stdout, stderr },
  }, recipient);
  writeFileSync(`${out}/private.enc.json`, JSON.stringify(envelope, null, 2) + '\n');
  emitEncryptedResult(envelope);

  let deployed = null;
  if (result.status === 0 && !result.error) {
    try { deployed = publicPreviewDetails(parseCliJson(stdout)); } catch { /* The encrypted diagnostics retain the private response. */ }
  }
  const status = {
    ...identity,
    status: deployed ? 'deployed' : 'failed',
    mode: 'static-only',
    functions: false,
    proxied,
    ...(deployed ?? {}),
  };
  writeFileSync(`${out}/public-status.json`, JSON.stringify(status, null, 2) + '\n');

  if (!deployed) {
    const message = /daily limit|429/.test(stderr)
      ? 'Netlify anonymous deployment limit reached. Account authorization is required.'
      : 'Netlify deployment did not complete. Private diagnostics are encrypted for the deployment owner.';
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Netlify preview\n\n${message}\n`);
    console.error(message); process.exitCode = 1; return;
  }

  const apiLine = proxied
    ? 'Anrop till /api/ai skickas vidare till AI_API_BASE.'
    : 'Endast statiska filer publicerades. API:t körs på Vercel; sätt repositoryvariabeln AI_API_BASE för att nå det även härifrån.';
  const message = `Preview: ${deployed.siteUrl}\n${apiLine}\nClaim/access details are encrypted for the deployment owner. Anonymous sites must be claimed within 60 minutes.\n`;
  console.log(message);
  console.log(`::notice title=NETLIFY_PUBLIC_URL::${deployed.siteUrl}`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Netlify preview\n\n[Open preview](${deployed.siteUrl})\n\n${apiLine}\n\nAccess and ownership details are in the encrypted result artifact. Claim within 60 minutes.\n`);
  }
}

if (process.argv[1]?.endsWith('/deploy-netlify-preview.mjs')) {
  try {
    main();
  } catch (error) {
    console.error(error?.message ?? 'Netlify preview publishing failed.');
    process.exitCode = 1;
  }
}
