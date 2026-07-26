import assert from 'node:assert/strict';
import test from 'node:test';

import { SCOPE_QUEUE_READ, SCOPE_READ, SCOPE_WRITE } from '../src/oauth-access.js';
import { resolveRuntimePolicy } from '../src/runtime-policy.js';

test('production policy preserves legacy and scoped OAuth write behavior', () => {
  assert.deepEqual(resolveRuntimePolicy({ authMode: 'legacy' }), {
    allowWrites: true,
    queueReadOnly: false,
    scopesSupported: [SCOPE_QUEUE_READ, SCOPE_READ, SCOPE_WRITE]
  });
  assert.deepEqual(resolveRuntimePolicy({ authMode: 'oauth', scopes: [SCOPE_READ, SCOPE_WRITE] }), {
    allowWrites: true,
    queueReadOnly: false,
    scopesSupported: [SCOPE_QUEUE_READ, SCOPE_READ, SCOPE_WRITE]
  });
});

test('forced read-only policy suppresses writes for every authentication mode', () => {
  for (const input of [
    { authMode: 'legacy' as const, forceReadOnly: true },
    { authMode: 'oauth' as const, scopes: [SCOPE_READ, SCOPE_WRITE], forceReadOnly: true }
  ]) {
    assert.deepEqual(resolveRuntimePolicy(input), {
      allowWrites: false,
      queueReadOnly: false,
      scopesSupported: [SCOPE_READ]
    });
  }
});

test('queue-only OAuth grants retain the narrow queue tool policy', () => {
  assert.deepEqual(resolveRuntimePolicy({ authMode: 'oauth', scopes: [SCOPE_QUEUE_READ] }), {
    allowWrites: false,
    queueReadOnly: true,
    scopesSupported: [SCOPE_QUEUE_READ, SCOPE_READ, SCOPE_WRITE]
  });
});
