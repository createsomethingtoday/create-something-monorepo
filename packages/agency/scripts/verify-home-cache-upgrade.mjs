import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const base = process.env.AGENCY_BASE_URL ?? 'http://127.0.0.1:4186';
// Model an existing visitor's still-fresh response for the former stylesheet URL.
const oldResponse = await fetch('https://0f49f1db.create-something-agency.pages.dev/styles/agency/home.css');
assert.equal(oldResponse.status, 200);
const oldCss = await oldResponse.text();
const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}) });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.route('**/styles/agency/home.css', route => route.fulfill({ contentType: 'text/css', body: oldCss }));
  await page.goto(base, { waitUntil: 'networkidle' });
  const position = await page.locator('.agency-home .hero > img').evaluate(image => getComputedStyle(image).position);
  assert.equal(position, 'absolute', 'The current hero must keep its composition when the old stylesheet URL is cached');
  assert.match(await page.locator('link[rel="stylesheet"][href*="styles/agency/home.css"]').getAttribute('href'), /\?v=/, 'The redesigned stylesheet needs a distinct cache key');
  console.log(JSON.stringify({ passed: true, base, staleStylesheetFixture: 'previous production deployment', heroImagePosition: position }));
} finally {
  await browser.close();
}
