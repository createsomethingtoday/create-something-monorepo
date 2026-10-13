import { chromium } from '../../../node_modules/.pnpm/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
const [origin, out] = process.argv.slice(2);
assert(origin);
if (out) mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const metrics = [];
try {
  for (const width of [1440, 768, 390, 320]) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      reducedMotion: 'no-preference'
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript(() => {
      window.__motionPerf = { shifts: 0, longTasks: [] };
      new PerformanceObserver((l) => {
        for (const e of l.getEntries())
          if (!e.hadRecentInput) window.__motionPerf.shifts += e.value;
      }).observe({ type: 'layout-shift', buffered: true });
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) window.__motionPerf.longTasks.push(e.duration);
      }).observe({ type: 'longtask', buffered: true });
    });
    await page.goto(origin, { waitUntil: 'networkidle' });
    const scene = page.locator('[data-material-study]').first();
    await scene.scrollIntoViewIfNeeded();
    await page.waitForFunction(
      () => document.querySelector('[data-material-study]').dataset.active === 'true'
    );
    const body = scene.locator('.contour-body');
    const before = await body.evaluate((e) => getComputedStyle(e).transform);
    await page.waitForTimeout(180);
    assert.notEqual(
      await body.evaluate((e) => getComputedStyle(e).transform),
      before,
      'material actually moves'
    );
    await page.getByRole('button', { name: 'Pause motion', exact: true }).click();
    await page.waitForFunction(() =>
      document
        .querySelector('.contour-body')
        .getAnimations()
        .every((a) => a.playState === 'paused')
    );
    await page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    );
    const paused = await body.evaluate((e) => getComputedStyle(e).transform);
    await page.waitForTimeout(150);
    assert.equal(
      await body.evaluate((e) => getComputedStyle(e).transform),
      paused,
      'pause freezes material'
    );
    assert.equal(await page.locator('.redesign').getAttribute('data-motion'), 'off');
    await page.getByRole('button', { name: 'Resume motion', exact: true }).focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('.redesign').getAttribute('data-motion'), 'on');
    await page.locator('#chemistry').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => {
      const v = document.querySelector('video');
      return v && !v.paused;
    });
    await page.getByRole('button', { name: 'Pause motion', exact: true }).click();
    assert.equal(await page.locator('video').evaluate((v) => v.paused), true);
    await page.getByRole('button', { name: 'Resume motion', exact: true }).click();
    await page.locator('footer').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('video').paused);
    // Real client-side navigation through visible links catches stale preference and observer cleanup.
    for (const path of ['/technology', '/careers', '/mining', '/technology', '/mining']) {
      await page.locator(`footer a[href="${path}"]`).click();
      await page.waitForURL(origin + path);
      assert.equal(await page.locator('.motion-control').count(), 1);
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
        false,
        path + ' overflow'
      );
      assert.equal(await page.locator('h1').count(), 1);
    }
    const choice = page.getByRole('button', { name: 'Platinum', exact: true });
    await choice.focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelector('figure img').alt === 'Platinum');
    assert.equal(await choice.getAttribute('aria-pressed'), 'true');
    await page.getByRole('button', { name: 'Next mineral' }).click();
    assert.equal(await page.locator('figure img').getAttribute('alt'), 'Iridium');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => document.querySelector('.redesign').dataset.motion === 'off');
    assert.equal(
      await page.getByRole('button', { name: 'Reduced motion', exact: true }).isDisabled(),
      true
    );
    assert.equal(await page.locator('[data-active="true"]').count(), 0);
    assert.equal(
      await page.evaluate(
        () => document.getAnimations().filter((a) => a.playState === 'running').length
      ),
      0,
      'no running animations in reduced motion'
    );
    await page.locator('footer a[href="/technology"]').click();
    await page.waitForURL(origin + '/technology');
    assert.equal(
      await page.locator('video').count(),
      0,
      'no video loaded for new reduced-motion route'
    );
    assert.equal(
      await page.evaluate(
        () => document.getAnimations().filter((a) => a.playState === 'running').length
      ),
      0
    );
    const industryButton = page.locator('.sequence-controls button').nth(1);
    await industryButton.focus();
    await page.keyboard.press('Enter');
    assert.equal(await industryButton.getAttribute('aria-pressed'), 'true');
    assert.match(await page.locator('.industry-sequence img').getAttribute('src'), /miningHero/);
    assert.equal(
      await page.evaluate(
        () => document.getAnimations().filter((a) => a.playState === 'running').length
      ),
      0
    );
    assert.deepEqual(errors, []);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.getByRole('button', { name: 'Pause motion', exact: true }).click();
    await page.reload({ waitUntil: 'networkidle' });
    assert.equal(
      await page.locator('.redesign').getAttribute('data-motion'),
      'off',
      'pause persists on reload'
    );
    await page.getByRole('button', { name: 'Resume motion', exact: true }).click();
    await industryButton.click();
    await page.getByRole('button', { name: 'Pause motion', exact: true }).click();
    assert.equal(
      await page
        .locator('.industry-sequence img')
        .evaluate((e) => e.getAnimations().filter((a) => a.playState === 'running').length),
      0,
      'pause settles image transition'
    );
    await page.evaluate(() => scrollTo(0, 0));
    const perf = await page.evaluate(() => window.__motionPerf);
    metrics.push({ width, ...perf });
    if (out) await page.screenshot({ path: `${out}/${width}-technology.png`, fullPage: true });
    console.log(
      'PASS active motion, pause/resume keyboard, offscreen video, repeated navigation, mineral selection, dynamic reduced motion at ' +
        width
    );
    await context.close();
  }
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 }
  });
  const page = await context.newPage();
  await page.goto(origin + '/technology');
  assert.equal(await page.locator('h1').isVisible(), true);
  assert.equal(
    await page.getByText('We manufacture our own chemistry.', { exact: true }).isVisible(),
    true
  );
  assert.equal(await page.locator('video').count(), 0);
  console.log('PASS no-JavaScript content and static material fallback');
  await context.close();
  if (out) writeFileSync(out + '/performance.json', JSON.stringify(metrics, null, 2));
  console.log(JSON.stringify(metrics));
} finally {
  await browser.close();
}
