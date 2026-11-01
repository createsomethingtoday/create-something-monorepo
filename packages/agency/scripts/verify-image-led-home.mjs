import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const base = process.env.AGENCY_BASE_URL ?? 'http://127.0.0.1:4186';
const evidence = process.env.AGENCY_EVIDENCE_DIR ?? '/tmp/agency-image-led-home';
await mkdir(evidence, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}) });
const errors = [];
const context = await browser.newContext();
const page = await context.newPage();
page.on('pageerror', error => errors.push(error.message));
const results = [];
try {
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.locator('[data-home-step="build"]').waitFor();
  const initialLearn = await page.locator('#journey-image').getAttribute('src');
  for (const step of ['build', 'run', 'learn']) {
    await page.locator(`[data-home-step="${step}"]`).click();
    assert.equal(await page.locator(`[data-home-step="${step}"]`).getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('[data-home-step][aria-pressed="true"]').count(), 1);
    const src = await page.locator('#journey-image').getAttribute('src');
    if (step === 'learn') assert.equal(src, initialLearn, 'Learn must return to the original scene after inspection');
    else assert.notEqual(src, initialLearn, `${step} must advance the visual story`);
    if (step === 'run') assert.match(src, /run-reviewed/);
  }
  await page.locator('[data-home-open="work-dialog"]').click();
  assert.equal(await page.locator('#work-dialog').evaluate(dialog => dialog.open), true);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#work-dialog').evaluate(dialog => dialog.open), false);
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-home-open')), 'work-dialog');
  for (const width of [1440, 728, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.locator('[data-home-step="run"]').click();
    await page.locator('#journey-image').evaluate(image => image.decode());
    const geometry = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, heading: document.querySelector('#hero-title')?.textContent, teamImage: document.querySelector('.home-team img')?.getAttribute('src') }));
    assert.ok(geometry.scrollWidth <= width, `No horizontal overflow at ${width}`);
    assert.match(geometry.heading, /Put AI to work/);
    assert.match(geometry.teamImage, /team-handoff/);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.screenshot({ path: `${evidence}/home-${width}.png`, fullPage: true });
    results.push(geometry);
  }
  await page.goto(`${base}/?film=websites#work`, { waitUntil: 'networkidle' });
  await page.locator('#work-library[open]').waitFor();
  assert.ok(await page.locator('#work').count(), 'Existing film deep links still resolve');
  assert.deepEqual(errors, [], 'No application JavaScript errors');
  await writeFile(`${evidence}/results.json`, JSON.stringify({ base, results, errors, passed: true }, null, 2));
  console.log(JSON.stringify({ passed: true, widths: results.map(result => result.width), evidence }));
} finally {
  await browser.close();
}
