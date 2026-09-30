// Prestandabudget: mäter bildrutor och minnesallokeringar i spelloopen med
// Chromiums samplande heap-profilerare, och kontrollerar att spelet går att spela
// med prefers-reduced-motion. Kör mot en server med TEST_URL (npm run test:browser
// startar en själv).
//
//   PERF_FRAMES=600              antal bildrutor som mäts (standard 600)
//   PERF_ALLOCATION_BUDGET=250   tillåtna nya objekt per simuleringssteg (standard 250)
//
// Budgeten gäller simulate()-trädet: spelregler, figurer, bil, kamera. Renderingen
// (three.js) och HUD-uppdateringen emit() (högst 9 gånger per sekund, skapar React-
// tillståndet) rapporteras separat men ingår inte i budgeten.
//
// Varför budgeten är grov: källkoden i loopen skapar inga objekt alls (det vaktar
// scripts/frame-loop-allocation-test.mjs exakt, rad för rad), men V8 boxar flyttal
// tillfälligt tills funktionerna är färdigoptimerade, och three.js egna lookAt/invert
// boxar några per anrop. Under programvarurendering (SwiftShader, 1–2 s per bildruta)
// hinner koden aldrig dit, så en ren promenad mäter ändå ~130 boxade tal per steg.
// Riktiga allokeringar syns tydligt ändå: före städningen låg samma promenad på
// ~500 objekt per steg och över 1 MB per bildruta.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const FRAMES = Number(process.env.PERF_FRAMES) || 600;
const BUDGET = Number(process.env.PERF_ALLOCATION_BUDGET) || 250;
const url = process.env.TEST_URL || 'http://localhost:5173';
const launchOptions = {
  headless: true,
  ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {}),
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
};

const browser = await chromium.launch(launchOptions);

async function startGame(page) {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 });
  await page.locator('.start-button').waitFor({ timeout: 90000 });
  await page.getByRole('button', { name: 'Inställningar', exact: true }).click();
  await page.getByRole('button', { name: 'Lagom', exact: true }).click();
  await page.getByRole('button', { name: 'Så där ja', exact: true }).click();
  await page.locator('.start-button').click();
  await page.waitForFunction(() => document.querySelector('.game-stage')?.classList.contains('is-playing'), null, { timeout: 45000 });
}

