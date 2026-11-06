import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const base = process.env.AGENCY_BASE_URL ?? 'http://127.0.0.1:4186';
const evidence = process.env.AGENCY_EVIDENCE_DIR ?? '/tmp/agency-walkthrough-entry-evidence';
const openerSelector = '[data-home-open="work-dialog"]';
await mkdir(evidence, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}) });
const results = [];
const failures = [];
async function run(name, test) {
  try { const detail = await test(); results.push({ name, passed: true, ...detail }); console.log(`PASS ${name}`); }
  catch (error) { failures.push({ name, message: error.stack }); console.error(`FAIL ${name}: ${error.message}`); }
}
async function ready(page) {
  await page.goto(base, { waitUntil: 'networkidle' });
  // The homepage's existing intro can visually cover a ready DOM for 1.7s.
  // Capture the interaction after its actual rendered surface is exposed.
  await page.waitForFunction(() => !document.querySelector('.wordmark-intro'));
  const opener = page.locator(openerSelector);
  await opener.scrollIntoViewIfNeeded();
  await page.waitForFunction(selector => {
    const button = document.querySelector(selector), img = button?.querySelector('img');
    return button && !button.disabled && img?.complete && img.naturalWidth > 0;
  }, openerSelector);
  await page.evaluate(() => {
    window.__entryFlights = [];
    new MutationObserver(records => {
      for (const record of records) for (const node of record.addedNodes) {
        if (node instanceof HTMLElement && node.classList.contains('walkthrough-flight')) {
          const rect = node.getBoundingClientRect();
          window.__entryFlights.push({ left: rect.left, top: rect.top, width: rect.width, height: rect.height, hidden: node.getAttribute('aria-hidden'), pointerEvents: getComputedStyle(node).pointerEvents });
        }
      }
    }).observe(document.querySelector('#work-dialog'), { childList: true });
  });
  return opener;
}
async function open(page, opener) {
  await opener.focus();
  await opener.press('Enter');
  await page.waitForFunction(() => document.querySelector('#work-dialog').open);
}
async function clean(page) {
  await page.waitForFunction(() => !document.querySelector('.walkthrough-flight') && !document.querySelector('#work-dialog').hasAttribute('data-walkthrough-entering'));
}
async function close(page, opener, scrollY) {
  await page.keyboard.press('Escape');
  await page.waitForFunction(selector => {
    const dialog = document.querySelector('#work-dialog');
    return !dialog.open && dialog.querySelector('video').paused && document.body.style.overflow !== 'hidden' && document.activeElement === document.querySelector(selector);
  }, openerSelector);
  await clean(page);
  assert.ok(await opener.evaluate(el => el === document.activeElement), 'Focus returns to play button');
  if (scrollY !== undefined) assert.ok(Math.abs(await page.evaluate(() => window.scrollY) - scrollY) <= 1, 'Scroll position is preserved');
}
function recordErrors(page) { const errors = []; page.on('pageerror', error => errors.push(error.message)); return errors; }

