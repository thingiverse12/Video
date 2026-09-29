// Kör webbläsarsviterna mot en färdigbyggd version av spelet, en i taget.
//
//   npm run test:browser                     bygg, starta `vite preview`, kör alla sviter
//   npm run test:browser -- --only smoke,shop kör bara vissa sviter
//   npm run test:browser -- --skip-build     återanvänd dist/ från förra bygget
//   npm run test:browser -- --url http://localhost:5173   kör mot en server som redan är igång
//   npm run test:browser -- --repeat 10      mät fladder: kör varje svit tio gånger
//   npm run test:browser -- --bail           stanna vid första felet
//
// Sviterna kör i Chromium via Playwright. Finns ingen nedladdad Playwright-Chromium
// används CHROMIUM_EXECUTABLE (se README, "Testa i webbläsare").
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { connect } from 'node:net';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

export const SUITES = [
  ['smoke', 'smoke-test.mjs', 'Hela äventyret: gevär, bil, jakt, Rurik, mätarlaget, sparning, pekskärm'],
  ['rifle', 'rifle-smoke-test.mjs', 'Geväret: hämtning, sikte och spärrar'],
  ['home', 'home-smoke-test.mjs', 'Stugan: dörr, kylskåp och dator'],
  ['upstairs', 'upstairs-smoke-test.mjs', 'Trappan, övervåningen, loftstegen och bakmaskinen'],
  ['shop', 'shop-smoke-test.mjs', 'Myrboden: köttet, Marta och risken'],
  ['shooting', 'shooting-smoke-test.mjs', 'Skott: träff, miss, blockerat'],
  ['aim', 'aim-controls-smoke-test.mjs', 'Siktkontroller med mus och tangentbord'],
  ['touch', 'touch-smoke-test.mjs', 'Pekskärmsstyrning'],
  ['mobile', 'mobile-landscape-smoke-test.mjs', 'Mobil i liggande läge'],
  ['music', 'music-smoke-test.mjs', 'Musik och ljudinställningar'],
  ['graphics', 'graphics-smoke-test.mjs', 'Grafiknivåer och bildkvalitet'],
  ['perf', 'perf-smoke-test.mjs', 'Prestandabudget: allokeringar i spelloopen och nedtonade rörelser'],
];

function parseArgs(argv) {
  const options = { only: null, skipBuild: false, url: null, port: 4173, repeat: 1, bail: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => argv[++i];
    if (arg === '--only') options.only = next().split(',').map(s => s.trim()).filter(Boolean);
    else if (arg.startsWith('--only=')) options.only = arg.slice(7).split(',').map(s => s.trim()).filter(Boolean);
    else if (arg === '--skip-build') options.skipBuild = true;
    else if (arg === '--url') options.url = next();
    else if (arg.startsWith('--url=')) options.url = arg.slice(6);
    else if (arg === '--port') options.port = Number(next());
    else if (arg === '--repeat') options.repeat = Math.max(1, Number(next()) || 1);
    else if (arg.startsWith('--repeat=')) options.repeat = Math.max(1, Number(arg.slice(9)) || 1);
    else if (arg === '--bail') options.bail = true;
    else if (arg === '--help' || arg === '-h') { printHelp(); process.exit(0); }
    else { console.error(`Okänt argument: ${arg}`); printHelp(); process.exit(2); }
  }
  return options;
}

function printHelp() {
  console.log('Användning: node scripts/browser-tests.mjs [--only a,b] [--skip-build] [--url URL] [--port N] [--repeat N] [--bail]');
  console.log('Sviter: ' + SUITES.map(([id]) => id).join(', '));
}

function run(command, args, { env = process.env, cwd = root, inherit = true } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, env, stdio: inherit ? 'inherit' : 'pipe', shell: process.platform === 'win32' });
    child.on('error', reject);
    child.on('exit', (code, signal) => resolve(code ?? (signal ? 1 : 0)));
  });
}

function portOpen(port, host = '127.0.0.1') {
  return new Promise(resolve => {
    const socket = connect({ port, host });
    socket.once('connect', () => { socket.destroy(); resolve(true); });
    socket.once('error', () => resolve(false));
  });
}

async function waitForPort(port, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await portOpen(port)) return true;
    await new Promise(r => setTimeout(r, 250));
  }
  return false;
}

async function ensureChromium() {
  if (process.env.CHROMIUM_EXECUTABLE) {
    if (existsSync(process.env.CHROMIUM_EXECUTABLE)) return;
    throw new Error(`CHROMIUM_EXECUTABLE pekar på en fil som inte finns: ${process.env.CHROMIUM_EXECUTABLE}`);
  }
  const { chromium } = await import('playwright');
  const bundled = chromium.executablePath();
  if (bundled && existsSync(bundled)) return;
  throw new Error(
    'Ingen Chromium hittades. Kör `npx playwright install chromium` en gång, eller sätt\n' +
    'CHROMIUM_EXECUTABLE=/sökväg/till/chromium (README beskriver reservvägen via @sparticuz/chromium\n' +
    'för maskiner som inte når Playwrights nedladdningsserver).',
  );
}

