import assert from 'node:assert/strict';
import test from 'node:test';

import type { BrowserExecutionReceipt } from '../src/providers/browser-execution-receipt.js';
import type { BrowserRoutingReceipt } from '../src/providers/index.js';
import { compareCorpusCases } from './compare-browser-run.js';

const routedFailureReceipt: BrowserRoutingReceipt = {
  operation: 'analyze',
  capability: 'stateless-public',
  selectedProvider: null,
  attempts: [{
    provider: 'cloudflare-kitesurf',
    outcome: 'failure',
    durationMs: 12,
    error: 'Cloudflare Browser Run kitesurf connection failed',
  }],
  fallbackReason: 'Cloudflare Browser Run kitesurf connection failed',
};

const baselineReceipt: BrowserExecutionReceipt = {
  operation: 'analyze',
  capability: 'stateless-public',
  selectedProvider: 'steel',
  attempts: [{ provider: 'steel', outcome: 'success', durationMs: 20 }],
  url: 'https://example.com/',
  durationMs: 20,
  resultHash: 'sha256:baseline',
  usage: { browserMsUsed: null, source: 'unavailable' },
};

test('preserves a failed routed case and successful incumbent run in the comparison report', async () => {
  let baselineExecuted = false;
  const result = await compareCorpusCases({
    cases: [{
      id: 'standards-baseline',
      url: 'https://example.com/',
      operation: 'analyze',
      expectedEngine: 'cloudflare-kitesurf',
    }],
    executeRouted: async () => {
      throw new Error('Authorization: Bearer secret-browser-token');
    },
    executeBaseline: async () => {
      baselineExecuted = true;
      return { result: { title: 'Example Domain' }, receipt: baselineReceipt };
    },
    getRoutedFailureReceipt: () => routedFailureReceipt,
    redactions: ['secret-browser-token'],
  });

  assert.equal(baselineExecuted, true);
  assert.equal(result.passed, false);
  assert.equal(result.cases.length, 1);
  assert.equal(result.cases[0]?.failures.length, 1);
  assert.equal(result.cases[0]?.failures[0]?.stage, 'routed');
  assert.equal(result.cases[0]?.failures[0]?.error, 'Authorization: Bearer [REDACTED]');
  assert.equal(typeof result.cases[0]?.failures[0]?.durationMs, 'number');
  const routed = result.cases[0]?.routed;
  assert.equal(routed?.result, null);
  assert.equal(routed?.receipt?.selectedProvider, routedFailureReceipt.selectedProvider);
  assert.deepEqual(routed?.receipt?.attempts, routedFailureReceipt.attempts);
  assert.equal(routed?.receipt?.resultHash, null);
  assert.equal(typeof routed?.receipt?.durationMs, 'number');
  assert.deepEqual(routed?.receipt?.usage, { browserMsUsed: null, source: 'unavailable' });
  assert.deepEqual(result.cases[0]?.baseline, {
    result: { title: 'Example Domain' },
    receipt: baselineReceipt,
  });
});
