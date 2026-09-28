import { appendFileSync, existsSync, readFileSync } from 'node:fs';

// Verify the endpoint that was just published, over HTTPS, without any key.
// This script reads only the public status file: no claim token, no password.
const statusFile = '.netlify/preview-result/public-status.json';
const summary = (line) => { if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, line); };

if (!existsSync(statusFile)) {
  console.log('No published preview status was found; skipping the endpoint check.');
  process.exit(0);
}

const status = JSON.parse(readFileSync(statusFile, 'utf8'));
if (status.status !== 'deployed' || typeof status.siteUrl !== 'string') {
  console.log('No published Netlify site in this run; skipping the endpoint check.');
  process.exit(0);
}

const site = new URL(status.siteUrl);
if (site.protocol !== 'https:' || !/^[a-z0-9-]+\.netlify\.app$/i.test(site.hostname) || site.username || site.password) {
  throw new Error('Only the published HTTPS Netlify preview can be checked');
}

let body = '';
let responseStatus = 0;
try {
  const response = await fetch(new URL('/api/ai', site), {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(20_000),
  });
  responseStatus = response.status;
  body = await response.text();
} catch (error) {
  console.log(`::warning title=NETLIFY_API_CHECK::Kunde inte nå ${site.href} (${error?.message ?? 'nätverksfel'}).`);
  process.exit(0);
}

let payload = null;
try { payload = JSON.parse(body); } catch { /* a static fallback returns index.html */ }

if (!payload || payload.service !== 'skogsprataren') {
  const message = status.functions === false
    ? 'The preview was published without serverless functions, so /api/ai is not available yet.'
    : 'The published site answered /api/ai without the expected JSON. Check the function logs in Netlify.';
  console.log(`::warning title=NETLIFY_API_CHECK::${message}`);
  summary(`\n### Endpoint check\n\n${message}\n`);
  process.exit(0);
}

const line = payload.configured
  ? `Serverfunktionen svarar (HTTP ${responseStatus}) och har en API-nyckel för ${payload.provider ?? 'okänd tjänst'}.`
  : `Serverfunktionen svarar (HTTP ${responseStatus}) men saknar API-nyckel. Sätt AI_API_KEY i Netlify och publicera igen.`;
console.log(`::notice title=NETLIFY_API_CHECK::${line}`);
console.log(line);
summary(`\n### Endpoint check\n\n${line}\n`);
