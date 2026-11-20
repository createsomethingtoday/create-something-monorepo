import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const origin = process.env.AGENCY_BASE_URL ?? 'http://127.0.0.1:4186';
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const reducedMotion of ['no-preference', 'reduce']) {
    await page.emulateMedia({ reducedMotion });
    for (const width of [1440, 1025, 1024, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(`${origin}/security`);
      await page.locator('.agency-preview-media img').waitFor();
      await page.evaluate(async () => {
        await document.fonts.ready;
        await document.querySelector('.agency-preview-media img').decode();
      });
      const geometry = await page.evaluate(() => {
        const rect = selector => document.querySelector(selector).getBoundingClientRect().toJSON();
        return {
          copy: rect('.clear-page-section__copy'),
          title: rect('h1'),
          media: rect('.agency-preview-media'),
          aside: rect('.clear-page-section__aside'),
          overflow: document.documentElement.scrollWidth > innerWidth
        };
      });
      const label = `${width} / ${reducedMotion}`;
      assert.ok(geometry.copy.width >= width * .75, `${label}: hero copy must retain its full reading column`);
      assert.ok(geometry.title.bottom <= geometry.media.top, `${label}: image must follow the title`);
      assert.ok(geometry.copy.bottom <= geometry.media.top, `${label}: image must follow copy and actions`);
      assert.ok(geometry.media.bottom <= geometry.aside.top, `${label}: runtime rules must follow the image`);
      assert.ok(geometry.aside.width >= width * .75, `${label}: runtime rules retain their reading width`);
      assert.equal(geometry.overflow, false, `${label}: no horizontal overflow`);
      assert.equal(await page.getByRole('link', { name: 'Read Token Policy' }).getAttribute('href'), '/bearer-token-policy');
      console.log(`PASS ${label}`);
    }
  }
  assert.deepEqual(errors, [], 'No application errors');
} finally {
  await browser.close();
}
