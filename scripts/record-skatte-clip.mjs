// Spelar in det korta klippet av Skattemasarnas ankomst och sparar som webm.
// Klippet börjar när bilen rullar in (13 sekunder efter start) och är cirka
// 13 sekunder långt: ankomsten längs grusvägen, inspektörerna som kliver ur
// och början av samtalet på gården.
//
//   node scripts/record-skatte-clip.mjs                  → clips/skateverket-klipp.webm
//   node scripts/record-skatte-clip.mjs min/sökväg.webm  → egen utdatafil
//
// Inspelningen sker i webbläsaren via canvas.captureStream + MediaRecorder.
// Maskiner med mjukvarugrafik kör spelet långsammare än verklig tid, så
// skriptet mäter spelhastigheten (start → ankomst = 13 spelsekunder), spelar
// in 13 spelsekunder och spelar sedan om uppspelningen uppsnabbad till rätt
// takt. CHROMIUM_EXECUTABLE pekar ut en webbläsare om Playwrights egen inte
// finns (samma som testerna).
import { mkdir, writeFile, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const output = process.argv[2] ? resolve(process.argv[2]) : join(root, 'clips', 'skateverket-klipp.webm');
const CLIP_SECONDS = 13;

const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {}),
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.setDefaultTimeout(300000);
  await page.goto(process.env.TEST_URL || 'http://localhost:5173', { waitUntil: 'networkidle', timeout: 120000 });
  await page.locator('.start-button').waitFor();
  await page.getByRole('button', { name: 'Nu kör vi', exact: true }).click();
  const startedAt = Date.now();

  // Förbered inspelning mot spelscenen; start sker först vid ankomsten.
  await page.evaluate(() => {
    const canvas = document.querySelector('.world-canvas');
    const stream = canvas.captureStream(30);
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm;codecs=vp8';
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 5_000_000 });
    const chunks = [];
    recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
    window.__klipp = { recorder, chunks, stopped: new Promise(done => { recorder.onstop = done; }), mimeType };
  });

  console.log('Väntar på att Skattemasarnas bil rullar in (13 sekunder speltid)…');
  await page.waitForFunction(() => document.querySelector('.toast-stack')?.textContent?.includes('Skattemasarna'), undefined, { timeout: 300000 });
  // Spelets egen klocka: 13 spelsekunder tog det här många verkliga sekunder.
  const rate = CLIP_SECONDS / Math.max(1, (Date.now() - startedAt) / 1000);
  const recordMs = Math.round(CLIP_SECONDS / rate * 1000);
  console.log(`Spelet kör ${(rate * 100).toFixed(0)}% av verklig tid. Spelar in ${Math.round(recordMs / 1000)} verkliga sekunder (${CLIP_SECONDS} spelsekunder)…`);

  await page.evaluate(() => window.__klipp.recorder.start(200));
  await page.waitForTimeout(recordMs);

  // Pausa spelet, och spela sedan om uppspelningen uppsnabbad i rätt takt.
  await page.keyboard.press('Escape');
  const base64 = await page.evaluate(async ({ playRate, clipSeconds }) => {
    const { recorder, chunks, stopped, mimeType } = window.__klipp;
    recorder.stop();
    await stopped;
    const url = URL.createObjectURL(new Blob(chunks, { type: 'video/webm' }));
    const v = document.createElement('video');
    v.muted = true; v.src = url;
    await new Promise((res, rej) => { v.onloadedmetadata = res; v.onerror = () => rej(new Error('Kunde inte läsa inspelningen')); });
    const canvas = document.createElement('canvas');
    canvas.width = v.videoWidth || 1280; canvas.height = v.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    const fast = new MediaRecorder(canvas.captureStream(30), { mimeType, videoBitsPerSecond: 5_000_000 });
    const out = [];
    fast.ondataavailable = (event) => { if (event.data.size) out.push(event.data); };
    const fastStopped = new Promise(done => { fast.onstop = done; });
    v.playbackRate = Math.min(16, Math.max(1, playRate));
    fast.start(200);
    const pump = setInterval(() => ctx.drawImage(v, 0, 0), 33);
    await v.play();
    await new Promise(res => {
      const safety = setTimeout(res, clipSeconds * 1000 + 8000);
      v.onended = () => { clearTimeout(safety); res(); };
    });
    clearInterval(pump);
    fast.stop();
    await fastStopped;
    const blob = new Blob(out, { type: 'video/webm' });
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = '';
    for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    return btoa(binary);
  }, { playRate: 1 / rate, clipSeconds: CLIP_SECONDS });

  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, Buffer.from(base64, 'base64'));
  const { size } = await stat(output);
  console.log(`✓ Klippet sparat: ${output} (${Math.round(size / 1024)} KB, ${CLIP_SECONDS} s webm)`);
} finally {
  await browser.close();
}
