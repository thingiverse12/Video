import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { shootElk, approachRifle, enterHome, leaveHome, lowQuality, travelTo, waitText, walkTo } from './game-test-helpers.mjs';

const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {}),
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(60000);
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const data = () => page.locator('.game-stage').evaluate(el => ({ ...el.dataset }));
const shot = async name => {
  if (!process.env.SCREENSHOTS) return;
  await mkdir('screenshots', { recursive: true });
  await page.screenshot({ path: `screenshots/v05-${name}.png`, fullPage: true });
};
const stairsBase = async () => {
  // Through the hall and the open doorway on the front of the dining room.
  await walkTo(page, -9.4, -2.85, 0, 0.22);
  await walkTo(page, -14.4, -2.8, 0, 0.24);
  await waitText(page, '.interact-prompt', 'Gå upp till Bills rum');
};
const reachComputer = async () => {
  await walkTo(page, -11.35, -7.4, 0, 0.25);
  await walkTo(page, -10.6, -6.7, 0, 0.25);
  await walkTo(page, -7.4, -7.5, 0, 0.30);
  await waitText(page, '.interact-prompt', 'Starta Bills dator');
};
const waitFloor = async floor => {
  await page.waitForFunction(floor => {
    const s = document.querySelector('.game-stage')?.dataset;
    return s?.homeFloor === String(floor) && s.onStairs === 'false';
  }, floor, { timeout: 60000 });
};

