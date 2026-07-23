import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getTemplateSortOptions,
  normalizeTemplateSort,
  parseTemplateRoute,
  TEMPLATE_SORT_LABELS,
} from '../src/components/marketplace/templateRoute';

test('preserves the Best Sellers sort and its public URL aliases', () => {
  assert.equal(normalizeTemplateSort('best_selling'), 'best_selling');
  assert.equal(normalizeTemplateSort('best-selling'), 'best_selling');
  assert.equal(normalizeTemplateSort('best_sellers'), 'best_selling');
  assert.equal(normalizeTemplateSort('best-sellers'), 'best_selling');
});

test('exposes Best Sellers outside Free scope and excludes it from Free templates', () => {
  assert.equal(TEMPLATE_SORT_LABELS.best_selling, 'Best Sellers');
  assert.ok(getTemplateSortOptions('all').some((option) => option.value === 'best_selling'));
  assert.deepEqual(
    getTemplateSortOptions('free').map((option) => option.value),
    ['popular', 'newest'],
  );
});

test('parses the exact public category URL without falling back to Popular', () => {
  const route = parseTemplateRoute({
    href: 'https://webflow.com/templates/category/arts-and-entertainment-websites?sort=best_selling',
    useWindow: false,
  });

  assert.equal(route.pathKind, 'category');
  assert.equal(route.categoryGroupSlug, 'arts-and-entertainment-websites');
  assert.equal(route.sort, 'best_selling');
});
