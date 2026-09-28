import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { approachRifle, enterHome, leaveHome, lowQuality, shootElk, travelTo, waitText, walkTo } from './game-test-helpers.mjs';

const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {}),
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const errors = [];
const observe = page => {
  page.setDefaultTimeout(60000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
};
const screenshot = async (page, name) => {
  if (!process.env.SCREENSHOTS) return;
  await mkdir('screenshots', { recursive: true });
  await page.screenshot({ path: `screenshots/v08-${name}.png`, animations: 'disabled' });
};
const settleCamera = (page, distance = 15.8) => page.waitForFunction(distance => Math.abs(+document.querySelector('.game-stage').dataset.cameraDistance - distance) < .045, distance, { timeout: 90000 });

try {
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } }); observe(desktop);
  await desktop.goto(process.env.TEST_URL || 'http://localhost:5173', { waitUntil: 'networkidle', timeout: 90000 });
  await desktop.locator('.start-button').waitFor();
  assert.equal(await desktop.locator('.game-stage').getAttribute('data-render-quality'), 'finfin');
  await screenshot(desktop, 'intro-finfin');
  await lowQuality(desktop); await desktop.locator('.start-button').click(); await settleCamera(desktop);
  await screenshot(desktop, 'yard-final');

  const art = await desktop.evaluate(async () => {
    const { contactShadow, firCanopy, surfaceTexture, meadowGrass } = await import('/src/game/look.ts');
    const { createCharacter, animateCharacter } = await import('/src/game/characters.ts');
    const { createCar } = await import('/src/game/vehicles.ts');
    const { createElk } = await import('/src/game/models.ts');
    const shadow = contactShadow(2, 2); const hits = []; shadow.raycast({}, hits);
    const crown = firCanopy(2.2, 4.5), grass = meadowGrass();
    const normal = crown.getAttribute('normal'), position = crown.getAttribute('position');
    let outward = 0;
    for (let i = 0; i < normal.count; i++) if (normal.getX(i) * position.getX(i) + normal.getZ(i) * position.getZ(i) > 0) outward++;
    const ebbe = createCharacter('ebbe');
    let purpleBack = false;
    ebbe.body.traverse(object => {
      if (!object.isMesh || !object.material.map) return;
      const canvas = object.material.map.image;
      if (!canvas?.getContext) return;
      const pixel = canvas.getContext('2d').getImageData(64, 64, 1, 1).data;
      if (pixel[2] < pixel[0] * 1.12 || pixel[2] < pixel[1] * 1.3) return;
      const p = object.geometry.getAttribute('position');
      for (let i = 0; i < p.count; i++) if (p.getZ(i) < -.28 && p.getY(i) > 1.0 && p.getY(i) < 1.7) purpleBack = true;
    });
    let sway = 0;
    for (let i = 0; i < 180; i++) {
      animateCharacter(ebbe, i / 60, i % 3 ? 7.9 : 0, 0, 0, 1 / 60);
      sway = Math.max(sway, Math.abs(ebbe.body.position.y), ...ebbe.body.rotation.toArray().slice(0, 3).map(Math.abs), ...ebbe.head.rotation.toArray().slice(0, 3).map(Math.abs));
    }
    const car = createCar(); let glossyBlue = false;
    car.root.traverse(object => { const m = object.material; if (m?.isMeshPhysicalMaterial && m.clearcoat > .8 && m.color.b > m.color.r) glossyBlue = true; });
    const elk = createElk();
    return {
      shadowNonInteractive: hits.length === 0, shadowAboveRoad: shadow.position.y > .044,
      shadowTransparent: shadow.material.transparent && !shadow.material.depthWrite,
      crownVertices: position.count, outward: outward / normal.count,
      finiteNormals: [...normal.array].every(Number.isFinite), grassVertices: grass.getAttribute('position').count,
      grassTexture: surfaceTexture('grass').image.width, repeat: surfaceTexture('grass').repeat.x,
      purpleBack, sway, glossyBlue, carName: car.root.name,
      elkHasShadow: elk.root.children.some(c => c.name.startsWith('Contact shadow')),
    };
  });
  assert.equal(art.shadowNonInteractive, true); assert.equal(art.shadowAboveRoad, true); assert.equal(art.shadowTransparent, true);
  assert.ok(art.crownVertices >= 60 && art.outward > .95 && art.finiteNormals);
  assert.ok(art.grassVertices >= 20 && art.grassTexture === 256 && art.repeat > 1);
  assert.equal(art.purpleBack, true, 'Ebbe wears a purple hoodie on his back too');
  assert.equal(art.sway, 0, 'The visual update never restores body/head rocking');
  assert.equal(art.glossyBlue, true); assert.ok(art.carName.includes('sedan')); assert.equal(art.elkHasShadow, true);
  console.log('✓ Textures, detailed tree/grass geometry, harmless contact shadows, purple hoodie, blue unbadged sedan and zero rocking', art);

  await travelTo(desktop, 'Myrsjön');
  await waitText(desktop, '.location-hud strong', 'Myrsjön');
  const rect = await desktop.locator('.world-canvas').boundingBox();
  await desktop.mouse.move(rect.x + rect.width * .5, rect.y + rect.height * .55);
  await desktop.mouse.down(); await desktop.mouse.move(rect.x + rect.width * .5 + (0.61 + .9) / .006, rect.y + rect.height * .55, { steps: 8 }); await desktop.mouse.up();
  await desktop.waitForFunction(() => Math.abs(+document.querySelector('.game-stage').dataset.cameraYaw + .9) < .01);
  await settleCamera(desktop); await screenshot(desktop, 'lake-final');
  await desktop.getByRole('button', { name: 'Inställningar', exact: true }).click();
  await desktop.getByRole('button', { name: 'Finfin', exact: true }).click();
  assert.equal(await desktop.locator('.game-stage').getAttribute('data-render-quality'), 'finfin');
  await desktop.getByRole('button', { name: 'Så där ja', exact: true }).click();
  await screenshot(desktop, 'lake-finfin');
  await desktop.close();
  console.log('✓ Both render presets work; the lake has the correct location label');

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 }); observe(mobile);
  await mobile.goto(process.env.TEST_URL || 'http://localhost:5173', { waitUntil: 'networkidle', timeout: 90000 });
  await mobile.locator('.start-button').waitFor();
  assert.equal(await mobile.locator('.game-stage').getAttribute('data-render-quality'), 'lagom', 'Touch devices start in the balanced preset');
  await screenshot(mobile, 'mobile-intro');
  await mobile.locator('.start-button').tap(); await settleCamera(mobile);
  assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  const buttons = await mobile.locator('.d-pad button').evaluateAll(elements => elements.map(e => ({ w: e.getBoundingClientRect().width, h: e.getBoundingClientRect().height })));
  assert.ok(buttons.every(b => b.w >= 44 && b.h >= 44), 'Touch direction targets remain large');
  await screenshot(mobile, 'mobile-play');
  await mobile.getByRole('button', { name: 'Inställningar', exact: true }).tap();
  await mobile.getByRole('dialog').waitFor(); await screenshot(mobile, 'settings-final');
  await mobile.getByRole('button', { name: 'Så där ja', exact: true }).tap();

  await enterHome(mobile); await walkTo(mobile, -9.4, -5.8);
  await walkTo(mobile, -8.1, -7.75);
  await waitText(mobile, '.interact-prompt', 'Öppna kylskåpet');
  await mobile.locator('.touch-actions button').filter({ hasText: /^E/ }).tap();
  await mobile.waitForFunction(() => document.querySelector('.game-stage').dataset.fridgeOpen === 'true');
  await screenshot(mobile, 'home-fridge');
  await mobile.locator('.touch-actions button').filter({ hasText: /^E/ }).tap();
  await walkTo(mobile, -9.4, -6.6); await approachRifle(mobile);
  await mobile.locator('.touch-actions button').filter({ hasText: /^E/ }).tap();
  await waitText(mobile, '.equipment-status', 'Gevär med');
  await leaveHome(mobile); await travelTo(mobile, 'Jaktmarken');
  await shootElk(mobile, true);
  assert.equal(await mobile.locator('.wallet strong').innerText(), '440');
  await screenshot(mobile, 'hunting-final');
  assert.deepEqual(errors, []);
  await mobile.close();
  console.log('✓ Mobile layout, controls, house/fridge/rifle pickup and a real aimed shot still work; no shader/browser errors');
  console.log('\nAll graphics smoke tests passed.');
} finally { await browser.close(); }
