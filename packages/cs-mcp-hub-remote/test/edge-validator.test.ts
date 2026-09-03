import assert from 'node:assert/strict';
import test from 'node:test';

import { createDownstreamClient } from '../index.ts';

test('downstream MCP clients compile output schemas without dynamic code generation', () => {
  const client = createDownstreamClient('structured-output-test');
  const cacheToolMetadata = (client as unknown as {
    cacheToolMetadata: (tools: unknown[]) => void;
  }).cacheToolMetadata.bind(client);
  const originalFunction = globalThis.Function;

  Object.defineProperty(globalThis, 'Function', {
    configurable: true,
    value: function blockedDynamicFunction() {
      throw new EvalError('Code generation from strings disallowed for this context');
    },
  });

  try {
    assert.doesNotThrow(() => cacheToolMetadata([{
      name: 'structured_contact',
      inputSchema: { type: 'object', properties: {} },
      outputSchema: {
        type: 'object',
        properties: { contact_available: { type: 'boolean' } },
        required: ['contact_available'],
      },
    }]));
  } finally {
    Object.defineProperty(globalThis, 'Function', {
      configurable: true,
      value: originalFunction,
    });
  }
});
