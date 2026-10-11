import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const baseURL = process.env.AGENCY_PREVIEW_URL || 'http://127.0.0.1:4183';
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {})
});
try {
  for (const width of [320, 390, 768, 1440]) {
    const page = await browser.newPage({
      viewport: { width, height: 900 },
      reducedMotion: 'reduce'
    });
    await page.route('**/*', (route) =>
      new URL(route.request().url()).origin === new URL(baseURL).origin
        ? route.continue()
        : route.abort()
    );
    await page.goto(`${baseURL}/products`, { waitUntil: 'networkidle' });
    const consent = page.getByRole('button', { name: 'Necessary only' });
    if (await consent.isVisible()) await consent.click();
    await page.getByRole('tab', { name: /Control live operation/ }).focus();
    await page.keyboard.press('Enter');
    const links = page.locator('.control-surfaces a');
    await links.first().focus();
    for (let index = 0; index < 3; index++) {
      if (index) await page.keyboard.press('Tab');
      const link = links.nth(index);
      await page.waitForTimeout(150);
      assert.ok(await link.evaluate((el) => el === document.activeElement));
      const bounds = await link.boundingBox();
      const container = await page.locator('.control-surfaces').boundingBox();
      assert.ok(
        bounds.x >= Math.max(0, container.x) - 2 &&
          bounds.x + bounds.width <= Math.min(width, container.x + container.width) + 2,
        `${width}px: focused card ${index + 1} must be fully visible horizontally`
      );
      assert.notEqual(await link.evaluate((el) => getComputedStyle(el).outlineStyle), 'none');
    }
    await page.keyboard.press('Tab');
    assert.ok(
      !(await page
        .locator('.control-surfaces')
        .evaluate((el) => el.contains(document.activeElement)))
    );
    await page.close();
    console.log(`PASS ${width}px: three visible keyboard targets and exit`);
  }
} finally {
  await browser.close();
}
