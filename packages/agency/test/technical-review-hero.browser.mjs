import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const origin = process.env.AGENCY_BASE_URL ?? 'http://127.0.0.1:4186';
const evidence = process.env.AGENCY_EVIDENCE_DIR;
if (evidence) await mkdir(evidence, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const reducedMotion of ['no-preference', 'reduce']) {
    await page.emulateMedia({ reducedMotion });
    for (const width of [1440, 1025, 1024, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(`${origin}/technical-review`);
      await page.locator('.agency-preview-media img').waitFor();
      await page.evaluate(async () => {
        await document.fonts.ready;
        await document.querySelector('.agency-preview-media img').decode();
      });
      const geometry = await page.evaluate(() => {
        const rect = selector => document.querySelector(selector).getBoundingClientRect().toJSON();
        return {
          copy: rect('.opening-copy'),
          title: rect('.opening h1:not([hidden])'),
          media: rect('.agency-preview-media'),
          overflow: document.documentElement.scrollWidth > innerWidth
        };
      });
      const label = `${width} / ${reducedMotion}`;
      console.log(JSON.stringify({ label, ...geometry }));
      if (evidence) await page.screenshot({ path: `${evidence}/technical-review-${width}-${reducedMotion}.png`, fullPage: true });
      assert.ok(geometry.copy.width >= width * .75, `${label}: hero copy must retain its full reading column`);
      assert.ok(geometry.title.bottom <= geometry.media.top, `${label}: image must follow the title`);
      assert.ok(geometry.copy.bottom <= geometry.media.top, `${label}: image must follow copy and actions`);
      assert.equal(geometry.overflow, false, `${label}: no horizontal overflow`);
      assert.equal(await page.locator('.opening').getByRole('link', { name: 'Discuss your existing project' }).getAttribute('href'), '/book?source=technical-review&intent=technical-review&lane=workflow_infrastructure');
      const cta = page.locator('.opening').getByRole('link', { name: 'Discuss your existing project' });
      await cta.focus();
      assert.equal(await cta.evaluate(element => element === document.activeElement), true, `${label}: CTA accepts keyboard focus`);
      await page.getByText('Review scope, price, and timing are agreed before paid work starts.', { exact: true }).waitFor({ state: 'visible' });
      console.log(`PASS ${label}`);
    }
  }
  const fallback = await browser.newPage({ javaScriptEnabled: false });
  for (const width of [1440, 1025, 1024, 768, 390, 320]) {
    await fallback.setViewportSize({ width, height: 1000 });
    await fallback.goto(`${origin}/technical-review`);
    const geometry = await fallback.evaluate(() => ({
      copyWidth: document.querySelector('.opening-copy').getBoundingClientRect().width,
      overflow: document.documentElement.scrollWidth > innerWidth
    }));
    assert.ok(geometry.copyWidth >= width * .3, `${width} / no JS: copy retains reading width`);
    assert.equal(geometry.overflow, false, `${width} / no JS: no horizontal overflow`);
    await fallback.locator('.opening').getByRole('link', { name: 'Discuss your existing project' }).waitFor({ state: 'visible' });
    console.log(`PASS ${width} / no JS`);
  }
  await fallback.close();
  assert.deepEqual(errors, [], 'No application errors');
} finally {
  await browser.close();
}
