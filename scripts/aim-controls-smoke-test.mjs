import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { aimAtElk, lowQuality, travelTo, waitText } from './game-test-helpers.mjs';

// Focused input regression. A normal saved-game fixture supplies an already
// collected rifle; test:shooting separately checks physical pickup and collisions.
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {}),
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, hasTouch: true });
page.setDefaultTimeout(45000);
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const state = () => page.locator('.game-stage').evaluate(el => ({
  aiming: el.dataset.aiming === 'true', placed: el.dataset.aimPlaced === 'true',
  shots: +el.dataset.shotsFired, hits: +el.dataset.shotsHit,
  x: +el.dataset.playerX, z: +el.dataset.playerZ, yaw: +el.dataset.cameraYaw,
  projectiles: JSON.parse(el.dataset.projectiles), feedback: el.dataset.shotFeedback,
}));
const empty = () => page.waitForFunction(() => JSON.parse(document.querySelector('.game-stage').dataset.projectiles).length === 0);

try {
  await page.goto(process.env.TEST_URL || 'http://localhost:5173', { waitUntil: 'networkidle' });
  await page.locator('.start-button').waitFor(); await lowQuality(page); await page.locator('.start-button').click();
  await page.keyboard.press('q');
  await waitText(page, '.toast-stack', 'Jaktgeväret saknas');
  assert.equal((await state()).aiming, false);
  assert.equal((await state()).shots, 0);

  await page.evaluate(() => localStorage.setItem('gramyren-adventure-v1', JSON.stringify({
    version: 3, hasRifle: true, money: 240, character: 'nils', activeMission: 'hunt',
    progress: { hunt: 1, shop: 0, rurik: 0, bailiff: 0 }, carryingMeat: false, toolboxTaken: false,
  })));
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('.start-button').waitFor(); await lowQuality(page); await page.locator('.start-button').click();
  await travelTo(page, 'Jaktmarken');
  const shoot = page.getByRole('button', { name: 'Skjut', exact: true });
  assert.equal(await shoot.isDisabled(), true, 'Lowered rifle cannot fire');
  await page.getByRole('button', { name: 'Sikta med geväret', exact: true }).click();
  assert.equal((await state()).aiming, true);
  assert.equal((await state()).placed, false);
  assert.equal(await shoot.isDisabled(), true, 'Raising alone is not aiming');
  await page.keyboard.press('f'); await page.keyboard.press('Space');
  assert.equal((await state()).shots, 0, 'Keyboard shortcuts cannot bypass manual aim');
  assert.equal((await state()).aiming, true, 'F never lowers the rifle to throw a punch');
  console.log('✓ Rifle is required, and neither F, Space nor Skjut can bypass placing the sight');

  await page.locator('.game-stage').evaluate(el => {
    window.flightSamples = [];
    new MutationObserver(() => {
      const shots = JSON.parse(el.dataset.projectiles);
      if (shots.length) window.flightSamples.push(shots);
    }).observe(el, { attributes: true, attributeFilter: ['data-projectiles'] });
  });
  const box = await page.locator('.world-canvas').boundingBox();
  await page.mouse.move(box.x + box.width * .86, box.y + box.height * .58);
  await page.waitForFunction(() => document.querySelector('.game-stage').dataset.aimPlaced === 'true');
  assert.equal(await shoot.isDisabled(), false);
  await page.keyboard.press('f');
  await page.waitForFunction(() => +document.querySelector('.game-stage').dataset.shotsFired === 1);
  assert.equal((await state()).aiming, true, 'F fires without changing aiming mode');
  await empty();
  console.log('✓ Mouse aiming unlocks the real F firing action');

  await page.keyboard.press('q'); await page.keyboard.press('q');
  assert.equal((await state()).placed, false, 'Raising again requires a new aim input');
  await page.keyboard.press('Space');
  assert.equal((await state()).shots, 1);
  const beforeArrow = await state();
  const reticleBefore = await page.locator('.aim-reticle').getAttribute('style');
  await page.keyboard.down('ArrowRight');
  await page.waitForFunction(() => document.querySelector('.game-stage').dataset.aimPlaced === 'true');
  await page.keyboard.up('ArrowRight');
  assert.notEqual(await page.locator('.aim-reticle').getAttribute('style'), reticleBefore);
  const afterArrow = await state();
  assert.ok(Math.hypot(afterArrow.x - beforeArrow.x, afterArrow.z - beforeArrow.z) < .02, 'Arrow aiming does not walk the character');
  assert.equal(afterArrow.yaw, beforeArrow.yaw, 'Keyboard aim does not shake/turn the camera');
  await page.waitForFunction(() => !document.querySelector('.shoot-button')?.disabled);
  await page.keyboard.press('Space');
  await page.waitForFunction(() => +document.querySelector('.game-stage').dataset.shotsFired === 2);
  await empty();
  console.log('✓ Arrow keys place the sight without moving the player; Space then fires');

  await page.keyboard.press('q');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Sikta med geväret', exact: true }).tap();
  const touchFire = page.getByRole('button', { name: 'Skjut med F', exact: true });
  assert.equal(await touchFire.isDisabled(), true);
  const beforeTouch = await state();
  await aimAtElk(page, true);
  assert.equal((await state()).shots, beforeTouch.shots, 'Touching the target aims; it never auto-fires');
  assert.equal((await state()).placed, true);
  await page.waitForFunction(() => document.querySelector('.touch-fire-button') && !document.querySelector('.touch-fire-button').disabled);
  assert.equal(await touchFire.isDisabled(), false);
  if (process.env.SCREENSHOTS) {
    await mkdir('screenshots', { recursive: true });
    await page.screenshot({ path: 'screenshots/v071-manual-aim-mobile.png' });
    await aimAtElk(page, true);
  }
  await touchFire.tap();
  await page.waitForFunction(count => +document.querySelector('.game-stage').dataset.shotsFired > count, beforeTouch.shots);
  assert.equal((await state()).aiming, true);
  await page.waitForFunction(hits => +document.querySelector('.game-stage').dataset.shotsHit > hits, beforeTouch.hits);
  assert.ok(await page.evaluate(() => window.flightSamples.length > 0), 'Actual bullet positions were rendered in flight');
  assert.equal((await state()).yaw, beforeTouch.yaw);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  console.log('✓ The main mobile F/Skjut button fires a visible bullet that really hits');

  await page.getByRole('button', { name: 'Lägg ner geväret', exact: true }).tap();
  assert.equal((await state()).placed, false);
  assert.equal(await shoot.isDisabled(), true);
  assert.equal(await page.locator('.touch-actions').getByRole('button', { name: 'Slå', exact: true }).count(), 1);
  const beforePunch = (await state()).shots;
  await page.keyboard.press('f');
  assert.equal((await state()).shots, beforePunch, 'Lowered-rifle F remains a punch, not a shot');
  assert.deepEqual(errors, []);
  console.log('✓ Lowering restores fighting and resets the aim gate; no browser errors');
  console.log('\nAll aim-control smoke tests passed.');
} catch (error) {
  console.error('Aim state:', await state().catch(() => null));
  await mkdir('screenshots', { recursive: true });
  await page.screenshot({ path: 'screenshots/v071-aim-test-failure.png' }).catch(() => undefined);
  throw error;
} finally { await browser.close(); }
