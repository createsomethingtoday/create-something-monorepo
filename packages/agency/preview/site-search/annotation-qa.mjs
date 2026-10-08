import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

// Explicit DOM/API fixture on the real Agency shell. Not native host acceptance.
const origin = 'http://127.0.0.1:4179';
const output = '/tmp/agency-annotation-qa';
await mkdir(output, { recursive: true });
const routes = { '/': 2, '/services': 2, '/products': 2, '/field-reports': 1, '/practice': 1, '/stack': 1 };
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const evidence = [];
try {
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport, reducedMotion: 'reduce' });
    await page.addInitScript(() => {
      window.annotationFixtureCalls = [];
      window.annotationFixtureAccepted = true;
      Object.defineProperty(document, 'oai', { value: { annotation: { request(target, options) {
        window.annotationFixtureCalls.push({ id: target.id, title: options.metadata.title, options });
        return { accepted: window.annotationFixtureAccepted };
      } } } });
    });
    for (const [route, count] of Object.entries(routes)) {
      await page.goto(origin + route);
      await page.locator('.agency-annotation-button').first().waitFor();
      assert.equal(await page.locator('.agency-annotation-button').count(), count, route);
      assert.equal(await page.evaluate(() => window.annotationFixtureCalls.length), 0, 'No automatic annotation request');
      assert.ok(await page.evaluate(() => [...document.querySelectorAll('[oai-annotation-metadata]')].every((target) => {
        const value = target.getAttribute('oai-annotation-metadata');
        return new TextEncoder().encode(value).length <= 2048 && Object.keys(JSON.parse(value)).length <= 6;
      })));
      await page.locator('.agency-annotation-button').first().click();
      await page.getByText('Request accepted. Review and send your comment in the browser.').waitFor();
      assert.equal(await page.evaluate(() => window.annotationFixtureCalls.length), 1);
      await page.evaluate(() => { window.annotationFixtureAccepted = false; });
      await page.locator('.agency-annotation-button').first().click();
      await page.getByText('Request unavailable. You can still read this section.').waitFor();
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), route + ' mobile overflow');
      if (route === '/' || route === '/services') await page.screenshot({ path: `${output}/${viewport.width}-${route === '/' ? 'home' : 'services'}.png` });
      evidence.push({ viewport: viewport.width, route, count });
    }
    // Follow real SvelteKit links to confirm teardown/reinstallation on SPA routes.
    await page.goto(origin + '/services');
    await page.locator('.agency-annotation-button').first().waitFor();
    await page.evaluate(() => { window.annotationStaleButton = document.querySelector('.agency-annotation-button'); });
    await page.locator('a[href="/stack"]').first().click();
    await page.waitForURL(origin + '/stack');
    await page.locator('.agency-annotation-button').first().waitFor();
    assert.equal(await page.locator('.agency-annotation-button').count(), 1);
    const before = await page.evaluate(() => window.annotationFixtureCalls.length);
    await page.evaluate(() => window.annotationStaleButton.click());
    assert.equal(await page.evaluate(() => window.annotationFixtureCalls.length), before);
    await page.goto(origin + '/login');
    assert.equal(await page.locator('.agency-annotation-button').count(), 0);
    await page.close();
  }
  const fallback = await browser.newPage({ viewport: { width: 390, height: 844 } });
  for (const route of Object.keys(routes)) {
    await fallback.goto(origin + route);
    await fallback.getByRole('button', { name: 'Open search', exact: true }).waitFor();
    assert.equal(await fallback.locator('.agency-annotation-button').count(), 0, route);
    assert.equal(await fallback.locator('[oai-annotation-metadata]').count(), 0, route);
  }
  await fallback.close();
  console.log(JSON.stringify({ passed: true, hostAcceptance: false, evidence, output }));
} finally { await browser.close(); }
