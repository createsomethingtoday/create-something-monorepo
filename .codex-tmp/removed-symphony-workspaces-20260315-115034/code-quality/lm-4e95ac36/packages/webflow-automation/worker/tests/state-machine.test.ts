import assert from 'node:assert/strict';
import test from 'node:test';

import { isAllowedTransition } from '../src/types.js';

test('state machine allows expected transitions', () => {
  assert.equal(isAllowedTransition('', 'Queue'), true);
  assert.equal(isAllowedTransition('Queue', 'In-Progress'), true);
  assert.equal(isAllowedTransition('In-Progress', 'Done'), true);
  assert.equal(isAllowedTransition('In-Progress', 'Blocked'), true);
  assert.equal(isAllowedTransition('Blocked', 'In-Progress'), true);
});

test('state machine rejects invalid transitions', () => {
  assert.equal(isAllowedTransition('Queue', 'Done'), false);
  assert.equal(isAllowedTransition('Done', 'In-Progress'), false);
  assert.equal(isAllowedTransition('Blocked', 'Done'), false);
});
