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
const isOpen = () => page.locator('.game-stage').getAttribute('data-fridge-open');
const shot = async name => {
  if (!process.env.SCREENSHOTS) return;
  await mkdir('screenshots', { recursive: true });
  await page.screenshot({ path: `screenshots/v04-${name}.png`, fullPage: true });
};

try {
  await page.goto(process.env.TEST_URL || 'http://localhost:5173', { waitUntil: 'networkidle', timeout: 90000 });
  await page.locator('.start-button').waitFor();
  await lowQuality(page);
  await page.locator('.start-button').click();
  await enterHome(page);
  await walkTo(page, -10.0, -5.6);
  assert.equal(await isOpen(), 'false');
  assert.equal(await page.locator('.game-stage').getAttribute('data-has-rifle'), 'false');
  await shot('old-interior');
  console.log('✓ The furnished house is enterable and its central walking route remains clear');

  // Approach from the right so the brother does not stand in the door swing.
  await walkTo(page, -8.10, -7.75, 0, 0.35);
  await waitText(page, '.interact-prompt', 'Öppna kylskåpet');
  await page.keyboard.press('e');
  await waitText(page, '.home-hud', 'Lite kvar i kylen');
  assert.equal(await isOpen(), 'true');
  await waitText(page, '.interact-prompt', 'Stäng kylskåpet');
  await waitText(page, '.world-labels', 'örtkräm');
  await page.waitForTimeout(1800); // Let the animated door swing open for the visual check.
  await shot('fridge-open');
  assert.equal(await page.locator('.wallet strong').innerText(), '240');
  assert.equal(await page.locator('.game-stage').getAttribute('data-has-rifle'), 'false');
  console.log('✓ E opens the old fridge and reveals örtkräm, without granting money or hunting equipment');

  await page.keyboard.press('Escape');
  await page.getByRole('dialog').waitFor();
  await page.keyboard.press('e');
  assert.equal(await isOpen(), 'true', 'The paused game ignores fridge input');
  await page.getByRole('button', { name: 'Fortsätt äventyret', exact: true }).click();
  await page.locator('.interact-prompt').click();
  await waitText(page, '.interact-prompt', 'Öppna kylskåpet');
  assert.equal(await isOpen(), 'false');
  await page.keyboard.press('v');
  await waitText(page, '.character-info strong', 'Ebbe');
  await page.keyboard.press('e');
  assert.equal(await isOpen(), 'true');
  console.log('✓ Both friends can open/close the fridge; pausing and the context button behave correctly');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Spelguide', exact: true }).click();
  await page.getByRole('button', { name: /pekskärm/ }).click();
  const touchE = page.locator('.touch-actions button').filter({ hasText: /^E/ });
  await touchE.click(); assert.equal(await isOpen(), 'false');
  await touchE.click(); assert.equal(await isOpen(), 'true');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.waitForTimeout(1200);
  await shot('mobile-fridge');
  console.log('✓ Mobile E controls open/close the fridge and the layout has no horizontal overflow');

  await page.getByRole('button', { name: 'Visa touchkontroller', exact: true }).click();
  await page.setViewportSize({ width: 1440, height: 900 });
  await walkTo(page, -10, -6.9);
  await approachRifle(page);
  await page.keyboard.press('e');
  await waitText(page, '.equipment-status', 'Gevär med');
  await leaveHome(page);
  assert.equal(await isOpen(), 'false', 'Leaving the room closes the fridge');
  await travelTo(page, 'Jaktmarken');
  await waitText(page, '.interact-prompt', 'Sikta med geväret');
  await shootElk(page);
  await waitText(page, '.objective-next', 'Uppdrag slutfört');
  assert.equal(await page.locator('.wallet strong').innerText(), '440');
  console.log('✓ Furniture leaves the rifle and exit reachable, and the existing hunt still completes');

  await page.reload({ waitUntil: 'networkidle', timeout: 90000 });
  await page.locator('.start-button').waitFor();
  assert.equal(await isOpen(), 'false');
  await waitText(page, '.equipment-status', 'Gevär med');
  assert.equal(await page.locator('.wallet strong').innerText(), '440');
  await lowQuality(page);
  await page.locator('.start-button').click();
  await enterHome(page);
  await walkTo(page, -10, -5.6);
  // The sofa is not pass-through scenery.
  await walkTo(page, -8.9, -5.6, 0, 0.35);
  await page.keyboard.down('d');
  await page.waitForTimeout(2500);
  await page.keyboard.up('d');
  const besideSofa = await readPosition(page);
  assert.ok(besideSofa.x <= -8.20, `Sofa collision should block walking through it: ${JSON.stringify(besideSofa)}`);
  await walkTo(page, -9.1, -7.45, 0, 0.40);
  await waitText(page, '.interact-prompt', 'Öppna kylskåpet');
  await page.keyboard.press('e');
  await waitText(page, '.home-hud', 'Lite kvar i kylen');
  await page.getByRole('button', { name: 'Inställningar', exact: true }).click();
  await page.getByRole('button', { name: 'Börja om', exact: true }).click();
  await page.getByRole('button', { name: 'Ja, börja om', exact: true }).click();
  assert.equal(await isOpen(), 'false');
  assert.equal(await page.locator('.game-stage').getAttribute('data-inside-home'), 'false');
  await waitText(page, '.equipment-status', 'Inget gevär');
  assert.equal(await page.evaluate(() => localStorage.getItem('gramyren-adventure-v1')), null);
  console.log('✓ Reload preserves earned progress, sofa collisions work, and reset closes the fridge');
  assert.deepEqual(errors, [], 'No browser exceptions');
  console.log('\nAll old-interior and fridge tests passed.');
} catch (error) {
  await mkdir('screenshots', { recursive: true });
  await page.screenshot({ path: 'screenshots/home-test-failure.png', fullPage: true }).catch(() => {});
  console.error('State at failure:', await page.evaluate(() => ({ position: { ...document.querySelector('.game-stage')?.dataset }, prompt: document.querySelector('.interact-prompt')?.textContent, home: document.querySelector('.home-hud')?.textContent, saved: localStorage.getItem('gramyren-adventure-v1') })).catch(() => null));
  throw error;
} finally {
  await browser.close();
}