async function startPreview(port) {
  if (await portOpen(port)) throw new Error(`Port ${port} är upptagen. Stäng servern som lyssnar där eller ange --port/--url.`);
  const vite = join(root, 'node_modules', 'vite', 'bin', 'vite.js');
  const child = spawn(process.execPath, [vite, 'preview', '--port', String(port), '--strictPort', '--host', '127.0.0.1'], {
    cwd: root, stdio: ['ignore', 'pipe', 'pipe'], detached: process.platform !== 'win32',
  });
  let log = '';
  child.stdout.on('data', d => { log += d; });
  child.stderr.on('data', d => { log += d; });
  const ready = await waitForPort(port);
  if (!ready) {
    stop(child);
    throw new Error(`vite preview startade inte på port ${port}:\n${log}`);
  }
  return child;
}

function stop(child) {
  if (!child || child.exitCode !== null) return;
  try {
    if (process.platform !== 'win32') process.kill(-child.pid, 'SIGTERM');
    else child.kill();
  } catch { /* redan borta */ }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const selected = options.only
    ? options.only.map(id => SUITES.find(s => s[0] === id) ?? (() => { throw new Error(`Okänd svit: ${id}. Välj bland ${SUITES.map(s => s[0]).join(', ')}.`); })())
    : SUITES;

  await ensureChromium();

  let server = null;
  let url = options.url;
  if (!url) {
    if (!options.skipBuild) {
      console.log('▶ Bygger spelet (npm run build) …');
      const code = await run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build']);
      if (code !== 0) { console.error('Bygget misslyckades – inga webbläsartester körda.'); process.exit(code); }
    } else if (!existsSync(join(root, 'dist', 'index.html'))) {
      console.error('--skip-build angavs men dist/index.html saknas. Kör npm run build först.');
      process.exit(2);
    }
    server = await startPreview(options.port);
    url = `http://localhost:${options.port}`;
    console.log(`▶ Testserver (vite preview) igång på ${url}`);
  } else {
    console.log(`▶ Kör mot befintlig server ${url}`);
  }
  const cleanup = () => stop(server);
  process.on('exit', cleanup);
  process.on('SIGINT', () => { cleanup(); process.exit(130); });
  process.on('SIGTERM', () => { cleanup(); process.exit(143); });

  const env = { ...process.env, TEST_URL: url };
  const results = [];
  let stopped = false;
  for (let round = 1; round <= options.repeat && !stopped; round++) {
    for (const [id, file, description] of selected) {
      const label = options.repeat > 1 ? `${id} (omgång ${round}/${options.repeat})` : id;
      console.log(`\n━━━ ${label}: ${description} ━━━`);
      const started = Date.now();
      const code = await run(process.execPath, [join(root, 'scripts', file)], { env });
      const seconds = ((Date.now() - started) / 1000).toFixed(0);
      results.push({ id, round, ok: code === 0, seconds });
      console.log(code === 0 ? `✓ ${label} klar på ${seconds} s` : `✗ ${label} misslyckades (kod ${code}) efter ${seconds} s`);
      if (code !== 0 && options.bail) { stopped = true; break; }
    }
  }

  console.log('\nSammanfattning');
  for (const [id] of selected) {
    const runs = results.filter(r => r.id === id);
    if (!runs.length) { console.log(`  –  ${id.padEnd(9)} inte körd`); continue; }
    const failed = runs.filter(r => !r.ok).length;
    const time = runs.map(r => r.seconds + ' s').join(', ');
    const mark = failed === 0 ? '✓' : '✗';
    const flake = options.repeat > 1 ? ` (${failed}/${runs.length} fel)` : '';
    console.log(`  ${mark}  ${id.padEnd(9)} ${time}${flake}`);
  }
  const failures = results.filter(r => !r.ok).length;
  const notRun = selected.length * options.repeat - results.length;
  if (failures || notRun) {
    console.log(`\n${failures} körning(ar) misslyckades${notRun ? `, ${notRun} kördes aldrig` : ''}.`);
    process.exit(1);
  }
  console.log(`\nAlla ${results.length} körningar gröna.`);
  // Testserverns rör håller annars händelseloopen vid liv efter en grön körning.
  stop(server);
  process.exit(0);
}

main().catch(error => {
  console.error(error.message || error);
  process.exit(1);
});
