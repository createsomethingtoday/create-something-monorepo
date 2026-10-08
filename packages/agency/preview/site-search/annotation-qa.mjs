import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

// Explicit DOM/API fixture on the real Agency shell. Not native host acceptance.
const origin = process.env.AGENCY_PREVIEW_ORIGIN ?? 'http://127.0.0.1:4179';
const output = process.env.AGENCY_ANNOTATION_EVIDENCE ?? '/tmp/agency-annotation-qa';
await mkdir(output, { recursive: true });
const routes = { '/': 3, '/services': 2, '/products': 2, '/field-reports': 1, '/practice': 1, '/stack': 1, '/about': 1, '/agent-foundation': 2, '/field-reports/template-review': 1, '/field-reports/upstream-contributions': 2, '/workflows/human-in-the-loop-ai': 1, '/workflows/ai-agent-evaluation': 1 };
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
      await page.waitForLoadState('networkidle');
      const necessaryOnly = page.getByRole('button', { name: 'Necessary only', exact: true });
      if (await necessaryOnly.isVisible()) await necessaryOnly.click();
      await page.locator('.agency-annotation-button').last().scrollIntoViewIfNeeded();
      await page.evaluate(() => document.fonts.ready);
      // Allow the compositor to paint after scrolling; capture without transitional frames.
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await page.screenshot({ animations: 'disabled', path: `${output}/${viewport.width}-${route === '/' ? 'home' : route.slice(1).replaceAll('/', '-')}.png` });
      for (let index = 0; index < count; index++) {
        const control = page.locator('.agency-annotation-controls').nth(index);
        const button = control.getByRole('button');
        await button.scrollIntoViewIfNeeded();
        await page.screenshot({ animations: 'disabled', path: `${output}/${viewport.width}-${route === '/' ? 'home' : route.slice(1).replaceAll('/', '-')}-target-${index + 1}.png` });
        await button.click();
        await control.getByText('Request accepted. Review and send your comment in the browser.').waitFor();
        assert.equal(await page.evaluate(() => window.annotationFixtureCalls.length), index + 1);
        assert.ok(await button.evaluate(el => el.getBoundingClientRect().height >= 44));
      }
      await page.evaluate(() => { window.annotationFixtureAccepted = false; });
      const first = page.locator('.agency-annotation-controls').first();
      await first.getByRole('button').click();
      await first.getByText('Request unavailable. You can still read this section.').waitFor();
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), route + ' mobile overflow');
      // Question controls survive narrative scene replacement without duplication.
      const tabs = page.locator('main [role="tab"]');
      if (await tabs.count() > 1) {
        await tabs.nth(1).click();
        assert.equal(await page.locator('.agency-annotation-button').count(), count);
        await tabs.first().click();
      }
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
