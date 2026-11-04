import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const base = process.env.AGENCY_BASE_URL ?? 'http://127.0.0.1:4196';
const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}) });
const errors = [];
const results = [];
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'no-preference' });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      window.__wordmarkSamples = [];
      new MutationObserver(() => {
        if (!document.querySelector('[data-agency-wordmark]') || window.__wordmarkSampling) return;
        window.__wordmarkSampling = true;
        const sample = () => {
          const flight = document.querySelector('[data-agency-wordmark]');
          if (!flight) return;
          const { x, y, width } = flight.getBoundingClientRect();
          const pieces = [...flight.querySelectorAll('[data-wordmark-piece]')];
          const glyphs = [...flight.querySelectorAll('[data-wordmark-glyph]')];
          window.__wordmarkSamples.push({ x, y, width, glyphs: glyphs.length,
            rises: pieces.map(piece => Number(piece.transform.baseVal.consolidate()?.matrix.f ?? 0)),
            progress: pieces.map(piece => Number(piece.transform.baseVal.consolidate()?.matrix.f ?? 0) / Number(piece.dataset.wordmarkRise)) });
          requestAnimationFrame(sample);
        };
        sample();
      }).observe(document, { childList: true, subtree: true });
    });
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__wordmarkSampling);
    assert.equal(await page.locator('.wordmark-intro > div').first().evaluate(node => getComputedStyle(node).backgroundColor), 'rgb(8, 8, 8)', 'Intro uses the top navigation surface');
    assert.equal(await page.locator('[data-agency-wordmark] > svg').first().evaluate(node => getComputedStyle(node).filter), await page.locator('.nav-logo-asset').evaluate(node => getComputedStyle(node).filter), 'Wordmark uses the actual nav logo color treatment');
    await page.waitForTimeout(1750);
    const samples = await page.evaluate(() => window.__wordmarkSamples);
    const logo = await page.locator('.nav-logo-asset').boundingBox();
    assert.ok(samples.length > 4, 'Observe actual intermediate logo frames');
    assert.equal(samples[0].glyphs, width > 640 ? 15 : 0, 'Desktop animates the fifteen original outlined letters; compact layout uses the original ring shapes');
    assert.ok(samples.some(sample => sample.progress.some((progress, index) => index && Math.abs(progress - sample.progress[0]) > .04)), 'Original shapes reveal at distinct staggered positions');
    assert.ok(samples.at(-1).rises.every(rise => Math.abs(rise) < .01), 'All original shapes settle completely before docking finishes');
    assert.ok(samples[0].width > samples.at(-1).width * 2, 'Large responsive logo docks down');
    assert.ok(Math.abs(samples.at(-1).x - logo.x) < 2, 'Dock aligns with real header x');
    assert.ok(Math.abs(samples.at(-1).y - logo.y) < 2, 'Dock aligns with real header y');
    assert.ok(Math.abs(samples.at(-1).width - logo.width) < 2, 'Dock reaches real responsive logo size');
    assert.equal(await page.locator('.story-curtain').count(), 0, 'Cover is removed by the deadline');
    assert.equal(await page.locator('.nav-logo-asset-frame').evaluate(node => getComputedStyle(node).opacity), '1', 'Header logo restored');
    results.push({ width, frames: samples.length, start: samples[0], dock: samples.at(-1) });
    await context.close();
  }
  for (const mode of ['reduce', 'stored', 'key', 'hidden-event', 'resize', 'hash', 'svg-failure']) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: mode === 'reduce' ? 'reduce' : 'no-preference' });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    if (mode === 'svg-failure') await page.addInitScript(() => {
      SVGGraphicsElement.prototype.getBBox = () => { throw new Error('SVG geometry unavailable fixture'); };
    });
    if (mode === 'stored') await page.addInitScript(() => sessionStorage.setItem('agency-reduced-motion', 'true'));
    await page.goto(`${base}${mode === 'hash' ? '/#example' : ''}`, { waitUntil: 'domcontentloaded' });
    if (['reduce', 'stored', 'hash', 'svg-failure'].includes(mode)) {
      await page.waitForFunction(() => document.querySelector('.story-tools button'));
      assert.equal(await page.locator('.story-curtain').count(), 0, `${mode} skips intro`);
    } else {
      await page.waitForSelector('[data-agency-wordmark]');
      if (mode === 'key') await page.keyboard.press('Escape');
      if (mode === 'resize') await page.setViewportSize({ width: 900, height: 800 });
      // Visibility cancellation fixture: dispatch the event with hidden=true.
      if (mode === 'hidden-event') await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', { configurable: true, value: true });
        document.dispatchEvent(new Event('visibilitychange'));
      });
      assert.equal(await page.locator('.story-curtain').count(), 0, `${mode} cancels intro`);
    }
    assert.equal(await page.locator('.nav-logo-asset-frame').evaluate(node => getComputedStyle(node).opacity), '1', `${mode} leaves logo visible`);
    results.push({ mode, passed: true });
    await context.close();
  }
  const routingContext = await browser.newContext({ reducedMotion: 'no-preference' });
  const routingPage = await routingContext.newPage();
  routingPage.on('pageerror', error => errors.push(error.message));
  await routingPage.goto(`${base}/services`, { waitUntil: 'networkidle' });
  await routingPage.evaluate(() => {
    window.__clientIntros = 0;
    window.__clientGrids = 0;
    new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => {
      if (node instanceof Element && node.matches('.story-curtain')) window.__clientIntros++;
      if (node instanceof Element && node.matches('[data-agency-grid-cover]')) window.__clientGrids++;
    }))).observe(document, { childList: true, subtree: true });
  });
  await routingPage.locator('.nav-logo').click();
  await routingPage.waitForURL(`${base}/`);
  await routingPage.waitForSelector('.hero-copy');
  await routingPage.waitForTimeout(300);
  assert.equal(await routingPage.evaluate(() => window.__clientIntros), 0, 'First client arrival from services does not replay cold-load intro');
  assert.equal(await routingPage.evaluate(() => window.__clientGrids), 1, 'Client home arrival uses one grid transition');
  results.push({ mode: 'first-client-home', passed: true });
  await routingContext.close();
  assert.deepEqual(errors, [], 'No application JavaScript errors');
  console.log(JSON.stringify({ passed: true, base, results }));
} finally { await browser.close(); }
