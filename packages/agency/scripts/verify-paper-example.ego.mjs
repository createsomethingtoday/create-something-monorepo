// Run in a parent-owned Ego space; never creates or finishes one.
// globalThis.PAPER_RELEASE = {spaceId, baseURL, output};
import { verifyPaperDashboard } from './verify-paper-dashboard.browser.mjs';
const fs = await import('node:fs/promises');
const cfg = globalThis.PAPER_RELEASE;
if (!cfg || !Number.isInteger(cfg.spaceId) || !cfg.baseURL || !cfg.output)
  throw new Error(
    'Provide PAPER_RELEASE with existing spaceId, baseURL and absolute output directory'
  );
await fs.mkdir(cfg.output, { recursive: true });
const page = (await taskSpace(cfg.spaceId)).page('p1');
const reports = [];
await page.cdp('Network.enable');
await page.cdp('Network.setCacheDisabled', { cacheDisabled: true });
for (const width of [320, 390, 768, 1024, 1025, 1440]) {
  await page.cdp('Emulation.setDeviceMetricsOverride', {
    width,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false
  });
  await page.goto(cfg.baseURL + '/#paper-example-title');
  await page.waitForSelector('.paper-example.enhanced');
  await page.evaluate(() => document.fonts.ready.then(() => true));
  reports.push(await page.evaluate(verifyPaperDashboard));
  for (const stage of ['plan', 'test', 'run']) {
    await page.click(`.paper-example [data-select="${stage}"]`);
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 1000)));
    await page.evaluate(() =>
      window.scrollTo({
        top: scrollY + document.querySelector('.paper-example').getBoundingClientRect().top - 90,
        behavior: 'instant'
      })
    );
    await page.screenshot({ path: `${cfg.output}/${width}-${stage}.png` });
  }
}
await page.cdp('Emulation.setScriptExecutionDisabled', { value: true });
await page.goto(cfg.baseURL + '/#paper-example-title');
await page.screenshot({ path: `${cfg.output}/no-js.png` });
const staticText = await page.snapshot({ scope: 'full_page' });
reports.push({
  name: 'No-JS narrative',
  pass: staticText.includes('Agents') && staticText.includes('Talk through your project')
});
await page.cdp('Emulation.setScriptExecutionDisabled', { value: false });
await fs.writeFile(`${cfg.output}/report.json`, JSON.stringify(reports, null, 2));
console.log(
  JSON.stringify(
    reports.map((report) => ({ width: report.width, failures: report.failures, pass: report.pass }))
  )
);
