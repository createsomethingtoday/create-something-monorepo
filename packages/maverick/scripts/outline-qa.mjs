import { chromium } from '../../../node_modules/.pnpm/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
const origin = process.argv[2];
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  for (const width of [1440, 768, 390, 320]) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      reducedMotion: 'reduce'
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    let submissions = 0;
    await page.route('**/api/contact', async (route) => {
      submissions++;
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Synthetic outage' })
      });
    });
    for (const path of ['/technology', '/mission-vision', '/careers', '/about', '/mining']) {
      await page.goto(origin + path, { waitUntil: 'networkidle' });
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
        false,
        path + ' overflow ' + width
      );
      assert.equal(await page.locator('h1').count(), 1);
      const broken = await page
        .locator('main img')
        .evaluateAll((images) =>
          images.filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src)
        );
      assert.deepEqual(broken, []);
    }
    const next = page.getByRole('button', { name: 'Next mineral' });
    await next.focus();
    await page.keyboard.press('Enter');
    assert.equal((await page.locator('figure figcaption').textContent()).trim(), 'Platinum');
    await page.getByRole('button', { name: 'Previous mineral' }).click();
    assert.equal((await page.locator('figure figcaption').textContent()).trim(), 'Gold');
    await page.getByRole('button', { name: 'Previous mineral' }).click();
    assert.equal((await page.locator('figure figcaption').textContent()).trim(), 'Vanadium');
    for (let i = 0; i < 5; i++) {
      await next.click();
      await page.locator('figure img').scrollIntoViewIfNeeded();
      await page.waitForFunction(() => {
        const img = document.querySelector('figure img');
        return img.complete && img.naturalWidth > 0;
      });
    }
    assert.equal(await page.locator('video').count(), 0);
    const header = page.locator('header');
    if (width <= 1100) await header.getByRole('button', { name: 'Menu', exact: true }).click();
    await header.getByRole('button', { name: 'Contact Us', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.waitFor({ state: 'visible' });
    assert.equal(await dialog.locator('a[href^="mailto:"]').count(), 1);
    await dialog.getByRole('button', { name: 'Submit', exact: true }).click();
    assert.equal(submissions, 0, 'empty form never sent');
    await page.locator('#contact-name').fill('Synthetic Test');
    await page.locator('#contact-company').fill('Local fixture');
    await page.locator('#contact-email').fill('synthetic@example.invalid');
    await page.locator('#contact-phone').fill('2025550100');
    await page.locator('#contact-category').selectOption('general');
    await page.locator('textarea').fill('Synthetic browser test, intercepted locally.');
    await dialog.getByRole('button', { name: 'Submit', exact: true }).click();
    await page.getByRole('alert').waitFor();
    assert.match(await page.getByRole('alert').innerText(), /could not be confirmed/);
    assert.equal(submissions, 1, 'only mocked submission');
    await page.waitForFunction(
      () => document.activeElement === document.querySelector('[role="alert"]')
    );
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'detached' });
    assert.deepEqual(errors, []);
    console.log(
      'PASS outline routes, images, carousel keyboard/wrap, reduced motion and mocked form errors at ' +
        width
    );
    await context.close();
  }
} finally {
  await browser.close();
}
