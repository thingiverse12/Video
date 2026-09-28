import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { walkTo } from './game-test-helpers.mjs';

const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {}),
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 850 } });
page.setDefaultTimeout(45000);
const errors = [];
page.on('pageerror', error => errors.push(error.message));
// Observe real Web Audio nodes without replacing synthesis or touching game state.
await page.addInitScript(() => {
  window.audioProbe = { contexts: [], sources: [] };
  const Original = window.AudioContext;
  window.AudioContext = class extends Original {
    constructor(...args) {
      super(...args);
      window.audioProbe.contexts.push(this);
      const makeSource = this.createBufferSource.bind(this);
      this.createBufferSource = () => {
        const source = makeSource();
        const connect = source.connect.bind(source);
        const start = source.start.bind(source);
        let output;
        source.connect = (...args) => { output = args[0]; return connect(...args); };
        source.start = (...args) => {
          if (source.buffer?.duration > 60) {
            const analyser = this.createAnalyser(); analyser.fftSize = 2048;
            output.connect(analyser);
            window.audioProbe.sources.push({ source, output, analyser, context: this });
          }
          return start(...args);
        };
        return source;
      };
    }
  };
});

const musicGain = () => page.evaluate(() => window.audioProbe.sources[0].output.gain.value);
const gainNear = (target, tolerance = .015) => page.waitForFunction(
  ({ target, tolerance }) => Math.abs(window.audioProbe.sources[0].output.gain.value - target) < tolerance,
  { target, tolerance },
);

