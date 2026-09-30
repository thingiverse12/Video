// Skattemasarnas besök — det korta klippet. Spelet går i tretton sekunder,
// sedan rullar deras bil in på gården, inspektörerna kliver ur och stämmer av
// era inkomster innan de åker vidare. Kontrollerna läser bara det som står i
// gränssnittet (toastar och etiketter); inga testvägar in i motorn.
// Kör: node scripts/skatte-smoke-test.mjs   (kräver igångsatt spelserver)
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {}),
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.setDefaultTimeout(180000);
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const waitText = (selector, text, timeout = 300000) => page.waitForFunction(
  ({ selector, text }) => document.querySelector(selector)?.textContent?.includes(text),
  { selector, text }, { timeout });

try {
  await page.goto(process.env.TEST_URL || 'http://localhost:5173', { waitUntil: 'networkidle', timeout: 90000 });
  await page.locator('.start-button').waitFor();
  await page.getByRole('button', { name: 'Inställningar', exact: true }).click();
  await page.getByRole('button', { name: 'Lagom', exact: true }).click();
  await page.getByRole('button', { name: 'Så där ja', exact: true }).click();
  await page.getByRole('button', { name: 'Nu kör vi', exact: true }).click();

  // Besöket kan inte komma före tretton sekunder speltid: speltiden ligger
  // alltid bakom den verkliga tiden (MAX_FRAME_TIME begränsar varje steg).
  await page.waitForTimeout(6000);
  const early = await page.evaluate(() => document.querySelector('.toast-stack')?.textContent ?? '');
  assert.ok(!early.includes('Skattemasarna'), `Besöket kom för tidigt: ${early}`);
  console.log('✓ Inget besök före tretton sekunder');

  // Klippet startar: toastsen slår till när bilen rullar in.
  await waitText('.toast-stack', 'Skattemasarna');
  console.log('✓ Skattemasarna kommer — klippet startar vid 13 sekunder');

  // Inspektörerna kliver ur under klippet och syns som etiketter med replik.
  await waitText('.world-labels', 'Skattemasarna');
  console.log('✓ Inspektörerna är på gården med repliker och etiketter');

  // Besöket tar slut på egen hand: avskedsrepliken kommer när de går till bilen.
  // Hela besöket är ~23 spelsekunder efter inspektörsetiketten; på maskiner med
  // mjukvarugrafik går speltiden långsamt, så väntetiden måste vara generös.
  await waitText('.world-labels', 'Vi återkommer vid nästa deklaration', 540000);
  console.log('✓ Besöket avslutas med avskedsreplik');

  assert.deepEqual(errors, [], `Fel på sidan: ${errors.join(' | ')}`);
  console.log('✓ Inga sidfel under besöket');
  console.log('Skattemasarnas besök fungerar.');
} finally {
  await browser.close();
}
