import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const base = process.env.AGENCY_BASE_URL ?? 'http://127.0.0.1:4186';
const evidence = process.env.AGENCY_EVIDENCE_DIR ?? '/tmp/agency-scene-reveal';
await mkdir(evidence, { recursive: true });
const browser = await chromium.launch({ headless: true });
const errors = [];
const results = [];
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
page.on('pageerror', error => errors.push(error.message));
const select = step => page.locator(`[data-home-step="${step}"]`).click();
const settled = async step => {
  const file = { learn: 'team.webp', build: 'macro.webp', run: 'run-reviewed-v1.webp' }[step];
  await page.waitForFunction(file => {
    const image = document.querySelector('#journey-image');
    return image?.getAttribute('src')?.endsWith(file) && image.complete && image.naturalWidth > 0 && !document.querySelector('[data-scene-previous]');
  }, file);
  assert.equal(await page.locator('[data-home-step][aria-pressed="true"]').count(), 1);
  assert.equal(await page.locator(`[data-home-step="${step}"]`).getAttribute('aria-pressed'), 'true');
};

try {
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.locator('#journey-image').scrollIntoViewIfNeeded();
  await settled('learn');

  // A request deliberately held behind a later selection must never win.
  let release;
  const held = new Promise(resolve => { release = resolve; });
  await page.route('**/images/agency-sales/macro.webp', async route => { await held; await route.continue(); });
  await select('build');
  assert.match(await page.locator('#journey-image').getAttribute('src'), /team\.webp$/);
  assert.equal(await page.locator('[data-home-step="build"]').getAttribute('aria-pressed'), 'true');
  assert.match(await page.locator('#journey-status').innerText(), /load/i);
  await select('run');
  await settled('run');
  release();
  await page.waitForResponse(response => response.url().endsWith('/macro.webp'));
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await settled('run');
  await page.unroute('**/images/agency-sales/macro.webp');
  results.push('Delayed stale image cannot override the latest scene; prior image stays visible while loading.');

  // Pause the actual authored animation to inspect both direction and geometry.
  for (const [step, expected] of [['learn', 'inset(0px 0px 0px 100%)'], ['build', 'inset(0px 100% 0px 0px)']]) {
    const capture = page.evaluate(() => new Promise((resolve, reject) => {
      const deadline = performance.now() + 5000;
      const inspect = () => {
        const image = document.querySelector('#journey-image');
        const animation = image?.getAnimations()[0];
        if (!animation) {
          if (performance.now() > deadline) { reject(new Error('Expected scene wipe did not start within 5 seconds')); return; }
          requestAnimationFrame(inspect);
          return;
        }
        animation.pause();
        animation.currentTime = 150;
        window.__sceneTestAnimation = animation;
        resolve({ frames: animation.effect.getKeyframes(), timing: animation.effect.getTiming(), transform: getComputedStyle(image).transform, opacity: getComputedStyle(image).opacity });
      };
      requestAnimationFrame(inspect);
    }));
    await select(step);
    const animation = await capture;
    assert.equal(animation.frames[0].clipPath, expected);
    assert.equal(animation.timing.duration, 300);
    assert.equal(animation.transform, 'none');
    assert.equal(animation.opacity, '1');
    const layers = await page.evaluate(() => {
      const rect = element => { const r = element.getBoundingClientRect(); return { x:r.x, y:r.y, width:r.width, height:r.height }; };
      return { image: rect(document.querySelector('#journey-image')), previous: rect(document.querySelector('[data-scene-previous]')) };
    });
    assert.deepEqual(layers.image, layers.previous, 'Both images must use the same stationary frame');
    await page.screenshot({ path: `${evidence}/wipe-${step}-midpoint.png` });
    await page.evaluate(() => { window.__sceneTestAnimation.finish(); delete window.__sceneTestAnimation; });
    await settled(step);
    results.push({ step, animation, layers });
  }

  // Direction follows the image on screen, even if a different step is loading.
  await select('learn');
  await settled('learn');
  let releaseRun;
  const heldRun = new Promise(resolve => { releaseRun = resolve; });
  await page.route('**/images/agency-sales/run-reviewed-v1.webp', async route => { await heldRun; await route.continue(); });
  await select('run');
  assert.match(await page.locator('#journey-image').getAttribute('src'), /team\.webp$/);
  await select('build');
  await page.waitForFunction(() => document.querySelector('#journey-image')?.getAnimations().length > 0);
  assert.equal(await page.locator('.scene').getAttribute('data-scene-revealing'), 'forward', 'Build must uncover forward over Learn, regardless of the pending Run selection');
  await settled('build');
  const runResponse = page.waitForResponse(response => response.url().endsWith('/run-reviewed-v1.webp'));
  releaseRun();
  await runResponse;
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await settled('build');
  await page.unroute('**/images/agency-sales/run-reviewed-v1.webp');
  results.push('Learn to Build wipes forward when a pending Run load is superseded, and the stale Run does not replace it.');

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('[data-home-step="run"]').focus();
  await page.keyboard.press('Enter');
  await settled('run');
  assert.equal(await page.locator('#journey-image').evaluate(image => image.getAnimations().length), 0);
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-home-step')), 'run');
  results.push('Reduced motion switches directly and keyboard selection retains focus.');

  // An image failure must preserve a complete frame and an actionable retry.
  await page.route('**/images/agency-sales/macro.webp', route => route.abort());
  await select('build');
  await page.waitForFunction(() => /could not|couldn.t|unable|failed/i.test(document.querySelector('#journey-status')?.textContent ?? ''));
  await settled('run');
  assert.match(await page.locator('#journey-caption').innerText(), /Run/);
  await page.unroute('**/images/agency-sales/macro.webp');
  await select('build');
  await settled('build');
  results.push('Failed image retains the displayed scene and selection; retry succeeds.');

  for (const width of [320, 390, 768, 1024, 1025, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.locator('#journey-image').scrollIntoViewIfNeeded();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `No overflow at ${width}`);
    await page.screenshot({ path: `${evidence}/scene-${width}.png` });
  }
  results.push('Responsive scene and captions checked at 320, 390, 768, 1024, 1025, 1440.');

  const noJs = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const fallback = await noJs.newPage();
  await fallback.goto(base, { waitUntil: 'networkidle' });
  await fallback.locator('#journey-image').scrollIntoViewIfNeeded();
  await fallback.waitForFunction(() => document.querySelector('#journey-image')?.naturalWidth > 0);
  assert.equal(await fallback.locator('#journey-image').count(), 1);
  assert.match(await fallback.locator('#journey-image').getAttribute('src'), /team\.webp/);
  assert.equal(await fallback.locator('[data-home-step]:disabled').count(), 3);
  await noJs.close();
  results.push('No-JavaScript retains the initial image and disables enhancement-only selection.');
  assert.deepEqual(errors, []);
  await writeFile(`${evidence}/results.json`, JSON.stringify({ base, passed: true, results, errors }, null, 2));
  console.log(JSON.stringify({ passed: true, evidence, checks: results.length }));
} finally {
  await browser.close();
}
