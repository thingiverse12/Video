import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { shootElk, approachRifle, enterHome, leaveHome, lowQuality, readPosition, travelTo, waitText, walkTo } from './game-test-helpers.mjs';

const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {}),
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(60000);
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const save = () => page.evaluate(() => JSON.parse(localStorage.getItem('gramyren-adventure-v1')));
const screenshot = async name => {
  if (!process.env.SCREENSHOTS) return;
  await mkdir('screenshots', { recursive: true });
  await page.screenshot({ path: `screenshots/v03-${name}.png`, fullPage: true });
};

try {
  await page.goto(process.env.TEST_URL || 'http://localhost:5173', { waitUntil: 'networkidle', timeout: 90000 });
  await page.locator('.start-button').waitFor();
  await lowQuality(page);
  await page.locator('.start-button').click();
  await page.keyboard.press('i');
  await page.locator('.mission-tile').filter({ hasText: 'Ut i det fria' }).getByRole('button').click();
  await waitText(page, '.objective-next', 'Hämta geväret i huset');
  await page.keyboard.press('e');
  await page.locator('.speedometer').waitFor();
  assert.equal((await save()).progress.hunt, 0, 'Entering the car cannot complete the rifle objective');
  await page.keyboard.press('e');
  await travelTo(page, 'Jaktmarken');
  await waitText(page, '.interact-prompt', 'Jaktgeväret saknas');
  await page.keyboard.press('e');
  await waitText(page, '.toast-stack', 'Det går inte att jaga utan gevär');
  await page.locator('.interact-prompt').click();
  assert.equal(await page.locator('.wallet strong').innerText(), '240');
  await waitText(page, '.objective-next', 'Hämta geväret i huset');
  assert.equal((await save()).hasRifle, false);
  console.log('✓ Neither driving, entering the forest, E nor the interaction button bypasses the rifle requirement');

  await travelTo(page, 'Hemma på gården');
  await enterHome(page, Math.PI - 0.3); // The stationary car set this camera heading.
  await approachRifle(page);
  assert.equal(await page.locator('.game-stage').getAttribute('data-inside-home'), 'true');
  await screenshot('rifle-in-house');
  await page.keyboard.press('e');
  await waitText(page, '.equipment-status', 'Gevär med');
  assert.equal(await page.locator('.interact-prompt').filter({ hasText: 'Ta jaktgeväret' }).count(), 0);
  const pickup = await save();
  assert.equal(pickup.version, 3);
  assert.equal(pickup.hasRifle, true);
  assert.equal(pickup.progress.hunt, 1);
  assert.equal(pickup.money, 240);
  console.log('✓ Leffe physically enters the house, reaches the rack and collects one persistent rifle');

  const beforeSwitch = await readPosition(page);
  await page.keyboard.press('v');
  await waitText(page, '.character-info strong', 'Bill');
  await waitText(page, '.equipment-status', 'Gevär med');
  const afterSwitch = await readPosition(page);
  assert.ok(Math.hypot(beforeSwitch.x - afterSwitch.x, beforeSwitch.z - afterSwitch.z) < 0.2, 'Switching inside keeps the active character in the room');
  assert.equal((await save()).hasRifle, true);
  await screenshot('bill-equipped');
  await leaveHome(page);
  await travelTo(page, 'Jaktmarken');
  await waitText(page, '.objective-next', 'Sikta och träffa en älg');
  await waitText(page, '.interact-prompt', 'Sikta med geväret');
  await shootElk(page);
  await waitText(page, '.objective-next', 'Uppdrag slutfört');
  assert.equal(await page.locator('.wallet strong').innerText(), '440');
  assert.equal((await save()).progress.hunt, 3);
  assert.equal((await save()).hasRifle, true);
  console.log('✓ Bill shares the rifle, leaves through the door and can complete the cartoon elk hunt');

  await page.reload({ waitUntil: 'networkidle', timeout: 90000 });
  await page.locator('.start-button').waitFor();
  await waitText(page, '.equipment-status', 'Gevär med');
  assert.equal(await page.locator('.character-info strong').innerText(), 'Bill');
  assert.equal(await page.locator('.wallet strong').innerText(), '440');
  await lowQuality(page);
  await page.locator('.start-button').click();
  await enterHome(page);
  await walkTo(page, -12.65, -7.7);
  assert.equal(await page.locator('.game-stage').getAttribute('data-has-rifle'), 'true');
  assert.equal(await page.locator('.interact-prompt').filter({ hasText: 'Ta jaktgeväret' }).count(), 0);
  await page.keyboard.press('v');
  await waitText(page, '.character-info strong', 'Leffe');
  await waitText(page, '.equipment-status', 'Gevär med');
  assert.equal(await page.locator('.wallet strong').innerText(), '440');
  console.log('✓ Reload preserves ownership, the empty rack, rewards and equipment when changing characters');

  // Reset from inside the cutaway must restore the exterior AND the rifle item.
  await page.getByRole('button', { name: 'Inställningar', exact: true }).click();
  await page.getByRole('button', { name: 'Börja om', exact: true }).click();
  await page.getByRole('button', { name: 'Ja, börja om', exact: true }).click();
  await waitText(page, '.equipment-status', 'Inget gevär');
  assert.equal(await page.locator('.game-stage').getAttribute('data-inside-home'), 'false');
  assert.equal(await save(), null);
  await page.locator('.start-button').click();
  await page.keyboard.press('v');
  await enterHome(page);
  await approachRifle(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Spelguide', exact: true }).click();
  await page.getByRole('button', { name: /touchkontroller här/ }).click();
  await page.locator('.touch-actions button').filter({ hasText: /^E/ }).click();
  await waitText(page, '.equipment-status', 'Gevär med');
  assert.equal((await save()).character, 'bill');
  assert.equal((await save()).progress.hunt, 1);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await screenshot('mobile-rifle');
  console.log('✓ Reset returns the rifle to the house; Bill can collect it using the mobile E button');

  // Versions 1 and 2 must not grant the new item for free or delete earned money.
  for (const version of [1, 2]) {
    await page.evaluate(version => localStorage.setItem('gramyren-adventure-v1', JSON.stringify({ version, money: 615, progress: { hunt: 2, rurik: 3, bailiff: 3, shop: 3 }, character: 'bill', activeMission: 'hunt', toolboxTaken: true })), version);
    await page.reload({ waitUntil: 'networkidle', timeout: 90000 });
    await page.locator('.start-button').waitFor();
    await waitText(page, '.equipment-status', 'Inget gevär');
    assert.equal(await page.locator('.wallet strong').innerText(), '615');
    assert.equal(await page.locator('.character-info strong').innerText(), 'Bill');
    await page.keyboard.press('i');
    assert.equal(await page.getByRole('button', { name: 'Avklarat', exact: true }).count(), 3);
    await page.locator('.mission-tile').filter({ hasText: 'Ut i det fria' }).getByRole('button').click();
    await waitText(page, '.objective-next', 'Hämta geväret i huset');
    const migrated = await save();
    assert.equal(migrated.hasRifle, false);
    assert.equal(migrated.progress.hunt, 0);
    assert.equal(migrated.money, 615);
  }
  await page.evaluate(() => localStorage.setItem('gramyren-adventure-v1', JSON.stringify({ version: 2, money: 975, progress: { hunt: 3, rurik: 3, bailiff: 3, shop: 3 }, character: 'leffe', activeMission: 'hunt', toolboxTaken: true })));
  await page.reload({ waitUntil: 'networkidle', timeout: 90000 });
  await page.locator('.start-button').waitFor();
  await waitText(page, '.equipment-status', 'Inget gevär');
  assert.equal(await page.locator('.wallet strong').innerText(), '975');
  await page.keyboard.press('i');
  assert.equal(await page.getByRole('button', { name: 'Avklarat', exact: true }).count(), 4);
  console.log('✓ Legacy formats retain money/completed quests and restart only unfinished, unarmed hunts');
  assert.deepEqual(errors, [], 'No browser exceptions');
  console.log('\nAll house and rifle tests passed.');
} catch (error) {
  await mkdir('screenshots', { recursive: true });
  await page.screenshot({ path: 'screenshots/rifle-test-failure.png', fullPage: true }).catch(() => {});
  console.error('State at failure:', await page.evaluate(() => ({ position: document.querySelector('.game-stage')?.dataset, location: document.querySelector('.location-hud')?.textContent, prompt: document.querySelector('.interact-prompt')?.textContent, objective: document.querySelector('.objective-next')?.textContent, saved: localStorage.getItem('gramyren-adventure-v1') })).catch(() => null));
  throw error;
} finally {
  await browser.close();
}