try {
  for (const [width, height] of [[320, 568], [390, 844], [768, 900], [1024, 900], [1025, 900], [1440, 1000], [844, 390]]) {
    await run(`normal-${width}x${height}`, async () => {
      const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'no-preference' });
      const errors = recordErrors(page);
      try {
        const opener = await ready(page);
        await opener.focus();
        assert.ok(await opener.evaluate(el => getComputedStyle(el).outlineStyle !== 'none'), 'Visible keyboard focus');
        const layout = await opener.evaluate(el => {
          const rect = el.getBoundingClientRect(), label = el.querySelector('.proof-invitation').getBoundingClientRect();
          return { width: rect.width, height: rect.height, labelWidth: label.width, labelHeight: label.height, overflow: document.documentElement.scrollWidth > innerWidth, minTarget: rect.width >= 44 && rect.height >= 44 };
        });
        assert.equal(layout.overflow, false, 'No page overflow');
        assert.ok(layout.minTarget && layout.labelHeight < layout.height && layout.labelWidth <= layout.width + 1, 'Button label fits');
        await page.screenshot({ path: `${evidence}/preview-${width}x${height}.png` });
        if (width >= 768) {
          const box = await opener.boundingBox();
          await page.mouse.move(box.x + box.width * .7, Math.min(height - 2, box.y + box.height * .5));
          await page.waitForFunction(() => document.querySelector('[data-proof-play]').style.transform.includes('translate'));
          await page.mouse.move(0, 0);
        }
        const scrollY = await page.evaluate(() => window.scrollY);
        await open(page, opener);
        await page.waitForFunction(() => window.__entryFlights.length > 0);
        const flights = await page.evaluate(() => window.__entryFlights);
        assert.equal(flights.length, 1, 'Exactly one disposable poster');
        assert.equal(flights[0].hidden, 'true');
        assert.equal(flights[0].pointerEvents, 'none');
        await clean(page);
        const geometry = await page.locator('#work-dialog').evaluate(dialog => {
          const r = dialog.getBoundingClientRect(), video = dialog.querySelector('video');
          return { top: r.top, bottom: r.bottom, width: r.width, overflow: dialog.scrollHeight > dialog.clientHeight + 1, controls: video.controls, inline: video.playsInline, fit: getComputedStyle(video).objectFit };
        });
        assert.ok(geometry.top >= -1 && geometry.bottom <= height + 1 && geometry.width >= width * .9, 'Theater fits viewport');
        assert.equal(geometry.overflow, false, 'Theater does not clip its controls/notes');
        assert.ok(geometry.controls && geometry.inline && geometry.fit === 'contain');
        await page.screenshot({ path: `${evidence}/theater-${width}x${height}.png` });
        // These are local interaction checks; no fake recording or playback assertion.
        const media = await page.locator('#work-dialog video').evaluate(v => ({ readyState: v.readyState, paused: v.paused, currentTime: v.currentTime, videoWidth: v.videoWidth, currentSrc: v.currentSrc }));
        await close(page, opener, scrollY);
        assert.deepEqual(errors, []);
        return { layout, geometry, flights, media };
      } finally { await page.close(); }
    });
  }
  await run('interrupted-and-preferences', async () => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'no-preference' });
    const errors = recordErrors(page);
    try {
      const opener = await ready(page);
      await open(page, opener);
      await page.waitForFunction(() => document.querySelector('.walkthrough-flight'));
      await close(page, opener);
      await open(page, opener);
      await page.waitForFunction(() => document.querySelector('.walkthrough-flight'));
      // Invoke the actual site preference handler while its background control is inert.
      await page.locator('.story-tools button').evaluate(button => button.click());
      await clean(page);
      assert.equal(await page.locator('#work-dialog').evaluate(d => d.open), true);
      await close(page, opener);
      const previous = await page.evaluate(() => window.__entryFlights.length);
      await open(page, opener);
      assert.equal(await page.evaluate(() => window.__entryFlights.length), previous, 'Site motion-off prevents flight');
      await close(page, opener);
      await page.locator('.story-tools button').evaluate(button => button.click());
      await open(page, opener);
      await page.waitForFunction(() => document.querySelector('.walkthrough-flight'));
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await clean(page);
      await close(page, opener);
      const beforeReduced = await page.evaluate(() => window.__entryFlights.length);
      await open(page, opener);
      assert.equal(await page.evaluate(() => window.__entryFlights.length), beforeReduced, 'OS reduced motion prevents flight despite site preference');
      await close(page, opener);
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      // Browser media-query events are delivered on a rendering update. Opening
      // before that event would intentionally be interrupted by the live change.
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await open(page, opener);
      await page.waitForFunction(() => document.querySelector('.walkthrough-flight'));
      await page.setViewportSize({ width: 1024, height: 800 });
      await clean(page);
      assert.equal(await page.locator('#work-dialog').evaluate(d => d.open), true);
      await close(page, opener);
      assert.deepEqual(errors, []);
      return { checks: ['Escape during flight', 'reopen', 'site motion off during flight', 'site motion off opening', 'OS preference during flight', 'OS preference opening', 'resize during flight'] };
    } finally { await page.close(); }
  });
  await run('touch-opening', async () => {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    try { const opener = await ready(page); await opener.tap(); await page.waitForFunction(() => document.querySelector('#work-dialog').open); await clean(page); await page.locator('[data-home-close]').tap(); await page.waitForFunction(() => !document.querySelector('#work-dialog').open); return {}; }
    finally { await page.close(); }
  });
  await run('blocked-gsap-import', async () => {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'no-preference' });
    const blocked = [];
    const errors = recordErrors(page);
    await page.route(/gsap[^/]*\.js(?:\?|$)/i, route => { blocked.push(route.request().url()); return route.abort('failed'); });
    try {
      const opener = await ready(page);
      assert.ok(blocked.length > 0, 'Actually blocked GSAP imports');
      await open(page, opener);
      await clean(page);
      assert.equal(await page.evaluate(() => window.__entryFlights.length), 0);
      assert.equal(await page.locator('#work-dialog video').evaluate(v => v.controls), true);
      await close(page, opener);
      assert.deepEqual(errors, []);
      return { blocked };
    } finally { await page.close(); }
  });
  await run('denied-play-fallback', async () => {
    const page = await browser.newPage({ reducedMotion: 'reduce' });
    const errors = recordErrors(page);
    await page.addInitScript(() => { HTMLMediaElement.prototype.play = () => Promise.reject(new DOMException('Denied for regression', 'NotAllowedError')); });
    try {
      const opener = await ready(page);
      await page.evaluate(() => { document.body.style.overflow = 'auto'; });
      await open(page, opener);
      assert.equal(await page.locator('#work-dialog video').evaluate(v => v.paused && v.controls), true);
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.querySelector('#work-dialog').contains(document.activeElement)), true);
      await close(page, opener);
      assert.equal(await page.evaluate(() => document.body.style.overflow), 'auto');
      assert.deepEqual(errors, []);
      return { evidenceType: 'Injected denied-play fallback, not remote playback evidence' };
    } finally { await page.close(); }
  });
  await run('no-javascript', async () => {
    const page = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 320, height: 568 } });
    try {
      await page.goto(base, { waitUntil: 'networkidle' });
      assert.equal(await page.locator(openerSelector).isDisabled(), true);
      const link = page.getByRole('link', { name: 'Explore the walkthrough in the case study' });
      assert.equal(await link.getAttribute('href'), '/case-studies/webflow-marketplace');
      await link.scrollIntoViewIfNeeded();
      assert.equal(await link.isVisible(), true);
      assert.equal(await page.locator('.proof-play').isVisible(), false);
      return { caseStudyHref: await link.getAttribute('href') };
    } finally { await page.close(); }
  });
  await writeFile(`${evidence}/results.json`, JSON.stringify({ base, results, failures, passed: failures.length === 0, evidenceBoundary: 'Local rendered interaction; media fields record real remote delivery only. Denied-play test is an injected fallback.' }, null, 2));
  console.log(JSON.stringify({ passed: failures.length === 0, completed: results.length, failures: failures.length, evidence }));
  if (failures.length) process.exitCode = 1;
} finally { await browser.close(); }
