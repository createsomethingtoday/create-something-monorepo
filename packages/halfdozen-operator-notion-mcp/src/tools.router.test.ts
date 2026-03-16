import assert from 'node:assert/strict';
import test from 'node:test';

import { extractAccountSlug, extractDisplayLabel } from './tools.js';

test('extractAccountSlug parses rename workspace phrasing', () => {
  assert.equal(
    extractAccountSlug('rename workspace blondish to "Blondish 2Way Sync"'),
    'blondish',
  );
});

test('extractDisplayLabel parses rename target labels', () => {
  assert.equal(
    extractDisplayLabel('rename workspace blondish to "Blondish 2Way Sync"'),
    'Blondish 2Way Sync',
  );
});
