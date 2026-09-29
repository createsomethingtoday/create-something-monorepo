import test from 'node:test';
import assert from 'node:assert/strict';
import { mergePages } from '../components/useInfiniteCatalog';
import type { Catalog, Item } from '../lib/types';
const batch = (ids: string[], page: number): Catalog => ({
  items: ids.map((id) => ({ id }) as Item),
  pagination: { page, total_pages: 3, total_items: 6, has_next_page: page < 3 },
  provenance: { source: 'test', mode: 'test', fetchedAt: '' }
});
test('overlapping pages append in server order without duplicate identities', () => {
  const first = batch(['a', 'b'], 1);
  const next = mergePages(first, batch(['b', 'c', 'c', 'd'], 2));
  assert.deepEqual(
    next.items.map((x) => x.id),
    ['a', 'b', 'c', 'd']
  );
  assert.equal(next.pagination.page, 2);
  assert.deepEqual(
    first.items.map((x) => x.id),
    ['a', 'b']
  );
});
test('reset starts a different result set and final page ends loading', () => {
  const reset = mergePages(null, batch(['z', 'y'], 3));
  assert.deepEqual(
    reset.items.map((x) => x.id),
    ['z', 'y']
  );
  assert.equal(reset.pagination.has_next_page, false);
});
