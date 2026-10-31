import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const base = process.env.AGENCY_BASE_URL ?? 'http://127.0.0.1:4192';
const evidence = process.env.AGENCY_EVIDENCE_DIR ?? '/tmp/agency-partner-evidence';
await mkdir(evidence, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base, { waitUntil: 'networkidle' });
  const panel = page.locator('[data-evidence-reveal]');
  const summary = panel.locator('summary');
  await summary.scrollIntoViewIfNeeded();
  await summary.focus();
  await page.keyboard.press('Enter');
  assert.equal(await panel.evaluate(el => el.open), true, 'Enter opens native disclosure');
  const animation = await panel.evaluate(el => el.getAnimations().map(a => ({ duration: a.effect.getTiming().duration, frames: a.effect.getKeyframes() })));
  assert.ok(animation.some(a => a.duration === 300 && a.frames[0].height !== a.frames[1].height), 'Reveal interpolates height');
  await panel.evaluate(el => Promise.all(el.getAnimations().map(a => a.finished)));
  await page.keyboard.press('Space');
  await panel.evaluate(el => Promise.all(el.getAnimations().map(a => a.finished)));
  assert.equal(await panel.evaluate(el => el.open), false, 'Space closes disclosure');
  assert.equal(await summary.evaluate(el => el === document.activeElement), true, 'Focus stays on the summary');
  await summary.evaluate(el => { el.click(); el.click(); el.click(); });
  await panel.evaluate(el => Promise.all(el.getAnimations().map(a => a.finished)));
  assert.equal(await panel.evaluate(el => el.open && !el.style.height && !el.style.overflow), true, 'Rapid reversals settle without stale styles');

  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    const state = await page.evaluate(() => {
      const panel = document.querySelector('.credibility');
      const rect = panel.getBoundingClientRect();
      window.scrollTo({ top: window.scrollY + rect.top - 180, behavior: 'instant' });
      return { width: innerWidth, scrollWidth: document.documentElement.scrollWidth, columns: getComputedStyle(panel).gridTemplateColumns, imageLoaded: panel.querySelector('img').complete && panel.querySelector('img').naturalWidth > 0 };
    });
    assert.ok(state.scrollWidth <= width, `No overflow at ${width}`);
    await page.locator('.partner-mark img').evaluate(el => el.decode());
    await page.screenshot({ path: `${evidence}/partner-${width}-open.png` });
    results.push(state);
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await summary.click();
  assert.equal(await panel.evaluate(el => el.open), false);
  await summary.click();
  assert.equal(await panel.evaluate(el => el.open && el.getAnimations().length === 0), true, 'Reduced motion opens immediately');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await summary.evaluate(el => el.click());
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(await panel.evaluate(el => !el.open && !el.style.height), true, 'Changing preference during motion settles');
  assert.deepEqual(errors, [], 'No application errors');

  const nojs = await browser.newPage({ javaScriptEnabled: false });
  await nojs.goto(base);
  const native = nojs.locator('[data-evidence-reveal]');
  await native.locator('summary').click();
  assert.equal(await native.evaluate(el => el.open), true, 'No-JavaScript disclosure remains usable');
  await native.locator('summary').click();
  assert.equal(await native.evaluate(el => el.open), false);
  const result = { passed: true, base, results, errors, checks: ['keyboard', 'opening/closing animation', 'rapid reversal', 'reduced motion', 'motion preference change', 'no JavaScript'] };
  await writeFile(`${evidence}/results.json`, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally { await browser.close(); }
