import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import test from 'node:test';

const routeSource = readFileSync('src/routes/client-service/+page.svelte', 'utf8');
const layoutSource = readFileSync('src/routes/+layout.svelte', 'utf8');
const appTemplateSource = readFileSync('src/app.html', 'utf8');
const seoSource = readFileSync('src/lib/site/seo.ts', 'utf8');

test('the NPG client-service instance owns its mark, browser icon, and webclip', () => {
  assert.match(routeSource, /\/npg-client-service\/logo-mark\.png/);
  assert.doesNotMatch(routeSource, /\/npg-client-service\/[^'"\s]+\.svg/);
  assert.doesNotMatch(layoutSource, /\/npg-client-service\/[^'"\s]+\.svg/);
  assert.match(layoutSource, /\/npg-client-service\/apple-touch-icon\.png/);
  assert.match(layoutSource, /\/npg-client-service\/site\.webmanifest/);
  assert.match(layoutSource, /data\.currentPath === '\/client-service'/);
  assert.match(layoutSource, /NPG Client Service/);
  assert.match(layoutSource, /NPG Client Service: back to Abundance Staffing/);
  assert.match(layoutSource, /webflow-logo-context">Back to Abundance/);

  for (const asset of [
    'static/npg-client-service/logo-mark.png',
    'static/npg-client-service/favicon-32.png',
    'static/npg-client-service/icon-192.png',
    'static/npg-client-service/icon-512.png',
    'static/npg-client-service/apple-touch-icon.png',
    'static/npg-client-service/site.webmanifest'
  ]) {
    assert.equal(existsSync(asset), true, `Expected ${asset}`);
    assert.ok(statSync(asset).size > 0, `Expected ${asset} to be non-empty`);
  }
});

test('the shared navigation and browser identity use matching raster Abundance assets', () => {
  assert.match(layoutSource, /\/abundance\/logo-mark\.png/);
  assert.match(layoutSource, /\/abundance\/favicon-32\.png/);
  assert.match(layoutSource, /\/abundance\/apple-touch-icon\.png/);
  assert.match(layoutSource, /\/abundance\/site\.webmanifest/);
  assert.match(seoSource, /\/abundance\/logo-mark\.png/);
  assert.doesNotMatch(layoutSource, /logo-mark\.svg/);
  assert.doesNotMatch(seoSource, /logo-mark\.svg/);
  assert.doesNotMatch(appTemplateSource, /rel="icon"/);

  for (const asset of [
    'static/abundance/logo-mark.png',
    'static/abundance/favicon-32.png',
    'static/abundance/icon-192.png',
    'static/abundance/icon-512.png',
    'static/abundance/apple-touch-icon.png',
    'static/abundance/site.webmanifest'
  ]) {
    assert.equal(existsSync(asset), true, `Expected ${asset}`);
    assert.ok(statSync(asset).size > 0, `Expected ${asset} to be non-empty`);
  }
});