try {
  await page.goto(process.env.TEST_URL || 'http://localhost:5173', { waitUntil: 'networkidle' });
  await page.locator('.start-button').waitFor();
  assert.equal(await page.evaluate(() => window.audioProbe.contexts.length), 0, 'No autoplay or audio context before consent');
  await page.getByRole('button', { name: 'Slå på musik', exact: true }).click();
  await page.waitForFunction(() => window.audioProbe.sources.length === 1);
  assert.equal(await page.evaluate(() => window.audioProbe.contexts[0].state), 'running');
  assert.equal(await page.evaluate(() => window.audioProbe.sources[0].source.loop), true);
  await gainNear(.3);
  await page.waitForFunction(() => {
    const analyser = window.audioProbe.sources[0].analyser;
    const samples = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(samples);
    return samples.some(sample => Math.abs(sample) > .001);
  });
  assert.equal(await page.getByRole('button', { name: 'Slå på spelljud', exact: true }).count(), 1, 'Music works independently of effects');
  console.log('✓ One audible, looping music source starts only after clicking the music button');

  const rendered = await page.evaluate(async () => {
    const { renderMusicLoop, MUSIC, SCORE } = await import('/src/game/music.ts');
    const buffer = await renderMusicLoop();
    let peak = 0, sum = 0, seam = 0;
    for (let c = 0; c < buffer.numberOfChannels; c++) {
      const data = buffer.getChannelData(c);
      for (const sample of data) { peak = Math.max(peak, Math.abs(sample)); sum += sample * sample; }
      seam = Math.max(seam, Math.abs(data[0] - data[data.length - 1]));
    }
    return { duration: buffer.duration, expected: MUSIC.duration, bars: SCORE.length, correctMeter: SCORE.every(bar => Math.abs(bar.melody.reduce((sum, note) => sum + note[1], 0) - 3) < .00001), peak, rms: Math.sqrt(sum / (buffer.length * buffer.numberOfChannels)), seam };
  });
  assert.equal(rendered.bars, 32);
  assert.equal(rendered.correctMeter, true);
  assert.ok(Math.abs(rendered.duration - rendered.expected) < .001);
  assert.ok(rendered.peak < .95 && rendered.peak > .05, 'Audible, non-clipping mix');
  assert.ok(rendered.rms > .015 && rendered.rms < .3);
  assert.ok(rendered.seam < .01, 'No abrupt loop-boundary discontinuity');
  console.log('✓ Original 32-bar score renders with valid meter, safe levels and a seamless boundary', rendered);

  await page.getByRole('button', { name: 'Inställningar', exact: true }).click();
  await page.getByRole('button', { name: 'Lagom', exact: true }).click();
  const toggle = page.getByRole('switch', { name: 'Bakgrundsmusik', exact: true });
  assert.equal(await toggle.getAttribute('aria-checked'), 'true');
  const volume = page.getByRole('slider', { name: 'Musikvolym', exact: true });
  await volume.press('End'); await gainNear(1);
  assert.equal(await volume.inputValue(), '100');
  await volume.press('Home'); await gainNear(0);
  assert.equal(await volume.inputValue(), '0');
  await volume.press('End'); await gainNear(1);
  const effects = page.getByRole('switch', { name: 'Spelljud', exact: true });
  await effects.click();
  await page.getByRole('slider', { name: 'Ljudvolym', exact: true }).press('Home');
  assert.ok(await musicGain() > .98, 'Effects volume does not change music');
  await effects.click();
  for (let i = 0; i < 3; i++) { await toggle.click(); await toggle.click(); }
  assert.equal(await page.evaluate(() => window.audioProbe.sources.length), 1, 'Rapid toggles never stack loops');
  await toggle.click(); await gainNear(0);
  await toggle.click(); await gainNear(1);
  if (process.env.SCREENSHOTS) {
    await mkdir('screenshots', { recursive: true });
    await page.screenshot({ path: 'screenshots/v06-music-settings.png' });
  }
  console.log('✓ Independent music/effects controls, keyboard volume, fade-out and rapid toggles work');
  await page.getByRole('button', { name: 'Så där ja', exact: true }).click();

  await page.getByRole('button', { name: 'Nu kör vi', exact: true }).click();
  await walkTo(page, 8.5, 10, .61, .4);
  await page.keyboard.press('e');
  await page.locator('.dialogue-content').waitFor();
  await gainNear(.22);
  await page.keyboard.press('Escape');
  await gainNear(1);
  console.log('✓ Music ducks during a character dialogue and returns smoothly afterward');

  // Simulate visibility events; verify the real context actually suspends/resumes.
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.waitForFunction(() => window.audioProbe.contexts[0].state === 'suspended');
  await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
  await page.waitForFunction(() => window.audioProbe.contexts[0].state === 'running');
  const disposed = await page.evaluate(async () => {
    const { BackgroundMusic, renderMusicLoop } = await import('/src/game/music.ts');
    const ctx = new AudioContext();
    const before = window.audioProbe.sources.length;
    const music = new BackgroundMusic(ctx, () => { throw new Error('Unexpected music failure'); });
    music.setEnabled(true); music.dispose();
    await renderMusicLoop(); await Promise.resolve();
    await ctx.close();
    return window.audioProbe.sources.length === before;
  });
  assert.equal(disposed, true, 'Disposal during preparation cannot start a stray loop');
  console.log('✓ Tab visibility pauses the audio clock; disposal cancels pending playback');

  await page.setViewportSize({ width: 360, height: 800 });
  await page.getByRole('button', { name: 'Stäng av musik', exact: true }).click();
  await gainNear(0);
  await page.getByRole('button', { name: 'Slå på musik', exact: true }).click();
  await gainNear(1);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'No mobile horizontal overflow');
  await page.getByRole('button', { name: 'Inställningar', exact: true }).click();
  assert.equal(await toggle.getAttribute('aria-checked'), 'true');
  await volume.press('Home'); await gainNear(0);
  if (process.env.SCREENSHOTS) await page.screenshot({ path: 'screenshots/v06-music-mobile.png' });
  await page.getByRole('button', { name: 'Börja om', exact: true }).click();
  await page.getByRole('button', { name: 'Ja, börja om', exact: true }).click();
  assert.equal(await page.locator('.game-stage').getAttribute('data-music'), 'true', 'Progress reset preserves audio choices');
  assert.equal(await page.evaluate(() => window.audioProbe.sources.length), 1);
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('.start-button').waitFor();
  assert.equal(await page.evaluate(() => window.audioProbe.contexts.length), 0, 'A new visit waits for audio consent again');
  assert.equal(await page.getByRole('button', { name: 'Slå på musik', exact: true }).count(), 1);
  assert.deepEqual(errors, []);
  console.log('✓ Mobile controls, reset, consent after reload and runtime-error checks passed');
  console.log('\nAll music smoke tests passed.');
} finally { await browser.close(); }
