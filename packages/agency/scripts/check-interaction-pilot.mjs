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
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, ...options });
  await context.route('**/*', route => new URL(route.request().url()).origin === new URL(baseURL).origin ? route.continue() : route.abort());
  const page = await context.newPage();
  page.on('pageerror', error => pageErrors.push(error.message));
  return { page, context };
}
async function start(page, hash = '') {
  await page.goto(`${baseURL}/?pilot=synthetic${hash}`, { waitUntil: 'networkidle' });
  const consent = page.getByRole('button', { name: 'Necessary only', exact: true });
  if (await consent.isVisible()) await consent.click();
  await page.locator('[data-journey="handoff-example"].enhanced').waitFor();
  await page.locator('.service-journey').scrollIntoViewIfNeeded();
}
const selected = page => page.locator('[data-journey] nav a[aria-current="step"]');
const sample = page => page.locator('.service-journey .sample');
async function assertSelected(page, label) {
  await page.waitForFunction(label => document.querySelector('[data-journey] nav a[aria-current="step"]')?.textContent?.includes(label), label);
  assert.match(await selected(page).innerText(), new RegExp(label));
  assert.equal(await page.locator('[data-journey] .panels > section:visible').count(), 1);
}
try {
  for (const width of [1440, 390, 320]) {
    const { page, context } = await createPage({ viewport: { width, height: width === 1440 ? 1000 : 844 }, reducedMotion: 'reduce' });
    await start(page);
    await assertSelected(page, 'Problem');
    const nav = page.getByRole('navigation', { name: 'Inspect the service journey' });
    for (const label of ['Problem', 'Approval', 'Check', 'Handoff']) {
      const link = nav.getByRole('link', { name: new RegExp(label) });
      await link.focus(); await page.keyboard.press('Enter');
      await assertSelected(page, label);
      await page.waitForTimeout(180); // outlast existing layout hash-scroll delay
      assert.equal(await link.evaluate(el => el === document.activeElement), true);
      assert.ok(await link.evaluate(el => { const r = el.getBoundingClientRect(); const nav = document.querySelector('.nav-fixed')?.getBoundingClientRect(); return r.top >= (nav?.bottom ?? 0) && r.bottom <= innerHeight; }), 'focused stage clears fixed navigation');
      assert.notEqual(await link.evaluate(el => getComputedStyle(el).outlineStyle), 'none');
      const box = await link.boundingBox();
      assert.ok(box.x >= 0 && box.x + box.width <= width + 1 && box.height >= 44, `visible touch/focus target ${width} ${label}`);
      const inspect = page.locator(`#handoff-example-${label.toLowerCase()}-inspect`);
      await inspect.click();
      assert.equal(await page.locator(`#handoff-example-${label.toLowerCase()}-detail`).evaluate(el => el === document.activeElement), true);
      await page.keyboard.press('Escape');
      assert.equal(await inspect.evaluate(el => el === document.activeElement), true);
      assert.equal(await page.locator(`#handoff-example-${label.toLowerCase()}-record`).isVisible(), false);
    }
    // Progression moves focus across a tall mobile overview; require full vertical visibility.
    await nav.getByRole('link', { name: /Problem/ }).click();
    await page.locator('[data-journey] .progression').getByRole('button', { name: 'Approval →', exact: true }).focus();
    await page.keyboard.press('Enter');
    await assertSelected(page, 'Approval');
    const focused = await page.evaluate(() => { const r = document.activeElement.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, height: innerHeight }; });
    assert.ok(focused.top >= 0 && focused.bottom <= focused.height, `vertical focus visibility ${width}`);
    await nav.getByRole('link', { name: /Handoff/ }).click();
    await page.getByRole('link', { name: 'Prepare the sample handoff' }).click();
    await assertSelected(page, 'Handoff');
    await page.getByRole('button', { name: 'Create sample handoff', exact: true }).click();
    assert.match(await page.locator('#sample-error').innerText(), /Choose a destination/);
    assert.equal(await page.locator('#sample-destination').evaluate(el => el === document.activeElement), true);
    await page.locator('#sample-destination').selectOption('queue');
    await page.getByRole('button', { name: 'Create sample handoff', exact: true }).click();
    assert.match(await page.locator('#sample-error').innerText(), /Review/);
    await page.getByRole('checkbox', { name: /reviewed this fictional/ }).check();
    await page.getByRole('button', { name: 'Create sample handoff', exact: true }).click();
    await sample(page).locator('.receipt').waitFor();
    assert.match(await sample(page).innerText(), /Nothing was sent, changed or booked/);
    assert.match(await sample(page).innerText(), /Review queue/);
    await page.reload({ waitUntil: 'networkidle' });
    await sample(page).locator('.receipt').waitFor();
    await assertSelected(page, 'Handoff');
    assert.match(await sample(page).innerText(), /Restored/);
    await sample(page).scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${output}/journey-${width}-receipt.png` });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `no overflow ${width}`);
    assert.equal(await page.locator('[data-journey]').evaluate(el => el.getAnimations({ subtree: true }).filter(a => a.playState === 'running').length), 0);
    await page.getByRole('button', { name: 'Edit sample', exact: true }).click();
    assert.equal(await page.locator('#sample-destination').inputValue(), 'queue');
    assert.equal(await page.locator('#sample-destination').evaluate(el => el === document.activeElement), true);
    results.push({ test: 'keyboard, records, validation, completion, reload, edit, reduced motion, geometry', width, pass: true });
    await context.close();
  }
  {
    const { page, context } = await createPage({ reducedMotion: 'no-preference' });
    await page.addInitScript(() => {
      window.__routeSnapshots = 0;
      const start = document.startViewTransition?.bind(document);
      if (start) document.startViewTransition = (...args) => { window.__routeSnapshots++; return start(...args); };
    });
    await start(page);
    await page.locator('#handoff-example-problem-inspect').click();
    await page.goBack();
    await assertSelected(page, 'Problem');
    await page.waitForFunction(() => document.activeElement?.id === 'handoff-example-problem-control');
    await page.goto(`${baseURL}/?pilot=synthetic#handoff-example-approval-detail`, { waitUntil: 'networkidle' });
    await assertSelected(page, 'Approval');
    assert.equal(await page.locator('#handoff-example-approval-record').isVisible(), true);
    await page.locator('#handoff-example-check-control').click();
    await page.locator('#handoff-example-check-inspect').click();
    await page.goBack(); await assertSelected(page, 'Check');
    assert.equal(await page.locator('#handoff-example-check-record').isVisible(), false);
    await page.goBack(); await assertSelected(page, 'Approval');
    assert.equal(await page.locator('#handoff-example-approval-record').isVisible(), true);
    await page.goForward(); await assertSelected(page, 'Check');
    // Programmatic rapid activation exercises state interruption (not native focus).
    await page.evaluate(() => {
      for (const id of ['problem', 'approval', 'check', 'handoff']) document.getElementById(`handoff-example-${id}-control`).click();
    });
    await assertSelected(page, 'Handoff');
    await page.waitForFunction(() => !document.querySelector('[data-journey]').getAnimations({ subtree: true }).some(a => a.playState === 'running'), null, { timeout: 1000 });
    assert.equal(await page.locator('[data-journey]').evaluate(el => el.getAnimations({ subtree: true }).filter(a => a.playState === 'running').length), 0);
    assert.ok(page.url().includes('pilot=synthetic'));
    await page.locator('#handoff-example-handoff-inspect').click();
    await page.locator('[data-journey]').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${output}/journey-desktop-detail.png` });
    // Repeat early Back with cold and cached route data. No snapshot may delay commit.
    for (let attempt = 0; attempt < 3; attempt++) {
      await page.locator('.service-journey footer a').click();
      await page.waitForURL('**/services');
      // Back as soon as history changes, before waiting for destination render.
      await page.goBack();
      await assertSelected(page, 'Handoff');
      await page.locator('#handoff-example-handoff-record').waitFor({ state: 'visible' });
      await page.waitForTimeout(500); // ensure an older route cannot overwrite restored content
      await assertSelected(page, 'Handoff');
    }
    assert.equal(await page.evaluate(() => window.__routeSnapshots), 0);
    results.push({ test: 'deep link, Back/Forward, early Back, rapid interruption, idle animations', pass: true });
    await context.close();
  }
  {
    const { page, context } = await createPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await start(page);
    assert.equal(await page.locator('.mobile-search-button').count(), 0);
    const inlineSearch = page.locator('.service-journey header').getByRole('button', { name: 'Search public pages' });
    await inlineSearch.tap();
    await page.getByRole('heading', { name: 'Search Agency', exact: true }).waitFor();
    await page.locator('.agency-search').getByRole('button', { name: 'Close search', exact: true }).tap();
    await page.waitForFunction(() => document.activeElement?.textContent === 'Search public pages');
    await page.locator('#handoff-example-approval-control').tap();
    await assertSelected(page, 'Approval');
    await page.locator('#handoff-example-approval-inspect').tap();
    assert.equal(await page.locator('#handoff-example-approval-record').isVisible(), true);
    await page.locator('#handoff-example-handoff-control').tap();
    await page.getByRole('link', { name: 'Prepare the sample handoff' }).tap();
    await page.goBack(); await assertSelected(page, 'Handoff');
    await page.goForward(); await assertSelected(page, 'Handoff');
    await page.waitForFunction(() => document.activeElement?.id === 'sample-handoff');
    await page.setViewportSize({ width: 844, height: 390 });
    await assertSelected(page, 'Handoff');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    results.push({ test: 'mobile inline search, focus return, no floating overlap, touch and orientation', pass: true });
    await context.close();
  }
  {
    const { page, context } = await createPage({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    await page.goto(baseURL, { waitUntil: 'networkidle' });
    assert.equal(await page.locator('[data-journey] .panels > section:visible').count(), 4);
    assert.equal(await page.locator('[data-journey] .record:visible').count(), 4);
    assert.match(await sample(page).innerText(), /remain readable/);
    await page.locator('#handoff-example-problem').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${output}/journey-no-js.png` });
    results.push({ test: 'SSR/no-JavaScript full explanation', pass: true });
    await context.close();
  }
  {
    const { page, context } = await createPage();
    await page.addInitScript(() => {
      Storage.prototype.setItem = () => { throw new DOMException('Disabled', 'SecurityError'); };
    });
    await start(page, '#handoff-example-not-a-stage');
    await assertSelected(page, 'Problem');
    await page.locator('#sample-destination').selectOption('inbox');
    await page.getByRole('checkbox', { name: /reviewed this fictional/ }).check();
    await page.getByRole('button', { name: 'Create sample handoff', exact: true }).click();
    assert.match(await sample(page).innerText(), /storage is unavailable/);
    assert.match(await sample(page).innerText(), /Sample handoff ready/);
    results.push({ test: 'invalid fragment and blocked-storage completion', pass: true });
    await context.close();
  }
} finally {
  await writeFile(`${output}/browser-results.json`, JSON.stringify({ baseURL, completedAt: new Date().toISOString(), results, pageErrors }, null, 2));
  await browser.close();
}
assert.deepEqual(pageErrors, [], 'no uncaught browser errors');
console.log(JSON.stringify(results, null, 2));
