import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { shootElk, approachRifle, enterHome, leaveHome, walkTo } from './game-test-helpers.mjs';

// Run against `npm run dev`. A system Chromium is optional; otherwise use
// `npx playwright install chromium` once before running this test.
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {}),
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.setDefaultTimeout(45000);
const waitText = (selector, text, timeout = 45000) => page.waitForFunction(
  ({ selector, text }) => document.querySelector(selector)?.textContent?.includes(text),
  { selector, text }, { timeout },
);
const openMap = async destination => {
  await page.keyboard.press('m');
  await page.getByRole('button', { name: `Välj ${destination}`, exact: true }).click();
  await page.getByRole('button', { name: 'Snabbresa hit', exact: true }).click();
};

try {
  await page.goto(process.env.TEST_URL || 'http://localhost:5173', { waitUntil: 'networkidle', timeout: 90000 });
  await page.locator('.start-button').waitFor();
  assert.equal(await page.locator('.world-canvas').count(), 1, 'WebGL canvas exists');
  console.log('✓ 3D world boots without runtime errors');

  // Also exercise the low-power renderer path for software-rendered CI.
  await page.getByRole('button', { name: 'Inställningar', exact: true }).click();
  await page.getByRole('button', { name: 'Lagom', exact: true }).click();
  await page.getByRole('button', { name: 'Så där ja', exact: true }).click();
  await page.getByRole('button', { name: 'Nu kör vi', exact: true }).click();
  await page.keyboard.press('i');
  await page.locator('.mission-tile').filter({ hasText: 'Ut i det fria' }).getByRole('button').click();
  await enterHome(page);
  await approachRifle(page);
  await page.keyboard.press('e');
  await waitText('.equipment-status', 'Gevär med');
  await leaveHome(page);
  await openMap('Hemma på gården');
  await walkTo(page, 5.7, 8.8);
  console.log('✓ Enter the house and collect the required hunting rifle');
  await waitText('.interact-prompt', 'Hoppa in');
  await page.keyboard.press('e');
  await page.locator('.speedometer').waitFor();
  await page.keyboard.down('w');
  await page.waitForFunction(() => Number(document.querySelector('.speedometer strong')?.textContent) >= 5);
  await page.keyboard.up('w');
  console.log('✓ E enters the V40 and WASD accelerates it');

  await page.keyboard.press('v');
  await waitText('.character-info strong', 'Billy');
  console.log('✓ The player can switch brothers');

  await openMap('Jaktmarken');
  await waitText('.location-hud strong', 'Jaktmarken');
  await page.keyboard.press('e');
  await page.locator('.speedometer').waitFor({ state: 'detached' });
  await waitText('.interact-prompt', 'Sikta med geväret');
  await shootElk(page);
  await waitText('.objective-next', 'Uppdrag slutfört');
  assert.equal(await page.locator('.wallet strong').innerText(), '440', 'Hunt reward plus mission reward');
  console.log('✓ Travel, leave the car, hunt an elk, and receive the reward');

  await openMap('Tonys gård');
  await waitText('.location-hud strong', 'Tonys gård');
  // Hunting now requires looking around, so do not assume the old camera heading.
  const tonyYaw = Number(await page.locator('.game-stage').getAttribute('data-camera-yaw'));
  await walkTo(page, 32.3, -17.6, tonyYaw);
  await waitText('.interact-prompt', 'Låna verktygslådan');
  await page.keyboard.press('e');
  await waitText('.toast-stack', 'Lånat utan att fråga');
  await openMap('Hemma på gården');
  await waitText('.wallet strong', '540');
  console.log('✓ Tony can be visited, his toolbox taken, and the escape completed');

  await page.getByRole('button', { name: 'Uppdrag', exact: true }).click();
  assert.equal(await page.locator('.mission-tile').count(), 4);
  assert.equal(await page.getByRole('button', { name: 'Avklarat', exact: true }).count(), 2);
  await page.getByRole('button', { name: 'Framkalla besöket', exact: true }).click();
  await waitText('.world-labels', 'Kronofogden', 90000);
  const deadline = Date.now() + 90000;
  while (Date.now() < deadline) {
    if ((await page.locator('.objective-next').innerText()).includes('Uppdrag slutfört')) break;
    await page.keyboard.press('f');
    await page.waitForTimeout(650);
  }
  await waitText('.objective-next', 'Uppdrag slutfört', 5000);
  assert.equal(await page.locator('.wallet strong').innerText(), '740');
  console.log('✓ Both bailiffs arrive, can be fought, and flee; all three original missions complete');

  await page.keyboard.press('Escape');
  await page.getByRole('dialog').waitFor();
  const pausedTime = await page.locator('.weather-hud').innerText();
  await page.waitForTimeout(1200);
  assert.equal(await page.locator('.weather-hud').innerText(), pausedTime);
  await page.getByRole('button', { name: 'Fortsätt äventyret', exact: true }).click();
  console.log('✓ Pause stops the game clock');

  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('lillasen-adventure-v1')));
  assert.deepEqual(saved.progress, { hunt: 3, tony: 3, bailiff: 3, shop: 0 });
  assert.equal(saved.money, 740);
  assert.equal(saved.hasRifle, true);
  assert.equal(saved.version, 3);
  console.log('✓ Mission progress and money are saved locally');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: 'networkidle', timeout: 90000 });
  await page.locator('.welcome-panel').waitFor();
  assert.equal(await page.locator('.wallet strong').innerText(), '740');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No horizontal overflow on mobile');
  await page.getByRole('button', { name: 'Spelguide', exact: true }).click();
  await page.getByRole('button', { name: /pekskärm/ }).click();
  assert.equal(await page.locator('.touch-controls.force-visible').count(), 1);
  console.log('✓ Saved state reloads and mobile touch controls are available');

  await page.getByRole('button', { name: 'Inställningar', exact: true }).click();
  await page.getByRole('button', { name: 'Börja om', exact: true }).click();
  await page.getByRole('button', { name: 'Ja, börja om', exact: true }).click();
  await waitText('.wallet strong', '240');
  assert.equal(await page.evaluate(() => localStorage.getItem('lillasen-adventure-v1')), null);
  assert.equal(await page.locator('.start-button').innerText(), 'Nu kör vi');
  console.log('✓ Reset requires confirmation and clears all saved progress');

  if (process.env.SCREENSHOTS) {
    await mkdir('screenshots', { recursive: true });
    await page.screenshot({ path: 'screenshots/smoke-mobile.png', fullPage: true });
  }
  assert.deepEqual(errors, [], 'No browser exceptions');
  console.log('\nAll smoke tests passed.');
} finally {
  await browser.close();
}
