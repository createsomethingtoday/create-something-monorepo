import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const base = process.env.AGENCY_BASE_URL ?? 'http://127.0.0.1:4188';
const evidence = process.env.AGENCY_EVIDENCE_DIR ?? '/tmp/agency-membership-story';
await mkdir(evidence, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}) });
const results = [];
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 774 } });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${base}/services`, { waitUntil: 'networkidle' });
  const diagram = page.locator('.plan-diagram');
  assert.equal(await diagram.evaluate(node => getComputedStyle(node).position), 'sticky', 'The visual must stay beside the story in a normal 774px laptop window');
  if (process.argv.includes('--sticky-only')) {
    console.log(JSON.stringify({ passed: true, shortDesktopSticky: true }));
  } else {
    for (const [width, height] of [[1440, 1000], [1440, 774], [1024, 700]]) {
      await page.setViewportSize({ width, height });
      for (const chapter of [0, 1, 2, 1, 0]) {
        await page.evaluate(index => {
          const target = document.querySelector(`.plan-journey [data-chapter="${index}"]`);
          window.scrollTo({ top: scrollY + target.getBoundingClientRect().top - innerHeight * .3, behavior: 'instant' });
        }, chapter);
        await page.waitForFunction(index => document.querySelector('.desktop-story-visual .membership-workpiece')?.getAttribute('data-stage') === String(index), chapter);
        assert.equal(await page.locator('.story-navigation button[aria-current="step"]').count(), 1);
        if (chapter > 0) assert.ok(Math.abs(await diagram.evaluate(node => node.getBoundingClientRect().top) - 128) < 2, 'Work and handoff remain visible beside the current chapter');
      }
      await page.evaluate(() => { const target = document.querySelector('.plan-journey [data-chapter="1"]'); window.scrollTo({ top: scrollY + target.getBoundingClientRect().top - innerHeight * .3, behavior: 'instant' }); });
      await page.waitForFunction(() => document.querySelector('.desktop-story-visual .membership-workpiece')?.getAttribute('data-stage') === '1');
      const before = await diagram.evaluate(node => node.getBoundingClientRect().top);
      await page.evaluate(() => window.scrollBy({ top: 100, behavior: 'instant' }));
      const after = await diagram.evaluate(node => node.getBoundingClientRect().top);
      assert.ok(Math.abs(before - after) < 2 && after >= 100, `Sticky visual holds at ${width}x${height}`);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.screenshot({ path: `${evidence}/work-${width}-${height}.png` });
      await page.locator('.story-navigation button').last().focus();
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => document.activeElement?.id === 'membership-handoff');
      await page.waitForFunction(() => document.querySelector('.desktop-story-visual .membership-workpiece')?.getAttribute('data-stage') === '2');
      assert.ok(Math.abs(await diagram.evaluate(node => node.getBoundingClientRect().top) - 128) < 2, 'Keyboard selection keeps the handoff visual below the header');
      await page.evaluate(() => { const layout = document.querySelector('.plan-journey .journey-layout'); window.scrollTo({ top: scrollY + layout.getBoundingClientRect().bottom - 100, behavior: 'instant' }); });
      const release = await diagram.evaluate(node => ({ bottom: node.getBoundingClientRect().bottom, containerBottom: node.parentElement.getBoundingClientRect().bottom }));
      assert.ok(release.bottom <= release.containerBottom + 1, 'Sticky visual releases with its section');
      results.push({ width, height, stickyTop: after, release });
    }
    for (const [width, height] of [[728, 1000], [390, 844], [320, 800], [1440, 520]]) {
      await page.setViewportSize({ width, height });
      assert.equal(await page.locator('.inline-story-visual:visible').count(), 3, 'Small screens pair every visual state with its chapter');
      assert.equal(await page.locator('.desktop-story-visual:visible').count(), 0);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.locator('.plan-journey').scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${evidence}/paired-${width}-${height}.png`, fullPage: true });
      results.push({ width, height, pairedStates: 3 });
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await page.locator('.inline-story-visual:visible').count(), 3, 'Reduced motion retains all three complete states');
    const staticPage = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
    await staticPage.goto(`${base}/services`, { waitUntil: 'load' });
    assert.equal(await staticPage.locator('.inline-story-visual:visible').count(), 3, 'No-JS keeps the complete visual story');
    assert.match(await staticPage.locator('.membership-agreement-details').textContent(), /human approval boundary/);
    await staticPage.close();
    assert.deepEqual(errors, []);
    await writeFile(`${evidence}/results.json`, JSON.stringify({ passed: true, base, results, errors, reducedMotion: true, noJavaScript: true }, null, 2));
    console.log(JSON.stringify({ passed: true, results, evidence }));
  }
} finally { await browser.close(); }
