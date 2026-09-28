import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { lowQuality } from './game-test-helpers.mjs';

const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {}),
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
const page = await context.newPage();
page.setDefaultTimeout(45000);
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const cdp = await context.newCDPSession(page);
const fingers = new Map();
const send = (type, points) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points });
const down = async (id, point) => { fingers.set(id, { id, ...point, radiusX: 7, radiusY: 7, force: 1 }); await send('touchStart', [...fingers.values()]); };
const move = async (id, point) => { Object.assign(fingers.get(id), point); await send('touchMove', [...fingers.values()]); };
const up = async id => {
  // CDP accepts a named point to lift that finger without lifting the others.
  const point = fingers.get(id); if (!point) return;
  await send('touchEnd', [point]); fingers.delete(id);
};
const cancel = async () => { await send('touchCancel', []); fingers.clear(); };
const centre = async selector => {
  const b = await page.locator(selector).boundingBox();
  assert.ok(b, `${selector} is visible`);
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
};
const read = () => page.locator('.game-stage').evaluate(el => ({
  x: +el.dataset.playerX, z: +el.dataset.playerZ, yaw: +el.dataset.cameraYaw,
  heading: +el.dataset.playerHeading, speed: +el.dataset.walkSpeed,
}));
const stopped = () => page.waitForFunction(() => +document.querySelector('.game-stage').dataset.walkSpeed < .01);
const speedIs = speed => page.waitForFunction(speed => Math.abs(+document.querySelector('.game-stage').dataset.walkSpeed - speed) < .1, speed);
const moved = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const angle = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

