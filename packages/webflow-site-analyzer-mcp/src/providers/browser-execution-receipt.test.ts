import assert from 'node:assert/strict';
import test from 'node:test';

import { createBrowserExecutionReceipt } from './browser-execution-receipt.js';

const routing = {
  operation: 'analyze' as const,
  capability: 'stateless-public' as const,
  selectedProvider: 'cloudflare-kitesurf',
  attempts: [{
    provider: 'cloudflare-kitesurf',
    outcome: 'success' as const,
    durationMs: 12,
  }],
};

test('adds deterministic result identity and explicit unavailable usage evidence', async () => {
  const first = await createBrowserExecutionReceipt(routing, {
    url: 'https://example.com',
    durationMs: 12,
    result: { title: 'Example' },
  });
  const second = await createBrowserExecutionReceipt(routing, {
    url: 'https://example.com',
    durationMs: 15,
    result: { title: 'Example' },
  });

  assert.match(first.resultHash, /^sha256:[a-f0-9]{64}$/);
  assert.equal(first.resultHash, second.resultHash);
  assert.deepEqual(first.usage, {
    browserMsUsed: null,
    source: 'unavailable',
  });
  assert.equal(first.url, 'https://example.com');
});
