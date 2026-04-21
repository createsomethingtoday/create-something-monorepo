import assert from 'node:assert/strict';
import test from 'node:test';

import { isTransientContainerError } from './transient-errors.js';

test('isTransientContainerError recognizes transient container disconnects', () => {
  assert.equal(isTransientContainerError(new Error('Container suddenly disconnected, try again')), true);
  assert.equal(
    isTransientContainerError(
      new Error('Internal error in Durable Object storage caused object to be reset.'),
    ),
    true,
  );
  assert.equal(isTransientContainerError(new Error('The operation was aborted')), true);
});

test('isTransientContainerError ignores non-transient startup errors', () => {
  assert.equal(
    isTransientContainerError(new Error('Analyzer process started without propagated auth configuration.')),
    false,
  );
  assert.equal(isTransientContainerError(new Error('Template review queue is at capacity. Retry later.')), false);
});
