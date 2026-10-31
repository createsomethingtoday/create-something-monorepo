import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const base = process.env.AGENCY_BASE_URL ?? 'http://127.0.0.1:4186';
const evidence = process.env.AGENCY_EVIDENCE_DIR ?? '/tmp/agency-walkthrough-theater';
await mkdir(evidence, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const [width, height] of [[1440, 1000], [1440, 800], [728, 1000], [390, 844], [320, 568], [844, 390]]) {
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base, { waitUntil: 'networkidle' });
    const opener = page.locator('[data-home-open="work-dialog"]');
    await opener.focus();
    const scrollY = await page.evaluate(() => window.scrollY);
    await opener.press('Enter');
    const dialog = page.locator('#work-dialog');
    await dialog.waitFor({ state: 'visible' });
    // Remote metadata/poster delivery can trail the modal opening; measure the loaded frame.
    await page.waitForFunction(() => { const v=document.querySelector('#work-dialog video'); return !v.paused && v.currentTime > .1 && v.videoWidth > 0; }, undefined, { timeout: 15000 });
    const geometry = await dialog.evaluate(d => {
      const v = d.querySelector('video'), r = v.getBoundingClientRect(), b = d.getBoundingClientRect();
      return { dialog: { x:b.x, y:b.y, width:b.width, height:b.height }, video: { x:r.x, y:r.y, width:r.width, height:r.height }, overflow:d.scrollHeight > d.clientHeight + 1, fit:getComputedStyle(v).objectFit, controls:v.controls, inline:v.playsInline };
    });
    assert.ok(geometry.dialog.width >= width * .9, `Theater must occupy the viewport at ${width}`);
    assert.ok(geometry.dialog.y >= -1 && geometry.dialog.y + geometry.dialog.height <= height + 1, 'Dialog must fit vertically');
    assert.equal(geometry.overflow, false, 'Controls and caption must fit without dialog scrolling');
    assert.equal(geometry.fit, 'contain', 'Preserve the whole recorded frame');
    assert.ok(geometry.controls && geometry.inline, 'Native controls and inline mobile playback');
    const media = await dialog.locator('video').evaluate(v => ({ width:v.videoWidth, height:v.videoHeight, duration:v.duration }));
    const fittedWidth = Math.min(geometry.video.width, geometry.video.height * media.width / media.height);
    if (width >= 1000) assert.ok(fittedWidth > width * .7, 'Actual recorded image must be substantially larger');
    await page.screenshot({ path: `${evidence}/theater-${width}x${height}.png` });
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('#work-dialog').open && document.querySelector('#work-dialog video').paused && document.body.style.overflow !== 'hidden');
    assert.equal(await dialog.locator('video').evaluate(v => v.paused), true);
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-home-open')), 'work-dialog');
    assert.equal(await page.evaluate(() => document.body.style.overflow), '');
    assert.ok(Math.abs(await page.evaluate(() => window.scrollY) - scrollY) <= 1, 'Return without moving the page');
    await opener.press('Enter');
    await dialog.locator('[data-home-close]').click();
    await page.waitForFunction(() => document.querySelector('#work-dialog video').paused && document.body.style.overflow !== 'hidden');
    assert.equal(await dialog.evaluate(d => d.open), false);
    assert.equal(await dialog.locator('video').evaluate(v => v.paused), true);
    assert.deepEqual(errors, []);
    results.push({ width, height, geometry, media, fittedWidth, passed:true });
    await page.close();
  }
  // A denied play request must leave usable controls, without an unhandled rejection.
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => { HTMLMediaElement.prototype.play = () => Promise.reject(new DOMException('Playback denied for regression check', 'NotAllowedError')); });
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.evaluate(() => { document.body.style.overflow = 'auto'; });
  await page.locator('[data-home-open="work-dialog"]').click();
  await page.waitForFunction(() => document.querySelector('#work-dialog').open);
  assert.equal(await page.locator('#work-dialog video').evaluate(v => v.controls && v.paused), true);
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.querySelector('#work-dialog').contains(document.activeElement)), true, 'Focus stays in the modal');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => document.body.style.overflow === 'auto');
  assert.deepEqual(errors, []);
  await writeFile(`${evidence}/results.json`, JSON.stringify({ base, results, rejectedPlayFallback:true, passed:true }, null, 2));
  console.log(JSON.stringify({ passed:true, viewports:results.length, evidence }));
} finally {
  await browser.close();
}
