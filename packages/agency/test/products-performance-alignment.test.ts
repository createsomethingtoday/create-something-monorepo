import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { usesRouteOwnedAgencyPerformanceEnding } from '../src/lib/atlas/surface-policy.ts';

const read = (relativePath: string) => {
  const url = new URL(relativePath, import.meta.url);
  return existsSync(url) ? readFileSync(url, 'utf8') : '';
};

const products = read('../src/routes/products/+page.svelte');
const layout = read('../src/routes/+layout.svelte');

test('products keeps Map, Build, and Control as the only commercial path', () => {
  assert.doesNotMatch(products, /Map -> Build -> Control/);
  assert.match(products, /title="Choose where the workflow is now\."/);
  assert.match(products, /id: 'map'/);
  assert.match(products, /id: 'build'/);
  assert.match(products, /id: 'control'/);
  assert.doesNotMatch(products, /id: 'proof'/);
});

test('products separates open proof from the product chooser', () => {
  assert.match(products, /class="product-proof-shelf"/);
  assert.match(products, /Technical proof/);
  assert.match(products, /featured\.map\(productCard\)/);
  assert.match(products, /Ground and the\s+Loom archive/);
});

test('products places truthful buyer proof beside the choice without a duplicate route handoff', () => {
  assert.match(products, /AgencyPerformanceReadback embedded=\{true\}/);
  assert.match(layout, /!routeOwnsPerformanceEnding/);
  assert.equal(usesRouteOwnedAgencyPerformanceEnding('/products'), true);
});

test('products removes the fixed mode control from the CTA-heavy route', () => {
  assert.match(layout, /!routeOwnsPerformanceEnding/);
  assert.equal(usesRouteOwnedAgencyPerformanceEnding('/products'), true);
});
