import assert from 'node:assert/strict';
import test from 'node:test';

import { subscribeTemplateFilterBarExternalChanges } from '../src/components/filter/TemplateFilterBar';

test('Template Filter Bar synchronizes external WebMCP filter changes without refresh', () => {
  const win = new EventTarget();
  const doc = new EventTarget();
  const observed: string[] = [];
  const unsubscribe = subscribeTemplateFilterBarExternalChanges(win, doc, (event) => {
    observed.push(event.type);
  });

  win.dispatchEvent(
    new CustomEvent('templateFiltersChanged', {
      detail: {
        source: 'TemplateChat',
        categoryGroupSlug: 'portfolio-and-agency-websites',
        styles: ['minimal-websites'],
      },
    }),
  );

  assert.deepEqual(observed, ['templateFiltersChanged']);

  // The bar already owns its local state for its own events; responding again
  // would create a re-entrant update loop.
  doc.dispatchEvent(
    new CustomEvent('templateFiltersChanged', {
      detail: { source: 'TemplateFilterBar', styles: ['minimal-websites'] },
    }),
  );
  assert.deepEqual(observed, ['templateFiltersChanged']);

  unsubscribe();
  win.dispatchEvent(new Event('popstate'));
  doc.dispatchEvent(new Event('categoryFilterUpdated'));
  assert.deepEqual(observed, ['templateFiltersChanged']);
});