try {
  await page.goto(process.env.TEST_URL || 'http://localhost:5173', { waitUntil: 'networkidle' });
  await page.locator('.start-button').waitFor();
  await lowQuality(page);
  const units = await page.evaluate(async () => {
    const { GameInput, padDirection, directionKeys } = await import('/src/game/input.ts');
    const input = new GameInput();
    input.add('KeyW'); input.setPointer(2, ['KeyW']); input.setPointer(3, ['KeyW', 'ShiftLeft']);
    input.releasePointer(2); input.delete('KeyW');
    const owned = input.has('KeyW') && input.has('ShiftLeft');
    input.releasePointer(3);
    const released = !input.has('KeyW') && !input.has('ShiftLeft');
    input.add('KeyA'); input.setPointer(8, ['KeyD']); input.clearPointers();
    const separate = input.has('KeyA') && !input.has('KeyD'); input.clear();
    const neutral = directionKeys(padDirection(2, -2, 144)).length === 0;
    const diagonal = directionKeys(padDirection(60, -60, 144)).join(',') === 'KeyD,KeyW';
    const { createCharacter, animateCharacter } = await import('/src/game/characters.ts');
    const model = createCharacter('nils');
    let maxStep = 0, maxBob = 0, previous = 0, time = 133.7;
    for (let frame = 0; frame < 360; frame++) {
      time += 1 / 60;
      animateCharacter(model, time, frame % 24 < 12 ? 4.35 : 7.9, 0, 0, 1 / 60);
      maxStep = Math.max(maxStep, Math.abs(model.legs[0].rotation.x - previous));
      maxBob = Math.max(maxBob, Math.abs(model.body.position.y));
      previous = model.legs[0].rotation.x;
    }
    const phase = model.gait.phase;
    animateCharacter(model, time, 7.9, 0, 0, 0);
    const frozen = model.gait.phase === phase;
    for (let frame = 0; frame < 120; frame++) animateCharacter(model, time += 1 / 60, 0, 0, 0, 1 / 60);
    let bodyMotion = 0, headMotion = 0, limbMotion = 0;
    for (const brother of [model, createCharacter('ebbe')]) {
      for (const speed of [0, 4.35, 7.9, 0]) {
        for (let frame = 0; frame < 180; frame++) {
          time += 1 / 60;
          animateCharacter(brother, time, speed, frame % 30 / 30, frame % 45 / 45, 1 / 60);
          bodyMotion = Math.max(bodyMotion, Math.abs(brother.body.position.y), ...brother.body.rotation.toArray().slice(0, 3).map(Math.abs));
          headMotion = Math.max(headMotion, ...brother.head.rotation.toArray().slice(0, 3).map(Math.abs));
          limbMotion = Math.max(limbMotion, Math.abs(brother.legs[0].rotation.x), Math.abs(brother.arms[1].rotation.x));
        }
      }
    }
    const { positionFollowCamera } = await import('/src/game/camera.ts');
    const anchor = model.root.position.clone().set(0, 0, 0);
    const position = anchor.clone();
    const desiredOffset = anchor.clone().set(5, 8, 10);
    const offset = desiredOffset.clone();
    const goal = anchor.clone();
    let cameraDrift = 0;
    for (let frame = 0; frame < 360; frame++) {
      // Start, move, stop and reverse with a damped follow target. The camera
      // must keep its offset/angle instead of independently chasing the target.
      if (frame < 120) goal.z -= 4.35 / 60;
      if (frame >= 240) goal.x += 7.9 / 60;
      anchor.lerp(goal, 1 - Math.exp(-5 / 60));
      positionFollowCamera(position, anchor, offset, desiredOffset, 1 / 60);
      cameraDrift = Math.max(cameraDrift, position.clone().sub(anchor).distanceTo(desiredOffset));
    }
    return { owned, released, separate, neutral, diagonal, cleared: !input.has('KeyA'), maxStep, maxBob, frozen, idle: Math.abs(model.legs[0].rotation.x), bodyMotion, headMotion, limbMotion, cameraDrift };
  });
  for (const property of ['owned', 'released', 'separate', 'neutral', 'diagonal', 'cleared', 'frozen']) assert.equal(units[property], true, property);
  assert.ok(units.maxStep < .13, 'Changing walk/run never jumps the stride phase');
  assert.equal(units.maxBob, 0, 'No walking bob at all');
  assert.equal(units.bodyMotion, 0, 'Neither character rocks while idle, walking, sprinting or reacting to damage');
  assert.equal(units.headMotion, 0, 'No automatic head nod or sway');
  assert.ok(units.limbMotion > .5, 'Leg gait and punching are still animated');
  assert.ok(units.cameraDrift < 1e-10, 'Follow camera never rocks relative to its look-at point');
  assert.ok(units.idle < .0001, 'Stopped character settles to idle');
  console.log('✓ Pointer ownership, dead zone and continuous walk/run animation unit checks', units);

  await page.getByRole('button', { name: 'Nu kör vi', exact: true }).tap();
  await page.locator('.d-pad').waitFor({ state: 'visible' });
  const padBox = await page.locator('.d-pad').boundingBox();
  assert.ok(padBox.width >= 140);
  const start = await read();
  await down(1, await centre('.pad-down'));
  await speedIs(4.35);
  let previous = await read();
  for (let i = 0; i < 6; i++) {
    await page.waitForTimeout(220);
    const now = await read();
    const along = (now.x - previous.x) * Math.sin(start.yaw) + (now.z - previous.z) * Math.cos(start.yaw);
    assert.ok(along >= -.03, 'Held direction never reverses or rocks back');
    assert.ok(Math.abs(angle(now.yaw, start.yaw)) < .002, 'Pad does not turn the camera');
    previous = now;
  }
  assert.ok(moved(start, previous) > .4);
  await up(1); await stopped();
  const settled = await read(); await page.waitForTimeout(650);
  assert.ok(moved(settled, await read()) < .025, 'Lifting finger stops movement');
  console.log('✓ A real touch hold moves steadily; release stops immediately');

  await down(1, await centre('.pad-down'));
  await move(1, await centre('.d-pad')); await stopped();
  assert.equal(await page.locator('.d-pad button[aria-pressed="true"]').count(), 0);
  await move(1, { x: padBox.x + padBox.width - 18, y: padBox.y + 18 });
  await page.waitForFunction(() => document.querySelector('.pad-up')?.getAttribute('aria-pressed') === 'true');
  assert.equal(await page.locator('.pad-up').getAttribute('aria-pressed'), 'true');
  assert.equal(await page.locator('.pad-right').getAttribute('aria-pressed'), 'true');
  await move(1, { x: 190, y: 440 });
  await up(1); await stopped();
  assert.ok(Math.abs(angle((await read()).yaw, start.yaw)) < .002, 'Dragging out of pad cannot drag the camera');
  console.log('✓ Sliding through the pad, diagonals, dead zone and release outside work');

  await down(1, await centre('.pad-down')); await speedIs(4.35);
  await down(2, await centre('.touch-sprint')); await speedIs(7.9);
  await down(3, await centre('.pad-up'));
  assert.equal(await page.locator('.pad-down').getAttribute('aria-pressed'), 'true', 'Another finger cannot steal pad ownership');
  assert.equal(await page.locator('.pad-up').getAttribute('aria-pressed'), 'false');
  await up(2); await speedIs(4.35);
  await up(3); await speedIs(4.35);
  await up(1); await stopped();
  assert.equal(await page.locator('.touch-sprint').getAttribute('aria-pressed'), 'false');
  console.log('✓ Multitouch walking/sprinting and independent finger releases stay stable');

  const free = await page.evaluate(() => {
    const canvas = document.querySelector('.world-canvas');
    const points = [];
    for (let y = 380; y < 510; y += 24) for (let x = 184; x < 330; x += 60) {
      if (document.elementFromPoint(x, y) === canvas) points.push({ x, y });
    }
    return points;
  });
  assert.ok(free.length >= 2, 'Two unobscured places to drag the camera');
  const first = free[0], second = free.find(p => Math.abs(p.x - first.x) > 40) || free.at(-1);
  const beforeCamera = (await read()).yaw;
  await down(10, first); await down(11, second);
  await move(11, { x: second.x + 24, y: second.y + 14 });
  await page.waitForTimeout(450);
  assert.ok(Math.abs(angle((await read()).yaw, beforeCamera)) < .002, 'Second camera touch is ignored');
  await move(10, { x: first.x + 20, y: first.y });
  await page.waitForFunction(expected => Math.abs(+document.querySelector('.game-stage').dataset.cameraYaw - expected) < .002, beforeCamera - .12);
  await up(11);
  await move(10, { x: first.x + 30, y: first.y });
  await page.waitForFunction(expected => Math.abs(+document.querySelector('.game-stage').dataset.cameraYaw - expected) < .002, beforeCamera - .18);
  await up(10);
  console.log('✓ Camera listens to one finger only; other touches cannot jump or end its drag');

  await down(1, await centre('.pad-down')); await speedIs(4.35);
  await cancel(); await stopped();
  await down(1, await centre('.pad-down')); await speedIs(4.35);
  await page.keyboard.press('Escape'); await page.getByRole('dialog').waitFor();
  await page.keyboard.press('Escape'); await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await stopped(); const paused = await read();
  await move(1, await centre('.pad-right'));
  await page.waitForTimeout(600);
  assert.ok(moved(paused, await read()) < .025, 'Closing a menu cannot resume a cancelled touch');
  await cancel();
  await down(1, await centre('.pad-down')); await speedIs(4.35);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await stopped(); await cancel();
  await down(1, await centre('.pad-down')); await speedIs(4.35);
  await page.setViewportSize({ width: 360, height: 800 }); await stopped(); await cancel();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  console.log('✓ Cancel, pause, focus loss and screen resize clear held touch input');

  // Reset through the UI to approach the parked car with a known starting heading.
  await page.getByRole('button', { name: 'Inställningar', exact: true }).tap();
  await page.getByRole('button', { name: 'Börja om', exact: true }).tap();
  await page.getByRole('button', { name: 'Ja, börja om', exact: true }).tap();
  await page.getByRole('button', { name: 'Nu kör vi', exact: true }).tap();
  const atHome = await read();
  await down(1, await centre('.pad-up')); await speedIs(4.35);
  await page.waitForFunction(start => {
    const el = document.querySelector('.game-stage');
    return Math.hypot(+el.dataset.playerX - start.x, +el.dataset.playerZ - start.z) > 1.5 && +el.dataset.walkSpeed < .01;
  }, atHome);
  await page.waitForTimeout(700);
  assert.equal((await read()).speed, 0, 'Walking animation stops against an obstacle even with a finger held');
  await up(1);
  await page.locator('.touch-actions > button').nth(1).tap();
  await page.locator('.speedometer').waitFor();
  await down(1, await centre('.pad-up'));
  await page.waitForFunction(() => +document.querySelector('.speedometer strong')?.textContent >= 6);
  await down(2, await centre('.touch-sprint'));
  await up(1);
  await page.waitForFunction(() => document.querySelector('.speedometer strong')?.textContent === '0');
  await up(2);
  await page.locator('.touch-actions > button').nth(1).tap();
  await page.locator('.speedometer').waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: 'Byt till Ebbe', exact: true }).tap();
  await page.getByRole('button', { name: 'Byt till Nils', exact: true }).waitFor();
  console.log('✓ Blocked walking settles; sedan acceleration/braking, E and character switching still work');

  if (process.env.SCREENSHOTS) {
    await mkdir('screenshots', { recursive: true });
    await page.screenshot({ path: 'screenshots/v061-touch-controls.png' });
  }
  assert.deepEqual(errors, []);
  console.log('\nAll touch smoke tests passed.');
} finally {
  await cancel().catch(() => undefined);
  await browser.close();
}
