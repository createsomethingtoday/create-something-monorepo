import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import test from 'node:test';

const routeSource = readFileSync('src/routes/client-service/+page.svelte', 'utf8');
const layoutSource = readFileSync('src/routes/+layout.svelte', 'utf8');

test('the NPG client-service instance owns its mark, browser icon, and webclip', () => {
  assert.match(routeSource, /\/npg-client-service\/logo-mark\.svg/);
  assert.match(routeSource, /rel="apple-touch-icon"/);
  assert.match(routeSource, /\/npg-client-service\/site\.webmanifest/);
  assert.match(layoutSource, /data\.currentPath === '\/client-service'/);
  assert.match(layoutSource, /NPG Client Service/);

  for (const asset of [
    'static/npg-client-service/logo-mark.svg',
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
