import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {}),
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.setDefaultTimeout(60000);
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const waitText = (selector, text, timeout = 60000) => page.waitForFunction(({ selector, text }) => document.querySelector(selector)?.textContent?.includes(text), { selector, text }, { timeout });
const holdUntil = async (keys, predicate, timeout = 45000) => {
  for (const key of keys) await page.keyboard.down(key);
  try { await page.waitForFunction(predicate, undefined, { timeout }); }
  finally { for (const key of [...keys].reverse()) await page.keyboard.up(key); }
};
const travelToShop = async () => {
  await page.keyboard.press('m');
  await page.getByRole('button', { name: 'Välj ICA Sörbäcken', exact: true }).click();
  await page.getByRole('button', { name: 'Snabbresa hit', exact: true }).click();
  await waitText('.interact-prompt', 'Gå in på ICA Sörbäcken');
  await page.keyboard.press('e');
  await waitText('.location-hud strong', 'Inne på ICA Sörbäcken');
};
const takeMeat = async () => {
  await holdUntil(['w', 'a'], () => document.querySelector('.interact-prompt')?.textContent?.includes('Försök sno'));
  await page.keyboard.press('e');
  await page.locator('.shop-hud.carrying').waitFor();
};

try {
  await page.goto(process.env.TEST_URL || 'http://localhost:5173', { waitUntil: 'networkidle', timeout: 90000 });
  await page.locator('.start-button').waitFor();
  await page.getByRole('button', { name: 'Inställningar', exact: true }).click();
  await page.getByRole('button', { name: 'Lagom', exact: true }).click();
  await page.getByRole('button', { name: 'Så där ja', exact: true }).click();
  await page.getByRole('button', { name: 'Nu kör vi', exact: true }).click();
  await travelToShop();
  assert.equal(await page.locator('.shop-hud').count(), 1);
  console.log('✓ ICA has a map destination and an enterable, cutaway interior');

  await takeMeat();
  const firstAttempt = await page.evaluate(() => JSON.parse(localStorage.getItem('lillasen-adventure-v1')));
  assert.equal(firstAttempt.carryingMeat, true);
  assert.equal(firstAttempt.progress.shop, 2);
  console.log('✓ Leif can attempt the meat theft and carries a saved shopping bag');

  await page.keyboard.press('m');
  await page.getByRole('button', { name: 'Välj Hemma på gården', exact: true }).click();
  assert.equal(await page.getByRole('button', { name: 'Snabbresa hit', exact: true }).isDisabled(), true);
  await page.keyboard.press('m');
  console.log('✓ Fast travel cannot bypass the shop escape');

  // Stand still: the clerk/risk meter must actually be able to catch the player.
  await waitText('.wallet strong', '220', 90000);
  assert.equal(await page.locator('.shop-hud.carrying').count(), 0);
  await waitText('.interact-prompt', 'Gå in på ICA Sörbäcken');
  const caught = await page.evaluate(() => JSON.parse(localStorage.getItem('lillasen-adventure-v1')));
  assert.equal(caught.carryingMeat, false);
  assert.equal(caught.progress.shop, 1);
  console.log('✓ Bosse catches a failed attempt, returns the meat, charges 20 kr, and allows a retry');

  // Billy can do the same mission. Travel to the entrance before the second attempt.
  await page.keyboard.press('v');
  await waitText('.character-info strong', 'Billy');
  await travelToShop();
  await takeMeat();
  await holdUntil(['Shift', 's', 'd'], () => document.querySelector('.interact-prompt')?.textContent?.includes('Gå ut från ICA'));
  await page.keyboard.press('e');
  await waitText('.location-hud strong', 'ICA Sörbäcken');
  assert.ok(!(await page.locator('.location-hud strong').innerText()).includes('Inne'));
  console.log('✓ Billy can take the meat and leave the shop');

  // Walk home through the actual world, not by teleporting or changing internal state.
  await holdUntil(['Shift', 'a'], () => {
    const distance = parseInt(document.querySelector('.waypoint-hud b')?.textContent || '999', 10);
    return distance <= 16;
  }, 90000);
  await holdUntil(['Shift', 'w'], () => document.querySelector('.objective-next')?.textContent?.includes('Uppdrag slutfört'), 90000);
  assert.equal(await page.locator('.wallet strong').innerText(), '340');
  assert.equal(await page.locator('.shop-hud.carrying').count(), 0);
  const completed = await page.evaluate(() => JSON.parse(localStorage.getItem('lillasen-adventure-v1')));
  assert.equal(completed.progress.shop, 3);
  assert.equal(completed.carryingMeat, false);
  assert.equal(completed.character, 'billy');
  console.log('✓ Escaping and bringing the meat home completes the fourth mission (+120 kr)');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Spelguide', exact: true }).click();
  await page.getByRole('button', { name: /pekskärm/ }).click();
  await page.getByRole('button', { name: 'Håll för att springa', exact: true }).waitFor();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.keyboard.press('i');
  assert.equal(await page.locator('.mission-tile').count(), 4);
  console.log('✓ Four missions fit mobile, and touch players have a sprint button');

  // Upgrading must not delete a player's version-1 adventures or money.
  await page.evaluate(() => localStorage.setItem('lillasen-adventure-v1', JSON.stringify({ version: 1, money: 975, progress: { hunt: 3, tony: 3, bailiff: 3 }, character: 'billy', activeMission: 'hunt', toolboxTaken: true })));
  await page.reload({ waitUntil: 'networkidle', timeout: 90000 });
  await page.locator('.start-button').waitFor();
  assert.equal(await page.locator('.wallet strong').innerText(), '975');
  assert.equal(await page.locator('.character-info strong').innerText(), 'Billy');
  await page.keyboard.press('i');
  assert.equal(await page.getByRole('button', { name: 'Avklarat', exact: true }).count(), 3);
  assert.ok((await page.locator('.mission-tile.tracked').innerText()).includes('Kött till kvällsmaten'));
  console.log('✓ Existing version-1 saves migrate without losing completed missions');
  assert.deepEqual(errors, []);
  console.log('\nAll Sörbäcken update tests passed.');
} catch (error) {
  await page.screenshot({ path: 'screenshots/shop-test-failure.png', fullPage: true }).catch(() => {});
  console.error('State at failure:', await page.evaluate(() => ({ location: document.querySelector('.location-hud')?.textContent, prompt: document.querySelector('.interact-prompt')?.textContent, objective: document.querySelector('.objective-next')?.textContent, waypoint: document.querySelector('.waypoint-hud')?.textContent, saved: localStorage.getItem('lillasen-adventure-v1') })).catch(() => null));
  throw error;
} finally {
  await browser.close();
}
