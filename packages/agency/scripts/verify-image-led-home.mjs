import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const base = process.env.AGENCY_BASE_URL ?? 'http://127.0.0.1:4186';
const evidence = process.env.AGENCY_EVIDENCE_DIR ?? '/tmp/agency-image-led-home';
await mkdir(evidence, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}) });
const results = [];
const errors = [];
try {
  for (const reducedMotion of ['no-preference', 'reduce']) {
    const context = await browser.newContext({ reducedMotion });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base, { waitUntil: 'networkidle' });
    for (const width of [320, 390, 768, 1024, 1025, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(250);
      assert.match(await page.locator('#hero-title').innerText(), /Your tools should\s+work together/);
      assert.equal(await page.locator('.agency-home > .hero + .signal-band').count(), 1, 'One workflow strip directly follows the hero');
      assert.equal(await page.locator('.signal-band canvas').evaluate(node => node.getBoundingClientRect().height), width <= 640 ? 108 : 145, 'Strip keeps its established responsive height');
      assert.equal(await page.locator('.shared-visual img').count(), 1, 'One uninterrupted conceptual image');
      assert.match(await page.locator('.shared-visual img').getAttribute('src'), /one-manual-gap/);
      assert.equal(await page.locator('.shared-visual svg, [data-scene-previous]').count(), 0, 'No targeting overlay or competing image layer');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `No overflow at ${width}/${reducedMotion}`);
      const frames = [];
      for (const fraction of [0, .25, .5, .75, 1]) {
        await page.locator('.handoff-result').evaluate((node, fraction) => window.scrollTo({ top: scrollY + node.getBoundingClientRect().top - innerHeight * .82 + fraction * Math.min(300, innerHeight * .4), behavior: 'instant' }), fraction);
        await page.waitForTimeout(80);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Intermediate frame stays in bounds at ${width}/${fraction}`);
        frames.push(await page.evaluate(() => ({ x: new DOMMatrix(getComputedStyle(document.querySelector('.request-note')).transform).m41, received: Number(getComputedStyle(document.querySelector('.arrival')).opacity) })));
      }
      if (reducedMotion === 'no-preference') {
        assert.ok(frames[0].x < frames.at(-1).x, `Request moves toward the team at ${width}: ${JSON.stringify(frames)}`);
        for (let i = 1; i < frames.length; i++) assert.ok(frames[i].x >= frames[i - 1].x - .5, 'Request moves monotonically');
        for (const frame of frames) if (frame.x < -.5) assert.equal(frame.received, 0, 'Receipt waits for request arrival');
      }
      assert.equal(await page.locator('.arrival').evaluate(node => getComputedStyle(node).opacity), '1', 'Completed handoff has a receipt');
      await page.locator('.handoff-result').scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${evidence}/handoff-${width}-${reducedMotion}.png` });
      results.push({ width, reducedMotion });
    }
    await page.locator('[data-home-open="work-dialog"]').click();
    assert.equal(await page.locator('#work-dialog').evaluate(dialog => dialog.open), true);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#work-dialog').evaluate(dialog => dialog.open), false);
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-home-open')), 'work-dialog');
    await page.goto(`${base}/?film=websites#work`, { waitUntil: 'networkidle' });
    await page.locator('#work-library[open]').waitFor();
    assert.ok(await page.locator('#work').count(), 'Film deep links remain valid');
    await context.close();
  }
  // Regression: child mount runs before layout motion initialization.
  for (const preference of [null, 'false', 'true']) {
    const context = await browser.newContext({ reducedMotion: 'no-preference' });
    await context.addInitScript(preference => {
      if (preference !== null) sessionStorage.setItem('agency-reduced-motion', preference);
      window.__introCount = 0;
      new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => {
        if (node instanceof Element && node.matches('.story-curtain')) window.__introCount++;
      }))).observe(document, { childList: true, subtree: true });
    }, preference);
    const page = await context.newPage();
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1800);
    assert.equal(await page.evaluate(() => window.__introCount), preference === 'true' ? 0 : 1, 'Initial loader respects effective preference');
    assert.equal(await page.locator('.story-curtain').count(), 0, 'Loader fails open within its deadline');
    await page.getByRole('link', { name: 'See the connection' }).click();
    await page.waitForTimeout(500);
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'example', 'Native hash moves keyboard focus');
    await context.close();
  }
  const staticPage = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  await staticPage.goto(base, { waitUntil: 'domcontentloaded' });
  assert.equal(await staticPage.locator('.arrival').evaluate(node => getComputedStyle(node).opacity), '1', 'Static story resolves');
  await staticPage.locator('.support > summary').click();
  assert.equal(await staticPage.locator('.support').evaluate(node => node.open), true, 'Native support details work without JavaScript');
  assert.equal(await staticPage.locator('.story-curtain').count(), 0, 'No-JS loader never covers content');
  assert.deepEqual(errors, [], 'No application JavaScript errors');
  await writeFile(`${evidence}/results.json`, JSON.stringify({ base, results, errors, noJavaScript: true, passed: true }, null, 2));
  console.log(JSON.stringify({ passed: true, cases: results.length, evidence }));
} finally { await browser.close(); }
