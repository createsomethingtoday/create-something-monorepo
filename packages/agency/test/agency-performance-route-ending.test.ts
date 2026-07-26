import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

import { usesRouteOwnedAgencyPerformanceEnding } from '../src/lib/atlas/surface-policy.ts';

const read = (relativePath: string) => {
  const url = new URL(relativePath, import.meta.url);
  return existsSync(url) ? readFileSync(url, 'utf8') : '';
};

const layout = read('../src/routes/+layout.svelte');
const stack = read('../src/routes/stack/+page.svelte');
const fieldReports = read('../src/routes/field-reports/+page.svelte');

test('route-owned Performance endings replace the generic handoff on primary decision routes', () => {
  for (const pathname of ['/', '/services', '/products', '/stack', '/field-reports']) {
    assert.equal(usesRouteOwnedAgencyPerformanceEnding(pathname), true, pathname);
  }

  assert.equal(usesRouteOwnedAgencyPerformanceEnding('/stack/?source=nav'), true);
  assert.equal(usesRouteOwnedAgencyPerformanceEnding('/field-reports#reports'), true);
  assert.equal(usesRouteOwnedAgencyPerformanceEnding('/about'), false);

  assert.match(stack, /<PerformanceConversionHandoff/);
  assert.match(fieldReports, /<PerformanceConversionHandoff/);
  assert.match(layout, /usesRouteOwnedAgencyPerformanceEnding\(\$page\.url\.pathname\)/);
  assert.match(layout, /!routeOwnsPerformanceEnding/);
});
