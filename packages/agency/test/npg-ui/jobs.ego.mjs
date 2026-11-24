// Run with the local fixture server: ego-browser nodejs < test/npg-ui/jobs.ego.mjs
// Uses only synthetic public jobs and the exact built production React bundle.
const task = await taskSpace('NPG Jobs regression');
const page = task.page('p1');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
await page.goto('http://127.0.0.1:4227/?state=&__reset=1');
await page.click('button:has-text("Jobs")');
await page.waitForFunction(() => document.body.innerText.includes('Synthetic Health Texas'));
assert(await page.evaluate(() => document.querySelectorAll('[aria-label="Public job openings"] a').length === 2), 'two fixture source links');
await page.fill('input[type="search"]', 'Behavioral');
await page.press('input[type="search"]', 'Enter');
await page.waitForFunction(() => document.body.innerText.includes('Source observations are stale'));
assert(await page.evaluate(() => !document.body.innerText.includes('Synthetic Health Texas') && document.body.innerText.includes('Stale: verify availability')), 'search filters list and stale labels');
await page.fill('input[type="search"]', 'no-such-role');
await page.press('input[type="search"]', 'Enter');
await page.waitForFunction(() => document.body.innerText.includes('No openings match these filters'));
await page.click('button:has-text("Clear filters")');
await page.waitForFunction(() => document.body.innerText.includes('Synthetic Health Texas'));
for (const width of [320, 390, 768, 1024, 1440]) {
  await page.cdp('Emulation.setDeviceMetricsOverride', { width, height:900, deviceScaleFactor:1, mobile:width < 768 });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `no horizontal overflow at ${width}`);
}
console.log({passed:true,scope:'synthetic exact bundle; search, stale, empty, reset and responsive overflow'});
await task.finish({keep:[]});
