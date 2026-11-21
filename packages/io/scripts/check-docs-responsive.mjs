/** Run against local IO with IO_BASE_URL and, for hybrid asset mapping, IO_WEBFLOW_ASSET_DIR. */
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
const moduleUrl = process.env.PLAYWRIGHT_MODULE ?? new URL('../../../node_modules/.pnpm/node_modules/playwright/index.mjs', import.meta.url).href;
const { chromium } = await import(moduleUrl);
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });
const base = process.env.IO_BASE_URL ?? 'http://127.0.0.1:4941';
const output = process.env.IO_SCREENSHOT_DIR ?? '/tmp/io-docs-responsive';
await mkdir(output, { recursive: true });
try {
  for (const javascript of [true, false]) {
    const page = await browser.newPage({ javaScriptEnabled: javascript, reducedMotion: 'reduce' });
    const assets = process.env.IO_WEBFLOW_ASSET_DIR;
    if (assets) {
      for (const file of ['fonts/switzer.woff2', 'fonts/stix-two-text.ttf', 'images/reference-index-640.webp', 'images/reference-index-1280.webp']) {
        await page.route('**/' + file, route => route.fulfill({ path: join(assets, file), contentType: file.endsWith('.webp') ? 'image/webp' : file.endsWith('.woff2') ? 'font/woff2' : 'font/ttf' }));
      }
    }
    for (const width of javascript ? [320, 390, 768, 1024, 1025, 1440] : [320]) {
      await page.setViewportSize({ width, height: 950 });
      await page.goto(new URL('/docs', base).href, { waitUntil: 'domcontentloaded' });
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all([...document.querySelectorAll('.io-journal-opening img')].map(image => image.decode().catch(() => {})));
      });
      const result = await page.evaluate(() => {
        const heading = document.querySelector('h1');
        const range = new Range();
        range.selectNodeContents(heading);
        return {
          viewport: innerWidth,
          headingLines: range.getClientRects().length,
          cards: [...document.querySelectorAll('.tool-card')].map(card => ({ left: card.getBoundingClientRect().left, right: card.getBoundingClientRect().right })),
          commands: [...document.querySelectorAll('.install-option pre')].map(pre => ({ width: pre.clientWidth, scroll: pre.scrollWidth }))
        };
      });
      const png = await page.screenshot({ path: join(output, `docs-${width}-${javascript ? 'js' : 'no-js'}.png`), fullPage: true });
      // scrollWidth alone misses overflowing cards when an ancestor clips the page.
      assert.equal(png.readUInt32BE(16), width, `Full screenshot expands beyond ${width}px`);
      assert.equal(result.headingLines, 1, `Documentation breaks midword at ${width}px`);
      assert(result.cards.every(card => card.left >= 0 && card.right <= width + 1), `Card exceeds ${width}px viewport`);
      assert(result.commands.every(command => command.scroll <= command.width), `Install command clips at ${width}px`);
      console.log(`PASS docs ${width}px ${javascript ? 'JS' : 'no-JS'}: screenshot width, full heading, bounded cards and readable commands`);
    }
    await page.close();
  }
} finally {
  await browser.close();
}
