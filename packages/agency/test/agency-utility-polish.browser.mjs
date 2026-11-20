import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const origin = process.env.AGENCY_BASE_URL || 'http://127.0.0.1:4186';
const evidence = process.env.AGENCY_UTILITY_EVIDENCE;
const browser = await chromium.launch({
  headless: true,
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
    : {})
});
const results = [];
try {
  if (evidence) await mkdir(evidence, { recursive: true });
  const page = await browser.newPage();
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of ['/privacy', '/terms']) {
      await page.goto(origin + route);
      await page.locator('.agency-legal-content h2').first().waitFor();
      await page.evaluate(() => document.fonts.ready);
      const geometry = await page.evaluate(() => {
        const heading = [...document.querySelectorAll('h1')].find((h) => h.getBoundingClientRect().width);
        const content = document.querySelector('.agency-legal-content');
        const rect = content.getBoundingClientRect();
        return {
          headingLeft: heading.getBoundingClientRect().left,
          bodyLeft: rect.left,
          bodyRight: rect.right,
          bodyWidth: rect.width,
          width: innerWidth,
          scrollWidth: document.documentElement.scrollWidth
        };
      });
      if (evidence) await page.screenshot({ path: `${evidence}/${route.slice(1)}-${width}.png`, fullPage: true });
      results.push({ route, width, ...geometry });
      assert.ok(geometry.headingLeft >= 16, `${route} ${width}: heading needs a reading gutter (${geometry.headingLeft}px)`);
      assert.ok(geometry.bodyLeft >= 16, `${route} ${width}: body needs a reading gutter (${geometry.bodyLeft}px)`);
      assert.ok(geometry.bodyRight <= width - 16, `${route} ${width}: body exceeds reading gutter`);
      assert.ok(geometry.bodyWidth <= 850, `${route} ${width}: body needs a bounded reading measure`);
      assert.ok(geometry.scrollWidth <= width, `${route} ${width}: horizontal page overflow`);
      await page.locator('.legal-section-navigation > summary').click();
      const firstSection = page.getByRole('navigation', { name: 'Policy sections' }).getByRole('link').first();
      const anchor = await firstSection.getAttribute('href');
      await firstSection.click();
      assert.equal(new URL(page.url()).hash, anchor, `${route}: section navigation should target the original policy heading`);
    }
  }
  if (!process.argv.includes('--legal-only')) {
    await page.setViewportSize({ width: 390, height: 1000 });
    await page.goto(origin + '/map');
    await page.waitForFunction(() => document.body.classList.contains('design-preview'));
    assert.equal(await page.locator('iframe[src*="draw.createsomething.agency"]').count(), 0, 'Draw must not initialize until explicitly opened');
    await page.getByRole('button', { name: 'Use the embedded canvas' }).click();
    await page.locator('iframe[src*="draw.createsomething.agency"]').waitFor();
    await page.getByRole('button', { name: 'Close the embedded canvas' }).click();
    assert.equal(await page.locator('iframe[src*="draw.createsomething.agency"]').count(), 0);
    if (evidence) await page.locator('.draw-workbench').screenshot({ path: `${evidence}/map-entry-390.png` });
    await page.goto(origin + '/practice');
    await page.waitForFunction(() => document.body.classList.contains('design-preview'));
    await page.getByRole('button', { name: 'Prepare a draft' }).click();
    await assert.doesNotReject(() => page.getByText('Draft prepared. A person still decides what may be sent.').waitFor());
    assert.equal(await page.locator('[data-practice-sample] form').count(), 0);
    if (evidence) await page.locator('.sample-task').screenshot({ path: `${evidence}/practice-feedback-390.png` });
    await page.goto(origin + '/arcs');
    await page.waitForFunction(() => document.body.classList.contains('design-preview'));
    const original = await page.locator('.arc-group li').count();
    await page.getByLabel('Find a presentation').fill('app review');
    await page.waitForFunction((before) => document.querySelectorAll('.arc-group li').length < before, original);
    assert.ok(await page.locator('.arc-group li').count());
    await page.getByLabel('Find a presentation').fill('no-such-presentation-2302');
    await page.getByText('No presentations match. Try another task or clear the filters.').waitFor();
    if (evidence) await page.locator('.arc-filters').screenshot({ path: `${evidence}/arcs-empty-390.png` });
  }
  console.log(JSON.stringify({ passed: true, results }, null, 2));
} finally {
  if (evidence) await writeFile(`${evidence}/geometry.json`, JSON.stringify(results, null, 2));
  await browser.close();
}
