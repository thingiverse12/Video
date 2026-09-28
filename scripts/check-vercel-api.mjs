import { appendFileSync } from 'node:fs';

// Ask the Vercel deployments of this commit — and of the default branch — whether
// /api/ai answers. Vercel is where the server function can actually run
// (anonymous Netlify deploys cannot carry functions), so this is the check that
// proves the API is live. No key is sent: only the public status response is read.

const repository = process.env.GITHUB_REPOSITORY;
const sha = process.env.GITHUB_SHA;
const defaultBranch = process.env.DEFAULT_BRANCH || '';
const token = process.env.GITHUB_TOKEN;
const summary = (line) => { if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, line); };

if (process.env.GITHUB_ACTIONS !== 'true' || !repository || !sha || !token) {
  console.log('Not running in GitHub Actions with a token; skipping the Vercel check.');
  process.exit(0);
}

const api = (path) => `https://api.github.com/repos/${repository}${path}`;
const headers = {
  accept: 'application/vnd.github+json',
  authorization: `Bearer ${token}`,
  'user-agent': 'gramyren-preview-check',
  'x-github-api-version': '2022-11-28',
};

async function json(url) {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`${url} answered HTTP ${response.status}`);
  return response.json();
}

async function deploymentsOf(commit, { productionOnly = false, limit = 4 } = {}) {
  const found = [];
  try {
    const deployments = await json(api(`/deployments?sha=${commit}&per_page=30`));
    for (const deployment of Array.isArray(deployments) ? deployments : []) {
      if (productionOnly && !/^production/i.test(deployment.environment ?? '')) continue;
      try {
        const statuses = await json(deployment.statuses_url);
        const success = (statuses ?? []).find(status => status.state === 'success' && status.environment_url);
        if (!success) continue;
        const url = new URL(success.environment_url);
        if (url.protocol !== 'https:' || !/\.vercel\.app$/i.test(url.hostname)) continue;
        if (found.some(entry => entry.url === url.origin)) continue;
        found.push({ label: deployment.environment, url: url.origin });
      } catch { /* a deployment without a readable status is simply skipped */ }
    }
  } catch (error) {
    console.log(`::warning title=VERCEL_API_CHECK::Kunde inte läsa utplaceringar för ${commit.slice(0, 7)} (${error.message}).`);
  }
  return found.slice(0, limit);
}

const candidates = await deploymentsOf(sha, { limit: 4 });
if (defaultBranch) {
  try {
    const head = await json(api(`/commits/${encodeURIComponent(defaultBranch)}`));
    if (head?.sha && head.sha !== sha) candidates.push(...await deploymentsOf(head.sha, { productionOnly: true, limit: 2 }));
  } catch (error) {
    console.log(`::warning title=VERCEL_API_CHECK::Kunde inte läsa standardgrenen (${error.message}).`);
  }
}
// The repository's homepage field is the address players are given; check it too.
const publicSite = (process.env.PUBLIC_SITE_URL ?? '').trim();
if (publicSite) {
  try {
    const url = new URL(publicSite);
    if (url.protocol === 'https:' && !candidates.some(entry => entry.url === url.origin)) {
      candidates.unshift({ label: `Publicerad adress (${url.hostname})`, url: url.origin, isPublicSite: true });
    }
  } catch { console.log('::warning title=VERCEL_API_CHECK::PUBLIC_SITE_URL är inte en giltig URL.'); }
}

if (!candidates.length) {
  console.log('::warning title=VERCEL_API_CHECK::Ingen lyckad Vercel-utplacering hittades för den här committen.');
  process.exit(0);
}

const lines = [];
for (const candidate of candidates) {
  if (candidate.isPublicSite) {
    try {
      const page = await fetch(candidate.url, { signal: AbortSignal.timeout(20_000) });
      const html = await page.text();
      if (page.ok && /<title>[^<]*Gråmyren/i.test(html)) {
        lines.push(`${candidate.label}: spelet svarar (HTTP ${page.status})`);
      } else {
        lines.push(`${candidate.label}: svarade HTTP ${page.status}${page.status === 401 || page.status === 403 ? ' (inloggningsskydd)' : ''}`);
      }
    } catch {
      lines.push(`${candidate.label}: kunde inte nås`);
    }
  }
  try {
    const response = await fetch(new URL('/api/ai', candidate.url), { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(20_000) });
    const body = await response.text();
    let payload = null;
    try { payload = JSON.parse(body); } catch { /* HTML means protection or a missing function */ }
    if (payload?.service === 'skogsprataren') {
      lines.push(`${candidate.label}: ${payload.configured ? `API-nyckel finns (${payload.provider ?? 'okänd tjänst'})` : 'funktionen svarar men saknar API-nyckel'}`);
    } else if (response.status === 401 || response.status === 403) {
      lines.push(`${candidate.label}: skyddad utplacering (HTTP ${response.status}); öppna den i webbläsaren när du är inloggad på Vercel`);
    } else {
      lines.push(`${candidate.label}: /api/ai svarade HTTP ${response.status} utan funktionssvar`);
    }
  } catch (error) {
    lines.push(`${candidate.label}: kunde inte nås (${error?.name === 'TimeoutError' ? 'timeout' : 'nätverksfel'})`);
  }
}

const text = lines.join(' | ');
console.log(`::notice title=VERCEL_API_CHECK::${text}`);
console.log(text);
summary(`\n### Vercel-endpoint\n\n${lines.map(line => `- ${line}`).join('\n')}\n`);
