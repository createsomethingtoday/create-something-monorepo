import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const base = process.env.AGENCY_PREVIEW_URL || 'http://127.0.0.1:4186';
const output = process.env.PILOT_REVIEW_DIR;
assert.ok(output, 'PILOT_REVIEW_DIR is required');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
try {
  const context = await browser.newContext({ javaScriptEnabled: false });
  await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
  const page = await context.newPage();
  await page.goto(base, { waitUntil: 'networkidle' });
  const snapshot = await page.evaluate(() => {
    const section = document.querySelector('.service-journey').cloneNode(true);
    section.querySelectorAll('a:not([href^="#"])').forEach(link => link.replaceWith(document.createTextNode(link.textContent)));
    const css = [...document.styleSheets].flatMap(sheet => { try { return [...sheet.cssRules].map(rule => rule.cssText); } catch { return []; } }).join('\n');
    return { markup: section.outerHTML, css, bodyClass: document.body.className, htmlClass: document.documentElement.className };
  });
  const liveContext = await browser.newContext();
  await liveContext.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
  const live = await liveContext.newPage();
  await live.goto(base, { waitUntil: 'networkidle' });
  await live.locator('[data-journey].enhanced').waitFor();
  const consent = live.getByRole('button', { name: 'Necessary only', exact: true });
  if (await consent.isVisible()) await consent.click();
  await live.locator('#sample-destination').selectOption('queue');
  await live.getByRole('checkbox', { name: /reviewed this fictional/ }).check();
  await live.getByRole('button', { name: 'Create sample handoff', exact: true }).click();
  const receipt = await live.locator('.service-journey').evaluate(root => {
    const wrapper = root.cloneNode(false);
    const sample = root.querySelector('.sample').cloneNode(true);
    sample.querySelectorAll('button').forEach(button => button.remove());
    sample.querySelector('#sample-handoff').id = 'sample-handoff-complete';
    sample.setAttribute('aria-labelledby', 'sample-handoff-complete');
    wrapper.append(sample);
    return wrapper.outerHTML;
  });
  // Inline the rendered style contract; the static reading copy has no network assets.
  const css = snapshot.css.replace(/@import[^;]+;/g, '').replace(/url\([^)]*\)/g, 'none').replaceAll('</style', '<\\/style');
  const html = `<!doctype html><html lang="en" class="${snapshot.htmlClass}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'"><title>Agency Canon journey — static review</title><style>${css}\nbody{margin:0;background:#090909;color:#eee;font-family:Arial,sans-serif}.review-note{padding:24px 7vw;border-bottom:1px solid #444;font:16px/1.6 Arial,sans-serif}.review-note h1{font-size:24px}.review-note p{max-width:75ch}*{animation:none!important;transition:none!important}</style></head><body class="${snapshot.bodyClass}"><aside class="review-note"><h1>Agency Canon journey — static review</h1><p>Reading copy of the actual pilot markup, Canon styles and existing isometric assets. All four records are expanded. Network font files are omitted, so this copy uses fallback typography; review final type rendering in the live local preview. The links below jump within this document. Search, browser history and local sample creation are demonstrated in the live local pilot, not simulated here.</p><p>Review the sequence, hierarchy, language, retained workflow context and the distinction between illustrative checks and real results. No systems are connected and no messages or bookings can be made.</p></aside><main class="property-performance">${snapshot.markup}<aside class="review-note"><h2>Completed local sample</h2><p>The actual completion state, captured with the fictional Review queue choice. Nothing was sent or booked.</p></aside>${receipt}</main></body></html>`;
  assert.ok(!/<script\b/i.test(html));
  assert.ok(!/\b(?:src|href)=["'](?:https?:|\/)/i.test(html));
  await writeFile(`${output}/Agency-Canon-Static-Review.html`, html);
  await page.setContent(html);
  assert.equal(await page.locator('[data-journey] .panels > section:visible').count(), 4);
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  }
  if (process.env.PILOT_STATIC_SCREENSHOT) {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({ path: process.env.PILOT_STATIC_SCREENSHOT });
  }
  console.log(JSON.stringify({ file: `${output}/Agency-Canon-Static-Review.html`, bytes: Buffer.byteLength(html), allRecordsVisible: true, widths: [1440,390,320], externalAssets: false }));
} finally { await browser.close(); }
