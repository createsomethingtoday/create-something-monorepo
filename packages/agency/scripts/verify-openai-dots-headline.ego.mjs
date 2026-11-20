// Parent owns the task space. Prepend globalThis.OPENAI_DOTS_REVIEW with
// { taskSpaceId, pageId, baseURL } before running through ego-browser nodejs.
const assert = (await import('node:assert/strict')).default;
const config = globalThis.OPENAI_DOTS_REVIEW;
assert.ok(config?.taskSpaceId && config.pageId && config.baseURL, 'Review configuration required.');
const task = await taskSpace(config.taskSpaceId);
const page = task.page(config.pageId);
for (const width of [320, 390, 768, 1024, 1025, 1440]) {
  await page.cdp('Emulation.setDeviceMetricsOverride', {
    width,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false
  });
  await page.goto(`${config.baseURL}/openai-dots?headline-review=${Date.now()}-${width}`);
  await page.waitForSelector('[data-dial-ready="true"]');
  const geometry = await page.evaluate(() => {
    const h = document.querySelector('.hero h1');
    const walker = document.createTreeWalker(h, NodeFilter.SHOW_TEXT);
    let text;
    while (walker.nextNode()) {
      if (walker.currentNode.textContent.includes('more room')) {
        text = walker.currentNode;
        break;
      }
    }
    const range = document.createRange();
    range.selectNodeContents(text);
    const line = range.getBoundingClientRect();
    const period = h.querySelector('.title-period').getBoundingClientRect();
    return {
      line: line.top,
      period: period.top,
      lineHeight: parseFloat(getComputedStyle(h).lineHeight),
      overflow: document.documentElement.scrollWidth > innerWidth,
      rulerOverflow: [...document.querySelectorAll('.chapter-dial a')].some(
        (a) => a.scrollWidth > a.clientWidth + 1
      )
    };
  });
  assert.ok(
    Math.abs(geometry.line - geometry.period) < geometry.lineHeight / 2,
    `orphan period at ${width}px`
  );
  assert.equal(geometry.overflow, false, `horizontal overflow at ${width}px`);
  assert.equal(geometry.rulerOverflow, false, `ruler label overflow at ${width}px`);
}
console.log('PASS: headline punctuation and ruler labels fit at six supported widths.');
