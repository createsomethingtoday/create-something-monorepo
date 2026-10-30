import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { gigiLandingHtml } from '../src/lib/server/gigi-landing-page.ts';
import { gigiBeta } from '../src/lib/data/gigiBeta.ts';

const liveUrl = process.argv.find(arg => arg.startsWith('--url='))?.slice(6);
const evidence = process.env.GIGI_LANDING_EVIDENCE || '/tmp/gigi-landing-evidence';
mkdirSync(evidence, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ javaScriptEnabled: false, reducedMotion: 'reduce' });
const page = await context.newPage();
const failures = [];
page.on('pageerror', error => failures.push(error.message));
const results = [];
try {
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    if (liveUrl) {
      const response = await page.goto(liveUrl, { waitUntil: 'networkidle' });
      assert.equal(response.status(), 200);
      assert.match(response.headers()['content-security-policy'], /default-src 'none'/);
      assert.equal(response.headers()['cache-control'], 'no-store');
    } else await page.setContent(gigiLandingHtml, { waitUntil: 'load' });
    assert.equal(await page.locator('h1').count(), 1);
    assert.match(await page.locator('h1').innerText(), /Your gigs\. Your people\./);
    const geometry = await page.evaluate(() => ({ viewport: innerWidth, scroll: document.documentElement.scrollWidth }));
    assert.ok(geometry.scroll <= geometry.viewport, `Horizontal overflow at ${width}: ${JSON.stringify(geometry)}`);
    const hero = page.locator('.hero .button');
    assert.equal(await hero.getAttribute('href'), gigiBeta.url);
    assert.ok((await hero.boundingBox()).height >= 44);
    for (const summary of await page.locator('.faq summary').all()) {
      await summary.focus();
      await page.keyboard.press('Enter');
      assert.equal(await summary.evaluate(el => el.parentElement.open), true);
      assert.ok(await summary.locator('..').locator('p').isVisible());
      await page.keyboard.press('Enter');
      assert.equal(await summary.evaluate(el => el.parentElement.open), false);
    }
    const skip = page.locator('.skip');
    await skip.focus();
    assert.ok(await skip.isVisible());
    await page.keyboard.press('Enter');
    assert.ok(await page.locator('#main').isVisible());
    await page.locator('body').click({ position: { x: 1, y: 1 } });
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: `${evidence}/${width}.png`, fullPage: true });
    results.push({ width, overflow: false, faq: 'keyboard passed', download: 'current immutable release', javascript: 'disabled' });
  }
  assert.deepEqual(failures, []);
  writeFileSync(`${evidence}/receipt.json`, JSON.stringify({ surface: liveUrl || 'offline generated HTML', results, consoleErrors: failures }, null, 2));
  console.log(JSON.stringify({ evidence, surface: liveUrl || 'offline generated HTML', results }, null, 2));
} finally { await browser.close(); }
