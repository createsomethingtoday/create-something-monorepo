import assert from 'node:assert/strict';
import test from 'node:test';

import { evaluateAnonymousControlSmoke } from '../scripts/smoke-policy.js';

test('shared smoke skips only an explicitly unconfigured optional Control lane', () => {
  assert.deepEqual(
    evaluateAnonymousControlSmoke({ status: 401, requireConfigured: false }),
    { passed: true, skipped: false }
  );
  assert.deepEqual(
    evaluateAnonymousControlSmoke({
      status: 503,
      error: 'control_identity_unconfigured',
      requireConfigured: false
    }),
    { passed: true, skipped: true }
  );
  for (const input of [
    { status: 503, error: 'control_identity_unconfigured', requireConfigured: true },
    { status: 503, error: 'control_runtime_unavailable', requireConfigured: false },
    { status: 200, requireConfigured: false }
  ]) {
    assert.deepEqual(evaluateAnonymousControlSmoke(input), { passed: false, skipped: false });
  }
});
