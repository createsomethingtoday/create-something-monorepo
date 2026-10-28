// Retained command name for existing runbooks; verifies the current static journey.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const baseURL = process.env.AGENCY_PREVIEW_URL || 'http://127.0.0.1:4186';
const output = process.env.PILOT_EVIDENCE_DIR || 'preview/interaction-pilot/evidence';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
const results = [];
const pageErrors = [];
async function createPage(options = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', ...options });
  await context.route('**/*', route => new URL(route.request().url()).origin === new URL(baseURL).origin ? route.continue() : route.abort());
  const page = await context.newPage();
  page.on('pageerror', error => pageErrors.push(error.message));
  return { page, context };
}
function pilotURL(hash = '') {
  const url = new URL(baseURL);
  url.searchParams.set('pilot', 'synthetic');
  url.hash = hash;
  return url.href;
}
async function start(page, hash = '') {
  await page.goto(pilotURL(hash), { waitUntil: 'networkidle' });
  const consent = page.getByRole('button', { name: 'Necessary only', exact: true });
  if (await consent.isVisible()) await consent.click();
  await page.locator('#service-journey-title').waitFor();
}
async function assertJourneyViewport(page) {
  await page.waitForFunction(() => {
    const r = document.getElementById('service-journey-title').getBoundingClientRect();
    const nav = document.querySelector('.nav-fixed')?.getBoundingClientRect();
    return r.top >= (nav?.bottom ?? 0) && r.top < innerHeight;
  });
}
try {
  for (const width of [1440, 390, 320]) {
    const { page, context } = await createPage({ viewport: { width, height: width === 1440 ? 1000 : 844 } });
    await start(page);
    const journey = page.locator('.service-journey');
    assert.equal(await journey.locator(':scope > figure > ol > li').count(), 3);
    assert.match(await journey.innerText(), /Confirm the deliverable, price, capacity and acceptance checks before payment/);
    assert.match(await journey.innerText(), /Keep the instructions and recovery checks/);
    const support = journey.getByRole('link', { name: 'Read the process and support scope' });
    assert.equal(await support.getAttribute('href'), '/services');
    await support.focus();
    assert.notEqual(await support.evaluate(el => getComputedStyle(el).outlineStyle), 'none');
    assert.ok((await support.boundingBox()).height >= 44);
    await page.keyboard.press('Enter');
    await page.waitForURL('**/services');
    await page.goBack();
    await journey.waitFor();
    await journey.scrollIntoViewIfNeeded();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `no overflow ${width}`);
    assert.equal(await journey.evaluate(el => el.getAnimations({ subtree: true }).filter(a => a.playState === 'running').length), 0);
    await page.screenshot({ path: `${output}/journey-${width}.png` });
    results.push({ test: 'static journey, commercial boundaries, keyboard support link, Back, reduced motion, geometry', width, pass: true });
    await context.close();
  }
  {
    const { page, context } = await createPage();
    for (const hash of ['#sample-handoff', '#handoff-example-check-detail', '#handoff-example-approval', '#handoff-example-handoff-record']) {
      await start(page, hash);
      await assertJourneyViewport(page);
      await page.reload({ waitUntil: 'networkidle' });
      await assertJourneyViewport(page);
    }
    await page.evaluate(() => { location.hash = '#handoff-example-problem'; });
    await assertJourneyViewport(page);
    await page.goBack();
    await assertJourneyViewport(page);
    results.push({ test: 'retired journey bookmarks, reload and history land on current explanation', pass: true });
    await context.close();
  }
  {
    const { page, context } = await createPage({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    await page.goto(baseURL, { waitUntil: 'networkidle' });
    assert.equal(await page.locator('.service-journey > figure > ol > li:visible').count(), 3);
    assert.match(await page.locator('.service-journey').innerText(), /production incident response require separate agreements/);
    await page.locator('.service-journey').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${output}/journey-no-js.png` });
    results.push({ test: 'SSR/no-JavaScript complete service explanation', pass: true });
    await context.close();
  }
} finally {
  await writeFile(`${output}/browser-results.json`, JSON.stringify({ baseURL, completedAt: new Date().toISOString(), results, pageErrors }, null, 2));
  await browser.close();
}
assert.deepEqual(pageErrors, [], 'no uncaught browser errors');
console.log(JSON.stringify(results, null, 2));
