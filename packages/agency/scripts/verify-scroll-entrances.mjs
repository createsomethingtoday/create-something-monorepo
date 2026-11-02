import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const base = process.env.AGENCY_BASE_URL ?? 'http://127.0.0.1:4198';
const evidence = process.env.AGENCY_EVIDENCE_DIR ?? '/tmp/agency-scroll-entrances';
await mkdir(evidence, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const width of [320, 390, 768, 1024, 1025, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      window.entrances = [];
      const seen = new WeakSet();
      new MutationObserver(records => {
        for (const { target } of records) {
          if (!(target instanceof HTMLElement) || !target.hasAttribute('data-scroll-entrance') || seen.has(target)) continue;
          if (target.style.opacity && Number(target.style.opacity) < 1) {
            seen.add(target);
            window.entrances.push({ text: target.textContent.trim().slice(0, 45) });
          }
        }
      }).observe(document, { subtree: true, attributes: true, attributeFilter: ['style'] });
    });
    await page.goto(base, { waitUntil: 'networkidle' });
    assert.equal(await page.locator('[data-scroll-entrance]').count(), 12, 'Authored groups mounted');
    assert.equal(await page.locator('.herocopy').evaluate(el => getComputedStyle(el).opacity), '1');
    const target = page.locator('.work .chapterhead');
    await target.evaluate(el => window.scrollTo({ top: scrollY + el.getBoundingClientRect().top - 180, behavior: 'instant' }));
    await page.waitForFunction(() => Number(getComputedStyle(document.querySelector('.work .chapterhead')).opacity) < 1);
    const motion = await target.evaluate(el => ({ opacity: Number(getComputedStyle(el).opacity), y: new DOMMatrix(getComputedStyle(el).transform).m42 }));
    assert.ok(motion.opacity >= 0.25 && motion.opacity < 1 && motion.y > 0 && motion.y <= 16, 'Actual GSAP intermediate state');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.equal(await target.evaluate(el => el.style.opacity), '', 'Preference change restores authored inline state');
    assert.equal(await target.evaluate(el => getComputedStyle(el).opacity), '1');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.evaluate(() => scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));
    await page.waitForFunction(() => [...document.querySelectorAll('[data-scroll-entrance]')].every(el => !el.style.opacity));
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `No overflow at ${width}`);
    assert.deepEqual(errors, []);
    await page.screenshot({ path: `${evidence}/closing-${width}.png` });

    // Fresh mount exercises the whole page, reverse scroll and focus to pending content.
    await page.goto(base, { waitUntil: 'networkidle' });
    const height = await page.evaluate(() => document.body.scrollHeight);
    for (let y = 350; y < height; y += 350) {
      await page.evaluate(y => scrollTo({ top: y, behavior: 'instant' }), y);
      await page.waitForTimeout(35);
    }
    await page.waitForFunction(() => [...document.querySelectorAll('[data-scroll-entrance]')].every(el => !el.style.opacity));
    const count = await page.evaluate(() => window.entrances.length);
    assert.ok(count >= 6, `Real scroll triggers chapter entrances at ${width}`);
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
    await page.waitForTimeout(80);
    await page.evaluate(() => scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));
    await page.waitForTimeout(80);
    assert.equal(await page.evaluate(() => window.entrances.length), count, 'Reverse scroll never replays');
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.locator('.plan a').first().focus();
    assert.equal(await page.locator('.planrow').evaluate(el => el.getAnimations().length), 0, 'Keyboard focus stays immediate');
    assert.equal(await page.locator('.planrow').evaluate(el => getComputedStyle(el).opacity), '1');
    results.push({ width, entrances: count, passed: true });
    await page.close();
  }
  for (const options of [{ javaScriptEnabled: false }, { reducedMotion: 'reduce' }]) {
    const page = await browser.newPage(options);
    await page.goto(base, { waitUntil: 'networkidle' });
    assert.ok(await page.locator('[data-scroll-entrance]').evaluateAll(elements => elements.every(el => getComputedStyle(el).opacity === '1' && getComputedStyle(el).transform === 'none')));
    assert.equal(await page.evaluate(() => document.getAnimations().length), 0);
    await page.close();
  }
  const hash = await browser.newPage();
  await hash.goto(`${base}/#built-work`, { waitUntil: 'networkidle' });
  assert.equal(await hash.locator('.workshot').evaluate(el => getComputedStyle(el).opacity), '1');
  assert.equal(await hash.locator('[data-scroll-entrance]').evaluateAll(elements => elements.reduce((n, el) => n + el.getAnimations().length, 0)), 0);
  await hash.close();
  const receipt = { base, passed: true, results, checks: ['real scroll animation', 'once-only reverse scroll', 'live reduced motion', 'focus', 'no JavaScript', 'initial reduced motion', 'hash arrival', 'responsive overflow'] };
  await writeFile(`${evidence}/results.json`, JSON.stringify(receipt, null, 2));
  console.log(JSON.stringify(receipt));
} finally { await browser.close(); }
