/** Runtime regression: the property switcher must not float over library content.
 * Start the built app, then run with LTD_BASE_URL and CHROME_EXECUTABLE_PATH.
 * Uses the repository's puppeteer-core dependency; installs no browser.
 */
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';

const executablePath = process.env.CHROME_EXECUTABLE_PATH;
assert.ok(executablePath, 'Set CHROME_EXECUTABLE_PATH to an installed Chromium binary');
const browser = await puppeteer.launch({ executablePath, headless: true });
try {
  for (const width of [320, 390, 768, 1024, 1025, 1440]) {
    const page = await browser.newPage();
    await page.setViewport({ width, height: 1000 });
    await page.goto(process.env.LTD_BASE_URL || 'http://127.0.0.1:5199', { waitUntil: 'networkidle0' });
    const state = await page.evaluate(() => {
      const switcher = document.querySelector('.mode-indicator');
      const library = document.querySelector('.open-shelf');
      const rect = switcher?.getBoundingClientRect();
      return {
        revision: library?.getAttribute('data-ltd-revision'),
        position: switcher && getComputedStyle(switcher).position,
        hidden: !rect?.width || !rect?.height,
        belowContent: rect && library && rect.top >= library.getBoundingClientRect().bottom,
        destinations: switcher?.querySelectorAll('a[href]').length,
        overflow: document.documentElement.scrollWidth > innerWidth
      };
    });
    assert.equal(state.revision, 'open-shelf-a-cre-2463-v1');
    assert.notEqual(state.position, 'fixed', `floating switcher at ${width}`);
    assert.ok(state.hidden || state.belowContent, `switcher overlaps the reading region at ${width}`);
    assert.ok(state.destinations >= 4, 'property destinations preserved');
    assert.equal(state.overflow, false, `horizontal overflow at ${width}`);
    console.log(`${width}: switcher hidden or reserved below content; destinations and layout intact`);
    await page.close();
  }
} finally {
  await browser.close();
}
