import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { sealPreviewResult, publicPreviewDetails } from './netlify-preview-envelope.mjs';
import { emitEncryptedResult } from './emit-netlify-result.mjs';

const repository = 'thingiverse12/Video';
const branch = 'arena/01a0e99b-video';
const out = '.netlify/preview-result';

// Publish the built game together with its serverless function. The first
// attempt runs Netlify's own build so /api/ai is bundled; if that is refused
// (for example when an anonymous site may not carry functions), a plain static
// deploy still gives a playable preview.
const attempts = [
  { mode: 'app-api', args: ['deploy', '--allow-anonymous', '--json', '--timeout=180'], functions: true },
  { mode: 'static-only', args: ['deploy', '--allow-anonymous', '--dir=dist', '--no-build', '--json', '--timeout=120'], functions: false },
];

function parseCliJson(stdout) {
  const text = (stdout ?? '').trim();
  if (!text) return null;
  try { return JSON.parse(text); } catch { /* the CLI may prefix log lines */ }
  for (const line of text.split('\n').reverse()) {
    if (!line.trim().startsWith('{')) continue;
    try { return JSON.parse(line); } catch { /* keep looking */ }
  }
  return null;
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

  const attemptsLog = [];
  let deployed = null;
  let usedAttempt = attempts[0];

  for (const attempt of attempts) {
    const env = { ...process.env, NETLIFY_TELEMETRY_DISABLED: '1' };
    delete env.NETLIFY_AUTH_TOKEN;
    delete env.NETLIFY_SITE_ID;
    // Explicitly a new anonymous preview: never use a team's token or --prod.
    const result = spawnSync('netlify', attempt.args, {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env,
      timeout: 300_000, maxBuffer: 8 * 1024 * 1024,
    });
    const stdout = result.stdout ?? '', stderr = result.stderr ?? '';
    const parsed = parseCliJson(stdout);
    let details = null;
    if (result.status === 0 && !result.error && parsed) {
      try { details = publicPreviewDetails(parsed); } catch { details = null; }
    }
    attemptsLog.push({ mode: attempt.mode, exitCode: result.status, error: result.error?.message ?? null, stdout, stderr });
    if (details) { deployed = details; usedAttempt = attempt; break; }
  }

  const identity = {
    repository, branch, commit: process.env.GITHUB_SHA,
    runId: process.env.GITHUB_RUN_ID, requestId: request.requestId,
    completedAt: new Date().toISOString(),
  };
  // Preserve even failed/partial CLI output for the owner, but NEVER log it:
  // Netlify's JSON output can contain a bearer claim token and a password.
  const envelope = sealPreviewResult({ ...identity, attempts: attemptsLog, mode: usedAttempt.mode }, recipient);
  writeFileSync(`${out}/private.enc.json`, JSON.stringify(envelope, null, 2) + '\n');
  emitEncryptedResult(envelope);

  const status = {
    ...identity,
    status: deployed ? 'deployed' : 'failed',
    mode: deployed ? usedAttempt.mode : null,
    functions: deployed ? usedAttempt.functions : false,
    ...(deployed ?? {}),
  };
  writeFileSync(`${out}/public-status.json`, JSON.stringify(status, null, 2) + '\n');

  if (!deployed) {
    const combined = attemptsLog.map(attempt => attempt.stderr).join('\n');
    const message = /daily limit|429/.test(combined)
      ? 'Netlify anonymous deployment limit reached. Account authorization is required.'
      : 'Netlify deployment did not complete. Private diagnostics are encrypted for the deployment owner.';
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Netlify preview\n\n${message}\n`);
    console.error(message); process.exitCode = 1; return;
  }

  const apiLine = usedAttempt.functions
    ? 'Serverfunktionen /api/ai följer med i publiceringen.'
    : 'Endast statiska filer publicerades; /api/ai saknas på den här adressen.';
  const message = `Preview: ${deployed.siteUrl}\n${apiLine}\nClaim/access details are encrypted for the deployment owner. Anonymous sites must be claimed within 60 minutes.\n`;
  console.log(message);
  console.log(`::notice title=NETLIFY_PUBLIC_URL::${deployed.siteUrl}`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Netlify preview\n\n[Open preview](${deployed.siteUrl})\n\n${apiLine}\n\nAccess and ownership details are in the encrypted result artifact. Claim within 60 minutes.\n`);
  }
}

try {
  main();
} catch (error) {
  console.error(error?.message ?? 'Netlify preview publishing failed.');
  process.exitCode = 1;
}
