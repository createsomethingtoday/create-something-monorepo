import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const baseURL = process.env.AGENCY_PREVIEW_URL || 'http://127.0.0.1:4178';
const out = process.env.EVIDENCE_DIR || 'preview/project-handoff/evidence';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH,
  headless: true
});
const results = [];
for (const config of [
  { name: 'desktop', width: 1440, height: 1100 },
  { name: 'mobile', width: 390, height: 844 },
  { name: 'narrow', width: 320, height: 740 },
  { name: 'reduced', width: 1440, height: 1100, reducedMotion: 'reduce' },
  { name: 'nojs', width: 390, height: 844, javaScriptEnabled: false }
]) {
  const context = await browser.newContext({
    viewport: { width: config.width, height: config.height },
    reducedMotion: config.reducedMotion,
    javaScriptEnabled: config.javaScriptEnabled
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${baseURL}/products`, { waitUntil: 'networkidle' });
  const tour = page.locator('#cato-tour');
  for (const i of [1, 2, 0, 2, 1]) {
    const chapter = tour.locator('.chapters details').nth(i);
    await chapter.locator('summary').focus();
    await page.keyboard.press('Enter');
    assert.equal(await chapter.getAttribute('open'), '');
    assert.equal(await tour.locator('.chapters details[open]').count(), 1);
  }
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = 'auto';
    scrollTo(0, document.querySelector('#cato-tour').getBoundingClientRect().top + scrollY - 100);
  });
  await page.waitForTimeout(300);
  if (['desktop', 'mobile'].includes(config.name))
    await page.screenshot({ path: `${out}/tour-${config.name}.png`, fullPage: false });
  if (config.javaScriptEnabled !== false) {
    const recording = tour.locator('.recording');
    await recording.locator('summary').click();
    await recording.locator('video').evaluate((v) => v.play());
    await recording.locator('summary').click();
    await page.waitForTimeout(100);
    assert.equal(await recording.locator('video').evaluate((v) => v.paused), true);
  }
  await page.goto(`${baseURL}/stack`, { waitUntil: 'networkidle' });
  if (config.javaScriptEnabled !== false)
    await page.getByRole('tab', { name: /Ownership/ }).click();
  const handoff = page.locator('.handoff');
  await handoff.waitFor({ state: 'visible' });
  for (const i of [1, 2, 3, 0, 2]) {
    const file = handoff.locator('details').nth(i);
    await file.locator('summary').focus();
    await page.keyboard.press('Space');
    assert.equal(await file.getAttribute('open'), '');
    assert.equal(await handoff.locator('details[open]').count(), 1);
  }
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = 'auto';
    scrollTo(0, document.querySelector('.handoff').getBoundingClientRect().top + scrollY - 100);
  });
  await page.waitForTimeout(300);
  if (['desktop', 'mobile'].includes(config.name))
    await page.screenshot({ path: `${out}/handoff-${config.name}.png` });
  assert.equal(errors.length, 0, errors.join('\n'));
  results.push({
    mode: config.name,
    passed: true,
    checks: [
      'keyboard chapters',
      'exclusive open state',
      'repeat selection',
      'no horizontal overflow',
      'handoff sources visible',
      ...(config.javaScriptEnabled !== false ? ['closed recording paused'] : [])
    ]
  });
  await context.close();
}
{
  const page = await browser.newPage();
  await page.goto(`${baseURL}/`, { waitUntil: 'networkidle' });
  assert.equal(await page.locator('h1').innerText(), 'AI-native\nTechnical support');
  const cta = page.locator('.hero-actions .primary');
  assert.equal(
    await cta.getAttribute('href'),
    '/book?source=agency&intent=workflow-mapping&lane=workflow_infrastructure'
  );
  await cta.click();
  await page.waitForURL('**/book?**');
  assert.equal(new URL(page.url()).searchParams.get('lane'), 'workflow_infrastructure');
  results.push({
    mode: 'existing conversion',
    passed: true,
    checks: [
      'exact hero',
      'exact booking destination and attribution',
      'booking page opens; no form submitted'
    ]
  });
  await page.close();
}
await browser.close();
await writeFile(`${out}/browser-results.json`, JSON.stringify(results, null, 2));
console.log(JSON.stringify(results));
