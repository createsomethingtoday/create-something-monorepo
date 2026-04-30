import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildInkNavigation } from '../src/navigation.js';

test('consolidates device play surfaces under Calm instead of Games', () => {
  const navigation = buildInkNavigation('core-ink', 1000);
  const labels = navigation.buckets.map((bucket) => bucket.label);
  const calm = navigation.buckets.find((bucket) => bucket.id === 'calm');

  assert.deepEqual(labels, ['Operator', 'Rhythm', 'Calm', 'Settings']);
  assert.equal(calm?.short_label, 'Calm');
  assert.deepEqual(calm?.actions.map((action) => action.id), ['calm_reset', 'stone_garden']);
  assert.equal(navigation.buckets.some((bucket) => bucket.label === 'Games'), false);
});

test('keeps remote operator actions separate from local calm actions', () => {
  const navigation = buildInkNavigation('t-embed', 1000);
  const operator = navigation.buckets.find((bucket) => bucket.id === 'operator');
  const calm = navigation.buckets.find((bucket) => bucket.id === 'calm');

  assert.deepEqual(operator?.actions.map((action) => action.endpoint), ['/ink/brief', '/ink/health-review/request']);
  assert.deepEqual(calm?.actions.map((action) => action.kind), ['local', 'local']);
});
