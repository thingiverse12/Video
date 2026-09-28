import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { aimAtElk, approachRifle, enterHome, leaveHome, lowQuality, shootElk, travelTo, waitText } from './game-test-helpers.mjs';

const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {}),
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, hasTouch: true });
page.setDefaultTimeout(60000);
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const stage = page.locator('.game-stage');
const snapshot = () => stage.evaluate(el => ({ aiming: el.dataset.aiming === 'true', fired: +el.dataset.shotsFired, hit: +el.dataset.shotsHit, projectiles: JSON.parse(el.dataset.projectiles), feedback: el.dataset.shotFeedback }));
const screenshot = async name => {
  if (!process.env.SCREENSHOTS) return;
  await mkdir('screenshots', { recursive: true });
  await page.screenshot({ path: `screenshots/v07-${name}.png` });
};

try {
  await page.goto(process.env.TEST_URL || 'http://localhost:5173', { waitUntil: 'networkidle', timeout: 90000 });
  await page.locator('.start-button').waitFor();
  await lowQuality(page);

  // Real mesh intersections and independent projectile simulation, not game state mutation.
  const physics = await page.evaluate(async () => {
    const { createElk } = await import('/src/game/models.ts');
    const { HuntingProjectiles, segmentBoxHit, SHOT_SPEED } = await import('/src/game/hunting.ts');
    const model = createElk();
    const vector = (...xyz) => model.root.position.clone().set(...xyz);
    model.root.children[0].geometry.computeBoundingBox();
    const box = model.root.children[0].geometry.boundingBox.clone().set(vector(-1, 0, -4.1), vector(1, 3, -3.9));
    const start = vector(0, 1.82, 0), direction = vector(0, 0, -1);
    const swept = segmentBoxHit(start, vector(0, 1.82, -20), box);
    const missBox = segmentBoxHit(start, vector(8, 1.82, -4), box);
    const inside = segmentBoxHit(vector(0, 1, -4), vector(0, 1, -8), box);
    const results = {};
    const run = (name, colliders = [], people = [], moveAfterLaunch = false) => {
      model.root.position.set(0, 0, -10);
      const elk = { model, origin: model.root.position.clone(), alive: true, respawnAt: 0, phase: 1 };
      const impacts = [];
      const system = new HuntingProjectiles({ colliders, elk: [elk] }, () => people, () => [], hit => impacts.push(hit.kind));
      const sight = system.trace(start, direction, 56);
      const onlyAiming = elk.alive && impacts.length === 0;
      system.fire(start, direction);
      const atMuzzle = system.snapshot[0];
      system.update(0);
      const paused = JSON.stringify(system.snapshot[0]) === JSON.stringify(atMuzzle);
      system.update(.05);
      const flying = system.snapshot.length === 1 && impacts.length === 0;
      const travelled = Math.abs(system.snapshot[0]?.z ?? 0);
      if (moveAfterLaunch) model.root.position.x = 20;
      system.update(2);
      results[name] = { onlyAiming, sight: sight?.kind, paused, flying, travelled, impacts, left: system.snapshot.length };
      system.fire(start, direction); system.clear(); system.update(2);
      results[name].cleared = system.snapshot.length === 0;
      system.dispose();
    };
    run('hit');
    run('wall', [{ type: 'box', x: 0, z: -4, w: 2, d: .2 }]);
    run('tree', [{ type: 'circle', x: 0, z: -4, radius: .3 }]);
    run('wallBehind', [{ type: 'box', x: 0, z: -14, w: 2, d: .2 }]);
    const person = model.root.clone(false); person.position.set(0, 0, -4);
    run('person', [], [{ root: person }]);
    run('movedTarget', [], [], true);
    return { swept, missBox, inside, expectedStep: SHOT_SPEED * .05, results };
  });
  assert.ok(Math.abs(physics.swept - 3.9) < .001);
  assert.equal(physics.missBox, null); assert.equal(physics.inside, 0);
  for (const [name, result] of Object.entries(physics.results)) {
    assert.equal(result.onlyAiming, true, name);
    assert.equal(result.paused, true, name);
    assert.equal(result.flying, true, name);
    assert.ok(Math.abs(result.travelled - physics.expectedStep) < .001, name);
    assert.equal(result.cleared, true, name);
  }
  assert.deepEqual(physics.results.hit.impacts, ['elk']);
  assert.deepEqual(physics.results.wall.impacts, ['obstacle']);
  assert.deepEqual(physics.results.tree.impacts, ['obstacle']);
  assert.deepEqual(physics.results.wallBehind.impacts, ['elk']);
  assert.deepEqual(physics.results.person.impacts, ['person']);
  assert.deepEqual(physics.results.movedTarget.impacts, ['miss'], 'Shots never home onto a moving target');
  console.log('✓ Visible finite-speed projectiles, swept collisions, walls/trees, harmless NPC blocking, no homing and cleanup');

  await page.locator('.start-button').click();
  await page.keyboard.press('q');
  await waitText(page, '.toast-stack', 'Jaktgeväret saknas');
  assert.equal((await snapshot()).aiming, false);
  await page.keyboard.press('Space');
  assert.equal((await snapshot()).fired, 0);
  await enterHome(page);
  await approachRifle(page);
  await page.keyboard.press('e');
  await waitText(page, '.equipment-status', 'Gevär med');
  await page.keyboard.press('q');
  assert.equal((await snapshot()).aiming, false, 'No shooting through indoor floors');
  await leaveHome(page);
  await travelTo(page, 'Jaktmarken');
  await waitText(page, '.interact-prompt', 'Sikta med geväret');
  await page.keyboard.press('e');
  assert.equal((await snapshot()).aiming, true);
  assert.equal((await snapshot()).fired, 0, 'The old E interaction no longer hits an elk');
  assert.equal(await stage.getAttribute('data-aim-placed'), 'false');
  assert.equal(await page.getByRole('button', { name: 'Skjut', exact: true }).isDisabled(), true);
  await page.keyboard.press('f'); await page.keyboard.press('Space');
  assert.equal((await snapshot()).fired, 0, 'Raising the rifle alone never bypasses manual aiming');
  assert.equal((await snapshot()).aiming, true);
  assert.equal(await page.locator('.wallet strong').innerText(), '240');
  console.log('✓ Physical rifle pickup remains mandatory; E raises the sight without granting an automatic hit');

  await page.waitForTimeout(900);
  const canvas = await page.locator('.world-canvas').boundingBox();
  // Deliberately shoot beside the herd, not at a hidden target setter.
  await page.mouse.move(canvas.x + canvas.width * .86, canvas.y + canvas.height * .58);
  await page.keyboard.press('Space');
  await page.waitForFunction(() => +document.querySelector('.game-stage').dataset.shotsFired === 1);
  assert.equal((await snapshot()).hit, 0);
  await page.waitForFunction(() => JSON.parse(document.querySelector('.game-stage').dataset.projectiles).length === 0);
  assert.equal(await page.locator('.wallet strong').innerText(), '240');
  assert.equal((await snapshot()).hit, 0);
  console.log('✓ A deliberately mis-aimed shot misses and awards no money');

  await page.waitForFunction(() => !document.querySelector('.shoot-button')?.disabled);
  const target = await aimAtElk(page);
  const before = await snapshot();
  await page.mouse.click(target.x, target.y);
  await page.waitForFunction(fired => +document.querySelector('.game-stage').dataset.shotsFired > fired, before.fired);
  const launched = await snapshot();
  assert.ok(launched.projectiles.length > 0, 'A real projectile exists before impact');
  assert.equal(launched.hit, 0, 'Clicking does not immediately kill the elk');
  await page.keyboard.press('Escape');
  await page.getByRole('dialog').waitFor();
  const paused = await snapshot();
  await page.waitForTimeout(450);
  assert.deepEqual((await snapshot()).projectiles, paused.projectiles, 'Pause freezes the flying bullet');
  await page.keyboard.press('Escape');
  await screenshot('bullet-in-flight');
  await page.waitForFunction(() => +document.querySelector('.game-stage').dataset.shotsHit === 1);
  assert.equal(await page.locator('.wallet strong').innerText(), '440');
  await screenshot('aimed-hit');
  console.log('✓ The muzzle-launched bullet flies, pauses and only then hits; a real hit awards the hunt reward');

  await page.keyboard.press('q');
  await page.keyboard.press('v');
  await waitText(page, '.character-info strong', 'Ebbe');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Sikta med geväret', exact: true }).tap();
  await page.waitForTimeout(800);
  const beforeTouch = await snapshot();
  await aimAtElk(page, true);
  assert.equal((await snapshot()).fired, beforeTouch.fired, 'Touch places the reticle without accidental firing');
  const yaw = await stage.getAttribute('data-camera-yaw');
  const mobileCanvas = await page.locator('.world-canvas').boundingBox();
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 4, x: mobileCanvas.x + 150, y: mobileCanvas.y + 280 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ id: 4, x: mobileCanvas.x + 176, y: mobileCanvas.y + 255 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  assert.equal(await stage.getAttribute('data-camera-yaw'), yaw, 'Aim drag never rotates the camera');
  await screenshot('mobile-aim');
  await shootElk(page, true);
  assert.equal((await snapshot()).hit, 2);
  assert.equal(await page.locator('.wallet strong').innerText(), '490', 'No duplicate quest reward on the second hit');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  console.log('✓ Ebbe can aim with a finger and use Skjut on mobile without turning the camera');

  await page.getByRole('button', { name: 'Lägg ner geväret', exact: true }).tap();
  await travelTo(page, 'Hemma på gården');
  assert.equal((await snapshot()).aiming, false);
  assert.deepEqual((await snapshot()).projectiles, []);
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('.start-button').waitFor();
  assert.equal(await stage.getAttribute('data-has-rifle'), 'true');
  assert.equal(await page.locator('.wallet strong').innerText(), '490');
  assert.equal((await snapshot()).aiming, false);
  assert.equal((await snapshot()).fired, 0);
  assert.deepEqual(errors, []);
  console.log('✓ Travel clears shots; reload preserves the rifle/rewards but not transient aim or bullets');
  console.log('\nAll shooting smoke tests passed.');
} catch (error) {
  console.error('Shooting state:', await snapshot().catch(() => null));
  await mkdir('screenshots', { recursive: true });
  await page.screenshot({ path: 'screenshots/v07-test-failure.png' }).catch(() => undefined);
  throw error;
} finally { await browser.close(); }
