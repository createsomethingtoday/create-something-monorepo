import test from 'node:test';
import assert from 'node:assert/strict';
import { catalogUrl } from '../lib/catalog';
import { normalizeTemplateSort } from '../lib/templateRoute';
import { safeMarketplaceUrl, safePreviewUrl, safeImageUrl } from '../lib/templateUrlSafety';
test('catalog proxy preserves supported filters and bounds pagination', () => {
  const u = catalogUrl(
    new URLSearchParams(
      'q=portfolio&styles=minimal-websites&styles=modern&types=Multi+Page&page_size=900&page=-2&admin=true&url=https://evil.test'
    )
  );
  assert.equal(u.hostname, 'templates.webflow.com');
  assert.equal(u.searchParams.get('q'), 'portfolio');
  assert.deepEqual(u.searchParams.getAll('styles'), ['minimal-websites', 'modern']);
  assert.equal(u.searchParams.get('page_size'), '48');
  assert.equal(u.searchParams.get('page'), '1');
  assert.equal(u.searchParams.has('admin'), false);
  assert.equal(u.searchParams.has('url'), false);
});
test('invalid numeric values normalize to finite page sizes', () => {
  const u = catalogUrl(new URLSearchParams('page=Infinity&page_size=abc'));
  assert.equal(u.searchParams.get('page'), '1');
  assert.equal(u.searchParams.get('page_size'), '12');
});
test('existing Marketplace sort contract normalizes aliases', () => {
  assert.equal(normalizeTemplateSort('price-asc'), 'price_asc');
  assert.equal(normalizeTemplateSort('approval-date-desc'), 'newest');
  assert.equal(normalizeTemplateSort('bad'), 'popular');
});
test('catalog links cannot execute code or redirect to arbitrary hosts', () => {
  assert.equal(safeMarketplaceUrl('javascript:alert(1)'), null);
  assert.equal(safeMarketplaceUrl('https://webflow.com.evil.test'), null);
  assert.equal(safePreviewUrl('https://example.com', null), null);
  assert.equal(safeImageUrl('data:text/html,test'), null);
  assert.equal(
    safePreviewUrl('https://fleet-template.webflow.io/', null),
    'https://fleet-template.webflow.io/'
  );
});

test('details use exact template slug rather than a fuzzy name search', () => {
  const u = catalogUrl(new URLSearchParams('template_slug=fleet-website-template&page_size=1'));
  assert.equal(u.searchParams.get('template_slug'), 'fleet-website-template');
  assert.equal(u.searchParams.has('q'), false);
});