const runFrames = (page, count) => page.evaluate(count => new Promise(resolve => {
  const durations = [];
  let last = performance.now();
  let frames = 0;
  const step = () => {
    const now = performance.now();
    durations.push(now - last);
    last = now;
    if (++frames >= count) resolve(durations);
    else requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}), count);

const SAMPLING_INTERVAL = 128;
// Ett stickprov på ett objekt av storleken size representerar i snitt så här många objekt.
const weight = size => 1 / (1 - Math.exp(-size / SAMPLING_INTERVAL));
// Storlekarna i profilen är hopslagna allokeringsgrupper (V8 "allocation folding"),
// inte enskilda objekt, så boxade tal går inte att sortera bort på storlek – därför
// räknas allt och budgeten är grov (se överst).

/** Alla nod-id under (och med) den första noden som matchar. */
function collectIds(node, match, inside = false, ids = new Set()) {
  const here = inside || match(node.callFrame);
  if (here) ids.add(node.id);
  for (const child of node.children ?? []) collectIds(child, match, here, ids);
  return ids;
}

function pathsById(node, out = new Map(), path = []) {
  const trail = [...path, node.callFrame.functionName || '(anonym)'];
  out.set(node.id, { path: trail.slice(-4).join(' › '), url: node.callFrame.url, line: node.callFrame.lineNumber + 1 });
  for (const child of node.children ?? []) pathsById(child, out, trail);
  return out;
}

/** Uppskattat antal objekt och byte i ett delträd. */
function summarize(profile, ids) {
  const perNode = new Map();
  const total = { objects: 0, bytes: 0 };
  for (const sample of profile.samples) {
    if (!ids.has(sample.nodeId)) continue;
    const w = weight(sample.size);
    total.objects += w;
    total.bytes += sample.size * w;
    const node = perNode.get(sample.nodeId) ?? { objects: 0, bytes: 0 };
    node.objects += w; node.bytes += sample.size * w;
    perNode.set(sample.nodeId, node);
  }
  return { ...total, perNode };
}

const named = name => frame => frame.functionName === name;

// 1. Bildrutor och allokeringar under en vanlig promenad.
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await startGame(page);
  assert.equal(await page.locator('.game-stage').getAttribute('data-reduced-motion'), 'false', 'utan systeminställning är rörelserna inte nedtonade');

  // Uppvärmning: låt JIT och kamera sätta sig innan mätningen.
  await page.keyboard.down('d');
  await runFrames(page, Math.min(60, FRAMES));
  await page.keyboard.up('d');

  const cdp = await page.context().newCDPSession(page);
  await cdp.send('HeapProfiler.enable');
  await cdp.send('HeapProfiler.startSampling', { samplingInterval: SAMPLING_INTERVAL, includeObjectsCollectedByMajorGC: true, includeObjectsCollectedByMinorGC: true });
  await page.keyboard.down('w');
  const durations = await runFrames(page, FRAMES);
  await page.keyboard.up('w');
  const { profile } = await cdp.send('HeapProfiler.stopSampling');
  await cdp.send('HeapProfiler.disable');

  const sorted = [...durations].sort((a, b) => a - b);
  const average = durations.reduce((a, b) => a + b, 0) / durations.length;
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  console.log(`bildrutor: ${FRAMES} st, medel ${average.toFixed(1)} ms, p95 ${p95.toFixed(1)} ms, längsta ${sorted[sorted.length - 1].toFixed(0)} ms`);
  if (average > 50) console.log('  (långsam eller programvarurenderad maskin – tiderna säger inget om spelet, bara allokeringarna räknas)');

  const paths = pathsById(profile.head);
  const simulate = summarize(profile, collectIds(profile.head, named('simulate')));
  const emit = summarize(profile, collectIds(profile.head, named('emit')));
  const render = summarize(profile, collectIds(profile.head, named('render')));
  // Långsamma bildrutor delas i flera simuleringssteg (engine.ts: SIMULATION_STEP/MAX_FRAME_TIME),
  // så budgeten räknas per steg för att betyda samma sak på en snabb och en långsam maskin.
  const steps = durations.reduce((sum, ms) => sum + Math.max(1, Math.ceil(Math.min(ms, 150) / 50)), 0);
  const perFrame = value => (value / FRAMES).toFixed(1);
  const perStep = value => (value / steps).toFixed(1);
  console.log(`simuleringssteg: ${steps} st på ${FRAMES} bildrutor`);
  console.log(`objekt per steg: simulering ${perStep(simulate.objects)} st (${perStep(simulate.bytes)} B) · per bildruta: HUD-uppdatering ${perFrame(emit.objects)} st (${perFrame(emit.bytes)} B), rendering ${perFrame(render.objects)} st (${perFrame(render.bytes)} B)`);
  const top = [...simulate.perNode.entries()].sort((a, b) => b[1].objects - a[1].objects).slice(0, 8);
  if (top.length) {
    console.log('  största objektkällorna i simuleringen:');
    for (const [id, { objects, bytes }] of top) {
      const where = paths.get(id);
      console.log(`    ${perStep(objects).padStart(7)} st/steg  ${where.path}  (${where.url.split('/').pop() || 'inbyggd'}:${where.line})`);
    }
  }
  if (process.env.PERF_DEBUG) {
    // Storleksfördelning för stickproven i de största källorna – bra när något oväntat dyker upp.
    for (const [id] of top.slice(0, 3)) {
      const sizes = new Map();
      for (const sample of profile.samples) if (sample.nodeId === id) sizes.set(sample.size, (sizes.get(sample.size) ?? 0) + 1);
      console.log(`  storlekar för ${paths.get(id).path}: ${[...sizes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([size, n]) => `${size} B×${n}`).join(', ')}`);
    }
  }
  assert.ok(profile.samples.length > 0, 'profilen fångade inga allokeringar alls – hittade den spelloopen?');
  assert.ok(simulate.objects / steps <= BUDGET, `simuleringen skapar ${perStep(simulate.objects)} objekt per steg, budgeten är ${BUDGET}. Kör node scripts/frame-loop-allocation-test.mjs för att hitta raden, och använd delade vektorer (se överst i engine.ts) i stället för new/clone/closures i bildruteloopen.`);
  assert.deepEqual(errors, [], 'inga körfel under mätningen');
  console.log('✓ Spelloopen håller allokeringsbudgeten');
  await page.close();
}

// 2. Nedtonade rörelser: spelet startar, läser inställningen och går att spela.
{
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await startGame(page);
  const stage = page.locator('.game-stage');
  assert.equal(await stage.getAttribute('data-reduced-motion'), 'true', 'prefers-reduced-motion når spelet');
  const before = Number(await stage.getAttribute('data-player-z'));
  await page.keyboard.down('w');
  await runFrames(page, 20);
  await page.keyboard.up('w');
  await page.waitForFunction(z => Math.abs(Number(document.querySelector('.game-stage').dataset.playerZ) - z) > 0.5, before, { timeout: 20000 });
  assert.deepEqual(errors, [], 'inga körfel med nedtonade rörelser');
  console.log('✓ Spelet går att spela med nedtonade rörelser');
  await context.close();
}

await browser.close();
