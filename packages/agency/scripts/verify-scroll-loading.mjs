import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const base = process.env.AGENCY_BASE_URL ?? 'http://127.0.0.1:4199';
const evidence = process.env.AGENCY_EVIDENCE_DIR ?? '/tmp/agency-scroll-loading';
const manifest = JSON.parse(await readFile(process.env.AGENCY_MANIFEST ?? '.svelte-kit/output/client/.vite/manifest.json', 'utf8'));
const entry = Object.entries(manifest).find(([key]) => key.endsWith('/gsap/index.js'))?.[1];
assert.ok(entry?.file, 'Built manifest exposes the dynamically loaded GSAP entry');
await mkdir(evidence, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const results = [];
  for (const width of [390, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    let release;
    let intercepted = false;
    const gate = new Promise(resolve => { release = resolve; });
    await page.route(`**/${entry.file}`, async route => {
      intercepted = true;
      await gate;
      await route.continue();
    });
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-home-step="build"]:enabled').waitFor();
    assert.ok(intercepted, 'GSAP runtime is genuinely held at the network boundary');
    const seen = page.locator('.work .chapterhead');
    await seen.evaluate(el => scrollTo({ top: scrollY + el.getBoundingClientRect().top - 180, behavior: 'instant' }));
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.equal(await seen.evaluate(el => getComputedStyle(el).opacity), '1', 'Content stays readable while GSAP loads');
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    release();
    await page.waitForLoadState('networkidle');
    const starts = await seen.evaluate(el => {
      window.__seenEntranceStarts = 0;
      const observer = new MutationObserver(() => {
        if (el.style.opacity && Number(el.style.opacity) < 1) window.__seenEntranceStarts++;
      });
      observer.observe(el, { attributes: true, attributeFilter: ['style'] });
      return window.__seenEntranceStarts;
    });
    assert.equal(starts, 0);
    await seen.evaluate(el => scrollTo({ top: scrollY + el.getBoundingClientRect().top - 180, behavior: 'instant' }));
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => window.__seenEntranceStarts), 0, 'A previously viewed group never re-enters after the delayed chunk resolves');
    assert.equal(await seen.evaluate(el => getComputedStyle(el).opacity), '1');
    const unseen = page.locator('.plans .chapterhead');
    await unseen.evaluate(el => scrollTo({ top: scrollY + el.getBoundingClientRect().top - 180, behavior: 'instant' }));
    await page.waitForFunction(() => Number(getComputedStyle(document.querySelector('.plans .chapterhead')).opacity) < 1);
    await page.waitForFunction(() => !document.querySelector('.plans .chapterhead').style.opacity);
    results.push({ width, passed: true });
    await page.screenshot({ path: `${evidence}/settled-${width}.png` });
    await page.close();
  }
  const receipt = { base, passed: true, results, checks: ['delayed real GSAP request', 'visible while loading', 'view-and-return remains settled', 'unseen groups still animate'] };
  await writeFile(`${evidence}/results.json`, JSON.stringify(receipt, null, 2));
  console.log(JSON.stringify(receipt));
} finally { await browser.close(); }
