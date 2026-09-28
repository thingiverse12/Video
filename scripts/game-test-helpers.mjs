import assert from 'node:assert/strict';

export const waitText = (page, selector, text, timeout = 60000) => page.waitForFunction(
  ({ selector, text }) => document.querySelector(selector)?.textContent?.includes(text),
  { selector, text }, { timeout },
);
export const readPosition = page => page.locator('.game-stage').evaluate(el => ({
  x: Number(el.dataset.playerX), z: Number(el.dataset.playerZ),
}));
export const travelTo = async (page, name) => {
  await page.keyboard.press('m');
  await page.getByRole('button', { name: `Välj ${name}`, exact: true }).click();
  await page.getByRole('button', { name: 'Snabbresa hit', exact: true }).click();
};

/** Actual WASD input, steered using the same read-only coordinates as the map.
 * No test-only engine setters, inventory mutations or teleport shortcuts. */
export async function walkTo(page, x, z, yaw = 0, tolerance = 0.65) {
  const held = new Set();
  const deadline = Date.now() + 120000;
  try {
    while (Date.now() < deadline) {
      const p = await readPosition(page);
      const dx = x - p.x, dz = z - p.z;
      if (Math.hypot(dx, dz) <= tolerance) return;
      const forward = -Math.sin(yaw) * dx - Math.cos(yaw) * dz;
      const horizontal = Math.cos(yaw) * dx - Math.sin(yaw) * dz;
      const keys = new Set();
      if (Math.abs(forward) > Math.abs(horizontal) * 0.414) keys.add(forward > 0 ? 'w' : 's');
      if (Math.abs(horizontal) > Math.abs(forward) * 0.414) keys.add(horizontal > 0 ? 'd' : 'a');
      for (const key of held) if (!keys.has(key)) { await page.keyboard.up(key); held.delete(key); }
      for (const key of keys) if (!held.has(key)) { await page.keyboard.down(key); held.add(key); }
      await page.waitForTimeout(180);
    }
    assert.fail(`Could not walk to (${x}, ${z}); at ${JSON.stringify(await readPosition(page))}`);
  } finally {
    for (const key of held) await page.keyboard.up(key);
  }
}

export async function enterHome(page, yaw = 0.61) {
  // Go around, rather than through, the parked kombi.
  await walkTo(page, 5.7, 1.4, yaw);
  await walkTo(page, -6.95, 2.0, yaw, 1.35);
  await waitText(page, '.interact-prompt', 'Gå in i huset');
  await page.keyboard.press('e');
  await waitText(page, '.location-hud strong', 'Inne i vännernas stuga');
}
export async function approachRifle(page) {
  await walkTo(page, -12.65, -7.7);
  await waitText(page, '.interact-prompt', 'Ta jaktgeväret');
}
export async function leaveHome(page) {
  await walkTo(page, -8.1, -4.3);
  await waitText(page, '.interact-prompt', 'Gå ut ur huset');
  await page.keyboard.press('e');
  await page.waitForFunction(() => document.querySelector('.game-stage')?.getAttribute('data-inside-home') === 'false');
}
export async function lowQuality(page) {
  await page.getByRole('button', { name: 'Inställningar', exact: true }).click();
  await page.getByRole('button', { name: 'Lagom', exact: true }).click();
  await page.getByRole('button', { name: 'Så där ja', exact: true }).click();
}

/** Aim at the rendered torso projection with normal pointer input, then fire.
 * The coordinates are read-only view data, not a target/kill setter. */
export async function aimAtElk(page, touch = false) {
  await page.waitForFunction(() => JSON.parse(document.querySelector('.game-stage').dataset.huntTargets).some(e => e.visible));
  const canvas = await page.locator('.world-canvas').boundingBox();
  const target = await page.locator('.game-stage').evaluate(el => JSON.parse(el.dataset.huntTargets).find(e => e.visible));
  const point = { x: canvas.x + target.x, y: canvas.y + target.y };
  if (touch) await page.touchscreen.tap(point.x, point.y);
  else await page.mouse.move(point.x, point.y);
  return point;
}

export async function shootElk(page, touch = false) {
  // Arrival in a car can leave the camera looking away from the clearing.
  // Look north with the ordinary camera drag rather than rotating/aiming the game internally.
  const visible = await page.locator('.game-stage').evaluate(el => JSON.parse(el.dataset.huntTargets).some(e => e.visible));
  if (!visible) {
    if (await page.locator('.game-stage').getAttribute('data-aiming') === 'true') await page.keyboard.press('q');
    const yaw = Number(await page.locator('.game-stage').getAttribute('data-camera-yaw'));
    let drag = Math.atan2(Math.sin(yaw), Math.cos(yaw)) / .006;
    const rect = await page.locator('.world-canvas').boundingBox();
    while (Math.abs(drag) > .05) {
      const step = Math.sign(drag) * Math.min(Math.abs(drag), rect.width * .25);
      const x = rect.x + rect.width / 2, y = rect.y + rect.height * .44;
      await page.mouse.move(x, y); await page.mouse.down();
      await page.mouse.move(x + step, y, { steps: 5 }); await page.mouse.up();
      drag -= step;
    }
  }
  if (await page.locator('.game-stage').getAttribute('data-aiming') !== 'true') {
    if (touch) await page.getByRole('button', { name: 'Sikta med geväret', exact: true }).tap();
    else await page.keyboard.press('q');
  }
  // Let the existing travel/zoom camera transition settle, then use what is drawn.
  await page.waitForTimeout(700);
  const before = Number(await page.locator('.game-stage').getAttribute('data-shots-hit'));
  for (let attempt = 0; attempt < 3; attempt++) {
    let point = await aimAtElk(page, touch); // The sight must be placed before firing unlocks.
    await page.waitForFunction(() => !document.querySelector('.shoot-button')?.disabled);
    point = await aimAtElk(page, touch);
    if (process.env.SCREENSHOTS && attempt === 0) {
      const { mkdir } = await import('node:fs/promises');
      await mkdir('screenshots', { recursive: true });
      await page.screenshot({ path: `screenshots/v07-rifle-aim-${touch ? 'touch' : 'mouse'}.png` });
      point = await aimAtElk(page, touch);
    }
    if (touch) await page.getByRole('button', { name: 'Skjut', exact: true }).tap();
    else await page.mouse.click(point.x, point.y);
    try {
      await page.waitForFunction(before => +document.querySelector('.game-stage').dataset.shotsHit > before, before, { timeout: 12000 });
      return;
    } catch (error) { if (attempt === 2) throw error; }
  }
}
