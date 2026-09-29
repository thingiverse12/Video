// Spelar in det korta klippet av Skattemasarnas ankomst och sparar som webm.
// Klippet börjar när bilen rullar in (13 sekunder efter start) och är cirka
// 13 sekunder långt: ankomsten, inspektörerna som kliver ur och början av
// samtalet på gården.
//
//   node scripts/record-skatte-clip.mjs                  → clips/skateverket-klipp.webm
//   node scripts/record-skatte-clip.mjs min/sökväg.webm  → egen utdatafil
//
// Inspelningen sker i webbläsaren via canvas.captureStream + MediaRecorder,
// så bara den önskade biten tas med. CHROMIUM_EXECUTABLE pekar ut en webbläsare
// om Playwrights egen inte finns (samma som testerna).
import { mkdir, writeFile, stat } from 'node:fs/promises';
import { dirname, isAbsolute, join, resolve } from 'node:path';
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
  page.setDefaultTimeout(240000);
  await page.goto(process.env.TEST_URL || 'http://localhost:5173', { waitUntil: 'networkidle', timeout: 120000 });
  await page.locator('.start-button').waitFor();
  await page.getByRole('button', { name: 'Nu kör vi', exact: true }).click();

  // Förbered inspelning mot spelscenen; start sker först vid ankomsten.
  await page.evaluate(() => {
    const canvas = document.querySelector('.world-canvas');
    const stream = canvas.captureStream(30);
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm;codecs=vp8';
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 5_000_000 });
    const chunks = [];
    recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
    window.__klipp = { recorder, chunks, stopped: new Promise(done => { recorder.onstop = done; }) };
  });

  console.log('Väntar på att Skattemasarnas bil rullar in (13 sekunder speltid)…');
  await page.waitForFunction(() => document.querySelector('.toast-stack')?.textContent?.includes('Skattemasarna'), undefined, { timeout: 240000 });
  await page.evaluate(() => window.__klipp.recorder.start(200));
  console.log(`Spelar in ${CLIP_SECONDS} sekunder från ankomsten…`);
  await page.waitForTimeout(CLIP_SECONDS * 1000);

  const base64 = await page.evaluate(async () => {
    const { recorder, chunks, stopped } = window.__klipp;
    recorder.stop();
    await stopped;
    const blob = new Blob(chunks, { type: 'video/webm' });
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = '';
    for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    return btoa(binary);
  });

  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, Buffer.from(base64, 'base64'));
  const { size } = await stat(output);
  console.log(`✓ Klippet sparat: ${output} (${Math.round(size / 1024)} KB, ${CLIP_SECONDS} s webm)`);
} finally {
  await browser.close();
}
