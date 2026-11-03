import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const origin = process.env.AGENCY_BASE_URL ?? 'http://127.0.0.1:4186';
const evidence = process.env.AGENCY_EVIDENCE_DIR ?? '/tmp/agency-public-system';
const extra = ['/privacy', '/terms', '/arcs', '/experiments', '/ai-workflow-control', '/ai-workflow-recovery', '/marketplace-review-automation'];
const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}) });
await mkdir(evidence, { recursive: true });
const context = await browser.newContext();
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push({ url: page.url(), message: error.message }));
const results = [];
try {
  const sitemap = await (await context.request.get(`${origin}/sitemap.xml`)).text();
  const routes = [...new Set([...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => new URL(match[1]).pathname).concat(extra))];
  assert.ok(routes.includes('/scopefield'), 'The reconciled production sitemap retains Scopefield');
  for (const [index, route] of routes.entries()) {
    await page.setViewportSize({ width: 1440, height: 1000 });
    const response = await page.goto(origin + route, { waitUntil: 'load' });
    await page.waitForFunction(() => location.pathname === '/' ? !!document.querySelector('[data-home-step]:not([disabled])') : document.body.classList.contains('design-preview'), undefined, { timeout: 10000 });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      await Promise.all([...document.images].filter(image => { const rect = image.getBoundingClientRect(); return rect.width && rect.top < innerHeight && rect.bottom > 0; }).map(image => image.decode().catch(() => {})));
    });
    const result = { route, status: response?.status(), widths: [] };
    assert.equal(result.status, 200, `${route} loads`);
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      const geometry = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, heading: [...document.querySelectorAll('h1')].filter(heading => heading.getBoundingClientRect().width).map(heading => heading.textContent.trim()), brokenOpeningImages: [...document.querySelectorAll('main img')].filter(image => { const rect = image.getBoundingClientRect(); return rect.width && rect.top < innerHeight && rect.bottom > 0 && image.complete && !image.naturalWidth; }).map(image => image.getAttribute('src')) }));
      result.widths.push(geometry);
      if (width !== 320) await page.screenshot({ path: `${evidence}/${String(index + 1).padStart(2, '0')}-${route.slice(1).replaceAll('/', '-') || 'home'}-${width}.png` });
    }
    results.push(result);
    await writeFile(`${evidence}/results.json`, JSON.stringify({ origin, results, errors }, null, 2));
    console.log(JSON.stringify({ route, status: result.status, overflow: result.widths.filter(result => result.scrollWidth > result.width).map(result => result.width), broken: result.widths.flatMap(result => result.brokenOpeningImages) }));
  }
  const overflows = results.flatMap(result => result.widths.filter(width => width.scrollWidth > width.width).map(width => ({ route: result.route, ...width })));
  const broken = results.flatMap(result => result.widths.flatMap(width => width.brokenOpeningImages.map(src => ({ route: result.route, src }))));
  assert.deepEqual(overflows, [], 'All public pages fit desktop and phone widths');
  assert.deepEqual(broken, [], 'All opening images load');
  assert.deepEqual(errors, [], 'No application JavaScript errors');
  console.log(JSON.stringify({ passed: true, pages: results.length, widths: [1440, 390, 320], evidence }));
} finally {
  await browser.close();
}