try {
  await page.goto(process.env.TEST_URL || 'http://localhost:5173', { waitUntil: 'networkidle', timeout: 90000 });
  await page.locator('.start-button').waitFor();
  await lowQuality(page); await page.locator('.start-button').click();
  await enterHome(page);
  await walkTo(page, -9.4, -5.8, 0, 0.30);
  await shot('separate-rooms');
  await walkTo(page, -8.1, -7.75, 0, 0.30);
  await waitText(page, '.interact-prompt', 'Öppna kylskåpet');
  await page.keyboard.press('e');
  await waitText(page, '.home-hud', 'halv gurka');
  await waitText(page, '.world-labels', 'örtkräm');
  await page.waitForTimeout(1400);
  await shot('cucumber-in-fridge');
  assert.equal((await data()).fridgeOpen, 'true');
  assert.equal((await data()).homeFloor, '0');
  assert.equal(await page.locator('.wallet strong').innerText(), '240');
  console.log('✓ The fridge contains örtkräm and half a cucumber; the new room layout is playable');

  await walkTo(page, -9.4, -5.8, 0, 0.30);
  await stairsBase();
  await shot('wooden-stairs');
  await page.keyboard.press('e');
  await page.waitForFunction(() => Number(document.querySelector('.game-stage')?.dataset.playerY) > 1.2 && document.querySelector('.game-stage')?.dataset.onStairs === 'true');
  await page.keyboard.press('Escape');
  await page.getByRole('dialog').waitFor();
  const pausedHeight = (await data()).playerY;
  await page.waitForTimeout(800);
  assert.equal((await data()).playerY, pausedHeight, 'Pausing stops the stair animation');
  await page.getByRole('button', { name: 'Fortsätt äventyret', exact: true }).click();
  await waitFloor(1);
  await waitText(page, '.location-hud', 'Bills rum');
  assert.equal((await data()).playerY, '3.65');
  assert.equal((await data()).fridgeOpen, 'false');
  assert.equal(await page.locator('.world-labels').filter({ hasText: 'Jaktgeväret' }).count(), 0, 'No ground-floor item labels bleed through the upper floor');
  console.log('✓ The animated wooden staircase reaches a real upper floor, and pauses/resumes safely');

  await reachComputer();
  assert.equal((await data()).computerOn, 'false');
  await shot('bills-room');
  await page.keyboard.press('e');
  await waitText(page, '.home-hud', 'Datorn surrar');
  assert.equal((await data()).computerOn, 'true');
  assert.equal((await data()).hasRifle, 'false');
  await shot('old-computer-on');
  await page.keyboard.press('v');
  await waitText(page, '.character-info strong', 'Bill');
  assert.equal((await data()).homeFloor, '1');
  assert.equal((await data()).playerY, '3.65');
  assert.equal(await page.locator('.wallet strong').innerText(), '240');
  await page.locator('.interact-prompt').click();
  assert.equal((await data()).computerOn, 'false');
  console.log('✓ The old CRT computer powers on/off, and switching characters preserves the correct floor');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Spelguide', exact: true }).click();
  await page.getByRole('button', { name: /touchkontroller här/ }).click();
  await page.locator('.touch-actions button').filter({ hasText: /^E/ }).click();
  assert.equal((await data()).computerOn, 'true');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await shot('mobile-upstairs');
  await page.getByRole('button', { name: 'Visa touchkontroller', exact: true }).click();
  await page.setViewportSize({ width: 1440, height: 900 });

  // Loftet: den branta stegen från Bills rum, och bakmaskinen som gått sedan i julas.
  await walkTo(page, -10.6, -6.7, 0, 0.3);
  await walkTo(page, -11.0, -5.6, 0, 0.30);
  await waitText(page, '.interact-prompt', 'Klättra upp på loftet');
  await waitText(page, '.world-labels', 'Loftstegen');
  assert.equal((await data()).breadMachineOn, 'true');
  await page.keyboard.press('e');
  await page.waitForFunction(() => document.querySelector('.game-stage')?.dataset.onLadder === 'true');
  await waitText(page, '.home-hud', 'Pinne för pinne');
  await waitFloor(2);
  assert.equal((await data()).onLadder, 'false');
  assert.equal((await data()).playerY, '5.95');
  await waitText(page, '.location-hud', 'Loftet');
  await waitText(page, '.home-hud', 'bränt bröd');
  await waitText(page, '.world-labels', 'igång sedan i julas');
  assert.equal(await page.locator('.world-labels').filter({ hasText: 'Bills gamla dator' }).count(), 0, 'Bills room labels do not bleed through the loft');
  await shot('loft');
  console.log('✓ The loft ladder climbs rung by rung to a third floor under the roof');

  await walkTo(page, -6.8, -6.75, 0, 0.45);
  await waitText(page, '.interact-prompt', 'Stäng av bakmaskinen');
  await page.keyboard.press('e');
  await page.waitForFunction(() => document.querySelector('.game-stage')?.dataset.breadMachineOn === 'false');
  await waitText(page, '.home-hud', 'Äntligen tyst');
  await waitText(page, '.world-labels', 'avstängd');
  await waitText(page, '.interact-prompt', 'Sätt på bakmaskinen igen');
  assert.equal(await page.locator('.wallet strong').innerText(), '240', 'Switching off the bread machine is not a paid job');
  await shot('bread-machine-off');
  await page.locator('.interact-prompt').click();
  await page.waitForFunction(() => document.querySelector('.game-stage')?.dataset.breadMachineOn === 'true');
  await page.keyboard.press('e');
  await page.waitForFunction(() => document.querySelector('.game-stage')?.dataset.breadMachineOn === 'false');
  console.log('✓ Bills bread machine can be switched off (and, against better judgement, on again)');

  await walkTo(page, -10.55, -5.45, 0, 0.35);
  await waitText(page, '.interact-prompt', 'Klättra ner från loftet');
  await page.keyboard.press('e');
  await waitFloor(1);
  assert.equal((await data()).playerY, '3.65');
  await waitText(page, '.location-hud', 'Bills rum');
  assert.equal((await data()).breadMachineOn, 'false', 'The bread machine stays off after climbing down');
  console.log('✓ The ladder leads back down to Bills room');

  await walkTo(page, -10.6, -6.7, 0, 0.3);
  await walkTo(page, -11.35, -7.4, 0, 0.25);
  await walkTo(page, -14.4, -7.45, 0, 0.25);
  await waitText(page, '.interact-prompt', 'Gå nerför trätrappan');
  await page.locator('.interact-prompt').click();
  await waitFloor(0);
  assert.equal((await data()).playerY, '0.56');
  await walkTo(page, -9.4, -2.85, 0, 0.24);
  await walkTo(page, -9.4, -6.6, 0, 0.28);
  await approachRifle(page);
  await page.keyboard.press('e');
  await waitText(page, '.equipment-status', 'Gevär med');
  await leaveHome(page);
  assert.equal((await data()).computerOn, 'false');
  await travelTo(page, 'Jaktmarken');
  await waitText(page, '.interact-prompt', 'Sikta med geväret');
  await shootElk(page);
  await waitText(page, '.objective-next', 'Uppdrag slutfört');
  assert.equal(await page.locator('.wallet strong').innerText(), '440');
  console.log('✓ Mobile controls work upstairs; descending, leaving, rifle pickup and hunting still work');

  await page.reload({ waitUntil: 'networkidle', timeout: 90000 });
  await page.locator('.start-button').waitFor();
  assert.equal((await data()).homeFloor, '0');
  assert.equal((await data()).onStairs, 'false');
  assert.equal((await data()).computerOn, 'false');
  assert.equal((await data()).hasRifle, 'true');
  assert.equal((await data()).breadMachineOn, 'false', 'The switched-off bread machine is saved');
  assert.equal(await page.locator('.wallet strong').innerText(), '440');
  await lowQuality(page); await page.locator('.start-button').click();
  await enterHome(page); await walkTo(page, -9.4, -5.8, 0, 0.25); await stairsBase();
  await page.keyboard.press('e'); await waitFloor(1);
  await page.getByRole('button', { name: 'Inställningar', exact: true }).click();
  await page.getByRole('button', { name: 'Börja om', exact: true }).click();
  await page.getByRole('button', { name: 'Ja, börja om', exact: true }).click();
  const reset = await data();
  assert.equal(reset.homeFloor, '0'); assert.equal(reset.insideHome, 'false'); assert.equal(reset.computerOn, 'false'); assert.equal(reset.onStairs, 'false');
  assert.equal(reset.breadMachineOn, 'true', 'Resetting the game starts the bread machine again');
  assert.equal(await page.evaluate(() => localStorage.getItem('gramyren-adventure-v1')), null);
  assert.deepEqual(errors, [], 'No browser exceptions');
  console.log('✓ Reload preserves earned progress; resetting upstairs returns cleanly to the yard');
  console.log('\nAll upstairs and cucumber tests passed.');
} catch (error) {
  await mkdir('screenshots', { recursive: true });
  await page.screenshot({ path: 'screenshots/upstairs-test-failure.png', fullPage: true }).catch(() => {});
  console.error('State at failure:', await data().catch(() => null), await page.locator('.interact-prompt').textContent().catch(() => null));
  throw error;
} finally { await browser.close(); }
