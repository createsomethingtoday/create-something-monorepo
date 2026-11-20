// Prepend globalThis.OPENAI_DOTS_REVIEW = { taskSpaceId, pageId, baseURL }.
// The parent owns the browser task space and its lifetime.
const assert = (await import('node:assert/strict')).default;
const config = globalThis.OPENAI_DOTS_REVIEW;
assert.ok(config?.taskSpaceId && config.pageId && config.baseURL, 'Review configuration required.');
const task = await taskSpace(config.taskSpaceId);
const page = task.page(config.pageId);
await page.cdp('Emulation.setDeviceMetricsOverride', {
  width: 768,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false
});
await page.goto(`${config.baseURL}/openai-dots?search-motion-review=${Date.now()}`);
await page.waitForSelector('.openai-dots[data-dots-motion="on"]');
await page.click('button[aria-label="Open search"]', { label: 'Open the Agency search' });
await page.waitForSelector('[role="dialog"][aria-label="Unified search"]');
await page.waitForSelector('.openai-dots[data-dots-motion="paused"]');
assert.equal(
  await page.evaluate(() => document.querySelector('.openai-dots .replay').hidden),
  true
);
await page.click('.agency-search header button', { label: 'Close the Agency search' });
await page.waitForFunction(
  () => !document.querySelector('[role="dialog"][aria-label="Unified search"]')
);
await page.waitForSelector('.openai-dots[data-dots-motion="on"]');
assert.equal(
  await page.evaluate(() => document.querySelector('.openai-dots .replay').hidden),
  false
);
console.log('PASS: search pauses dots motion; closing it resumes the shared motion policy.');
