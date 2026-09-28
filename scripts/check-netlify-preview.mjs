import { appendFileSync, readFileSync } from 'node:fs';

const request = JSON.parse(readFileSync('.github/netlify-preview-recovery.json', 'utf8'));
const site = new URL(request.siteUrl);
if (site.protocol !== 'https:' || !/^[a-z0-9-]+\.netlify\.app$/i.test(site.hostname) || site.username || site.password || site.port || site.search || site.hash || site.pathname !== '/') throw new Error('Only the published HTTPS Netlify preview can be checked');
const response = await fetch(site, { signal: AbortSignal.timeout(20000) });
const final = new URL(response.url);
const html = await response.text();
if (final.protocol !== 'https:' || final.hostname !== site.hostname || ![200, 401].includes(response.status) || !/password|<title>Gråmyren/i.test(html)) throw new Error('The preview did not return a valid game page or its Netlify password gate');
console.log(`Verified live HTTPS preview (${response.status}): ${site.href}`);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Verified Netlify preview\n\n[Open the published preview](${site.href})\n\nHTTPS and the Netlify access page are reachable. This check reuses the existing deployment; it creates no new site. Ownership/access details remain encrypted.\n`);
