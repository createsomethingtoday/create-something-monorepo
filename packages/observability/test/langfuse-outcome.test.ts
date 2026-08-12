import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveToolInvocationOutcome } from '../src/langfuse.js';

test('treats MCP isError results as failed invocations with an actionable error', () => {
  assert.deepEqual(
    resolveToolInvocationOutcome({
      content: [{ type: 'text', text: 'Connection expired. Reconnect the toolkit.' }],
      isError: true,
    }),
    {
      success: false,
      error: 'Connection expired. Reconnect the toolkit.',
    },
  );
});

test('uses a stable error when an MCP error result has no text content', () => {
  assert.deepEqual(resolveToolInvocationOutcome({ content: [], isError: true }), {
    success: false,
    error: 'MCP tool returned isError=true',
  });
});

test('treats ordinary MCP results as successful invocations', () => {
  assert.deepEqual(
    resolveToolInvocationOutcome({ content: [{ type: 'text', text: 'ok' }] }),
    { success: true },
  );
});
