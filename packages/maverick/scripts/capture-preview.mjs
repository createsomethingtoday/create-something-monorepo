import { chromium } from '../../../node_modules/.pnpm/node_modules/playwright/index.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
const [origin, out] = process.argv.slice(2);
if (!origin || !out) throw Error('Pass origin and evidence directory');
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const results = [];
for (const viewport of [
  { width: 1440, height: 1000 },
  { width: 390, height: 844 }
]) {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
  const page = await context.newPage();
  for (const path of [
    '/',
    '/oil-gas',
    '/mining',
    '/about',
    '/news',
    '/technology',
    '/mission-vision',
    '/careers',
    '/water-treatment',
    '/privacy',
    '/terms'
  ]) {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const response = await page.goto(origin + path, { waitUntil: 'networkidle' });
    await page.screenshot({
      path: `${out}/${viewport.width}-${path.replaceAll('/', '') || 'home'}.png`,
      fullPage: true
    });
    results.push({
      viewport,
      path,
      url: page.url(),
      status: response.status(),
      title: await page.title(),
      text: await page.locator('body').innerText(),
      links: await page
        .locator('a')
        .evaluateAll((as) =>
          as.map((a) => ({ text: a.textContent.trim(), href: a.getAttribute('href') }))
        ),
      overflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      errors
    });
    page.removeAllListeners('pageerror');
  }
  await context.close();
}
writeFileSync(`${out}/routes.json`, JSON.stringify(results, null, 2));
await browser.close();
console.log(
  JSON.stringify(
    results.map(({ text, links, ...r }) => r),
    null,
    2
  )
);
