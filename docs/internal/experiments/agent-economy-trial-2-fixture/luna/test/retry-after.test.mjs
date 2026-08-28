import test from 'node:test';
import assert from 'node:assert/strict';

import { parseRetryAfter } from '../src/retry-after.mjs';

test('parses whole seconds as milliseconds', () => {
  assert.equal(parseRetryAfter('120', 0), 120_000);
});

test('parses a future HTTP date relative to now', () => {
  const now = Date.parse('Wed, 21 Oct 2015 07:27:00 GMT');
  assert.equal(parseRetryAfter('Wed, 21 Oct 2015 07:28:00 GMT', now), 60_000);
});

test('clamps a past HTTP date to zero', () => {
  const now = Date.parse('Wed, 21 Oct 2015 07:29:00 GMT');
  assert.equal(parseRetryAfter('Wed, 21 Oct 2015 07:28:00 GMT', now), 0);
});

test('rejects negative and empty decimal-seconds forms', () => {
  assert.equal(parseRetryAfter('-1', 0), null);
  assert.equal(parseRetryAfter('  ', 0), null);
});
