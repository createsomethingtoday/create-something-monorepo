import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const base = process.env.AGENCY_BASE_URL ?? 'http://127.0.0.1:4197';
const evidence = process.env.AGENCY_EVIDENCE_DIR ?? '/tmp/cre-2329-browser';
await mkdir(evidence, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}) });
const errors = [];
const results = [];
const bench = '.desktop-story-visual .workflow-bench';
const goto = async (page, route) => {
  await page.goto(`${base}${route}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('.nav-fixed') && document.querySelector('.plan-journey.story-ready, .agency-home'));
  // The existing navigation scroll restoration settles before exercising the story.
  await page.waitForTimeout(200);
};
const chapter = async (page, index) => {
  await page.evaluate(index => {
    const target = document.querySelector(`.plan-journey [data-chapter="${index}"]`);
    window.scrollTo({ top: scrollY + target.getBoundingClientRect().top - innerHeight * .3, behavior: 'instant' });
  }, index);
  await page.waitForFunction(index => document.querySelector('.desktop-story-visual svg')?.getAttribute('data-workpiece-stage') === String(index), index);
};
const clean = async (page) => {
  await page.waitForFunction(() => !document.querySelector('[data-workpiece-animating]'));
  assert.equal(await page.locator(`${bench} [style]`).evaluateAll(nodes => nodes.filter(node => node.style.length > 0).length), 0, 'Chapter settles to CSS without residual transforms or opacity');
};
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', error => errors.push(error.message));
  await goto(page, '/services');
  await chapter(page, 0);
  const request = await page.locator(`${bench} [data-workpiece-request]`).elementHandle();
  await page.waitForTimeout(400);
  await chapter(page, 1);
  await page.waitForFunction(() => document.querySelector('.desktop-story-visual [data-workpiece-animating]'));
  const samples = await page.evaluate(async () => {
    const node = document.querySelector('.desktop-story-visual [data-workpiece-build]');
    const values = [];
    for (let i = 0; i < 12; i++) { await new Promise(requestAnimationFrame); values.push(Number(getComputedStyle(node).opacity)); }
    return values;
  });
  assert.ok(samples.some(value => value > 0 && value < 1), `Actual intermediate GSAP state observed: ${samples}`);
  await clean(page);
  assert.equal(await request.evaluate(node => node === document.querySelector('.desktop-story-visual [data-workpiece-request]')), true, 'Request identity persists across chapters');
  for (const stage of [2, 1, 0, 2, 0, 1, 2]) await chapter(page, stage);
  await clean(page);
  assert.equal(await page.locator(`${bench} [data-workpiece-guide]`).evaluate(node => getComputedStyle(node).opacity), '1');
  await page.screenshot({ path: `${evidence}/services-handoff-1440.png` });
  await page.locator('.story-navigation button').first().focus();
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.activeElement?.id === 'membership-agree');
  await chapter(page, 1);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await clean(page);
  assert.equal(await page.locator('.inline-story-visual:visible').count(), 3);
  await page.emulateMedia({ reducedMotion: 'no-preference' });

  for (const width of [320, 390, 768, 1024, 1025, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await chapter(page, 2);
    await clean(page);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Services no overflow at ${width}`);
    const inline = await page.locator('.inline-story-visual:visible').count();
    assert.equal(inline, width < 1000 ? 3 : 0);
    if (width === 390 || width === 1024) await page.screenshot({ path: `${evidence}/services-handoff-${width}.png` });
    results.push({ route: '/services', width, inlineStates: inline });
  }

  for (const route of ['/', '/services']) {
    await goto(page, route);
    const selectors = route === '/' ? ['.support', '.cc-faq details'] : ['.membership-agreement-details', '.service-work-library', '.service-path-library'];
    for (const selector of selectors) {
      const details = page.locator(selector).first();
      const summary = details.locator(':scope > summary');
      if (!(await details.evaluate(node => node.open))) await summary.click();
      await page.waitForTimeout(350);
      assert.equal(await details.evaluate(node => node.open), true);
      await summary.click();
      await summary.click();
      await summary.click();
      await page.waitForTimeout(350);
      assert.equal(await details.evaluate(node => node.open), false, `${selector}: rapid toggles settle closed`);
      assert.equal(await details.evaluate(node => !!node.style.height || !!node.style.overflow), false, `${selector}: no clipping remains`);
      await summary.focus();
      await page.keyboard.press('Enter');
      assert.equal(await details.evaluate(node => node.open), true, `${selector}: keyboard opens immediately`);
      await page.keyboard.press('Space');
      assert.equal(await details.evaluate(node => node.open), false, `${selector}: keyboard closes immediately`);
      await summary.click();
      await page.emulateMedia({ reducedMotion: 'reduce' });
      assert.equal(await details.evaluate(node => !!node.style.height || !!node.style.overflow), false);
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      results.push({ route, disclosure: selector, pointerKeyboardReversal: true });
    }
    await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
    assert.equal(await page.locator(route === '/' ? '.support:not([open]),.cc-faq details:not([open])' : '.membership-agreement-details:not([open]),.service-work-library:not([open]),.service-path-library:not([open])').count(), 0, 'Printing reveals owned details');
    await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
  }

  for (const route of ['/', '/services']) {
    const staticPage = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    await staticPage.goto(`${base}${route}`, { waitUntil: 'domcontentloaded' });
    const selector = route === '/' ? '.support' : '.membership-agreement-details';
    await staticPage.locator(`${selector} > summary`).first().click();
    assert.equal(await staticPage.locator(selector).first().evaluate(node => node.open), true, 'Native disclosure works without JavaScript');
    if (route === '/services') assert.equal(await staticPage.locator('.inline-story-visual:visible').count(), 3);
    await staticPage.close();
  }
  assert.deepEqual(errors, []);
  await writeFile(`${evidence}/results.json`, JSON.stringify({ passed: true, base, samples, results, errors, noJavaScript: true, reducedMotion: true }, null, 2));
  console.log(JSON.stringify({ passed: true, cases: results.length, evidence }));
} finally { await browser.close(); }
