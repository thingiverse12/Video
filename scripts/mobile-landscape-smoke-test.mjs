import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {}),
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const errors = [];
const url = process.env.TEST_URL || 'http://localhost:5173';
// This function is serialized into the page; keep it self-contained.
const layout = () => {
  const bounds = selector => document.querySelector(selector)?.getBoundingClientRect().toJSON();
  return {
    viewport: { width: innerWidth, height: innerHeight },
    scroll: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
    stage: bounds('.game-stage'), pad: bounds('.d-pad'), actions: bounds('.touch-actions'),
    character: bounds('.character-card'), resources: bounds('.resources-hud'),
    touchShown: getComputedStyle(document.querySelector('.touch-controls')).display !== 'none',
    mobile: document.querySelector('.game-stage').dataset.inputMode,
  };
};
const fits = (box, stage, message) => {
  assert.ok(box.left >= stage.left - 1 && box.top >= stage.top - 1 &&
    box.right <= stage.right + 1 && box.bottom <= stage.bottom + 1, message);
};

try {
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
  const page = await phone.newPage();
  page.setDefaultTimeout(60000);
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.locator('.start-button').waitFor();
  assert.equal(await page.locator('.game-stage').getAttribute('data-input-mode'), 'touch');
  assert.equal(await page.locator('.game-stage').getAttribute('data-render-quality'), 'lagom');
  await page.locator('.start-button').tap();
  await page.locator('.d-pad').waitFor({ state: 'visible' });
  assert.equal((await page.evaluate(layout)).touchShown, true, 'Phone shows touch controls without asking');
  assert.equal(await page.locator('.touch-toggle').count(), 0, 'Automatic mode does not show a misleading toggle');
  console.log('✓ Portrait phone is detected automatically and can start the game');

  for (const viewport of [{ width: 844, height: 390 }, { width: 568, height: 320 }]) {
    await page.setViewportSize(viewport);
    const view = await page.evaluate(layout);
    assert.equal(view.mobile, 'touch');
    assert.equal(view.touchShown, true);
    assert.ok(view.scroll.width <= view.viewport.width + 1, 'No sideways page scrolling');
    assert.ok(view.scroll.height <= view.viewport.height + 1, 'No vertical page scrolling');
    fits(view.stage, { left: 0, top: 0, right: view.viewport.width, bottom: view.viewport.height }, 'Stage remains on screen');
    fits(view.pad, view.stage, 'Movement pad remains inside stage');
    fits(view.actions, view.stage, 'Action buttons remain inside stage');
    fits(view.character, view.stage, 'Brother switching stays available');
    assert.ok(view.resources.bottom <= view.character.top + 1, 'Health and character panels do not overlap');
    if (process.env.SCREENSHOTS) {
      await mkdir('screenshots', { recursive: true });
      await page.screenshot({ path: `screenshots/mobile-landscape-${viewport.width}.png` });
    }
  }
  await page.getByRole('button', { name: 'Världskarta' }).tap();
  await page.getByRole('dialog').waitFor();
  await page.getByRole('button', { name: 'Stäng', exact: true }).tap();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  assert.equal((await page.evaluate(layout)).touchShown, true, 'Controls remain after opening the map');
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal((await page.evaluate(layout)).touchShown, true, 'Rotating back preserves mobile controls');
  await phone.close();
  console.log('✓ Landscape at 844×390 and 568×320 fits the screen; menus and rotation work');

  const desktop = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: false, isMobile: false });
  const desktopPage = await desktop.newPage();
  await desktopPage.goto(url, { waitUntil: 'domcontentloaded' });
  await desktopPage.locator('.start-button').waitFor();
  assert.equal(await desktopPage.locator('.game-stage').getAttribute('data-input-mode'), 'keyboard');
  // The short desktop viewport keeps its original desktop layout; trigger
  // start without testing that unrelated layout's overlapping intro cards.
  await desktopPage.locator('.start-button').evaluate(button => button.click());
  assert.equal((await desktopPage.evaluate(layout)).touchShown, false, 'Narrow desktop window must not be mistaken for a mobile phone');
  await desktop.close();
  assert.deepEqual(errors, []);
  console.log('✓ Desktop at the same landscape size keeps keyboard/mouse controls');
  console.log('\nMobile landscape smoke tests passed.');
} finally {
  await browser.close();
}
