import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createCollectorReceipt,
  createReviewerReceiptFromOpenAiUsage,
} from '../src/unit-economics.js';

test('collector receipt uses observed sandbox resources and records zero model tokens', () => {
  const receipt = createCollectorReceipt({
    packetId: 'packet-collector-1',
    startedAt: '2026-07-13T12:00:00.000Z',
    completedAt: '2026-07-13T12:01:30.000Z',
    cpuCount: 4,
    memoryMiB: 1024,
    evidenceNote: 'Observed from E2B Sandbox.getInfo after a completed run.',
  });

  assert.equal(receipt.duration_ms, 90_000);
  assert.equal(receipt.sandbox.vcpu, 4);
  assert.equal(receipt.sandbox.memory_gib, 1);
  assert.equal(receipt.tokens.status, 'not_applicable');
  assert.equal(receipt.tokens.total_tokens, 0);
  assert.deepEqual(receipt.other_costs_usd, {
    storage: { status: 'unmeasured', usd: 0 },
    tools: { status: 'unmeasured', usd: 0 },
  });
});

test('reviewer receipt normalizes OpenAI cached and reasoning token details without double counting', () => {
  const receipt = createReviewerReceiptFromOpenAiUsage({
    packetId: 'packet-reviewer-1',
    model: 'gpt-example',
    startedAt: '2026-07-13T12:01:30.000Z',
    completedAt: '2026-07-13T12:01:35.000Z',
    usage: {
      input_tokens: 2500,
      input_tokens_details: { cached_tokens: 1000 },
      output_tokens: 600,
      output_tokens_details: { reasoning_tokens: 125 },
      total_tokens: 3100,
    },
    evidenceNote: 'Observed successful Responses API metadata.',
  });

  assert.deepEqual(receipt.tokens, {
    status: 'observed_successful_response',
    input_tokens: 2500,
    cached_input_tokens: 1000,
    output_tokens: 600,
    reasoning_tokens: 125,
    total_tokens: 3100,
  });
  assert.equal(receipt.duration_ms, 5000);
});
