import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

import { marketingPagePortfolio } from '../src/lib/data/marketingPages.ts';
import { usesRouteOwnedAgencyPerformanceEnding } from '../src/lib/atlas/surface-policy.ts';

const read = (relativePath: string) => {
  const url = new URL(relativePath, import.meta.url);
  return existsSync(url) ? readFileSync(url, 'utf8') : '';
};

const layout = read('../src/routes/+layout.svelte');
const stack = read('../src/routes/stack/+page.svelte');
const fieldReports = read('../src/routes/field-reports/+page.svelte');

const routeSource = (pathname: string) =>
  read(`../src/routes${pathname === '/' ? '' : pathname}/+page.svelte`);

test('route-owned Performance endings replace the generic handoff on primary decision routes', () => {
  for (const pathname of ['/', '/services', '/products', '/stack', '/field-reports']) {
    assert.equal(usesRouteOwnedAgencyPerformanceEnding(pathname), true, pathname);
  }

  assert.equal(usesRouteOwnedAgencyPerformanceEnding('/stack/?source=nav'), true);
  assert.equal(usesRouteOwnedAgencyPerformanceEnding('/field-reports#reports'), true);
  assert.equal(usesRouteOwnedAgencyPerformanceEnding('/about'), true);

  assert.match(stack, /<PerformanceConversionHandoff/);
  assert.match(fieldReports, /<PerformanceConversionHandoff/);
  assert.match(layout, /usesRouteOwnedAgencyPerformanceEnding\(\$page\.url\.pathname\)/);
  assert.match(layout, /!routeOwnsPerformanceEnding/);
});

test('every active marketing route receives exactly one route-owned or shared conversion ending', () => {
  const activeRoutes = marketingPagePortfolio.filter((entry) => entry.decision !== 'archive');
  const sharedFallbackRoutes = ['/basketball-systems-lab'];

  for (const entry of activeRoutes) {
    const source = routeSource(entry.path);
    const declaresConversionHandoff = /<PerformanceConversionHandoff\b/.test(source);
    const delegatesToGovernanceProduct = /<GovernanceProductPage\b/.test(source);
    const ownsEnding = usesRouteOwnedAgencyPerformanceEnding(entry.path);

    if (declaresConversionHandoff || delegatesToGovernanceProduct) {
      assert.equal(ownsEnding, true, `${entry.path} already renders a conversion handoff`);
    }

    assert.equal(
      ownsEnding,
      !sharedFallbackRoutes.includes(entry.path),
      `${entry.path} should receive exactly one ending`
    );
  }
});
