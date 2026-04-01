import test from 'node:test';
import assert from 'node:assert/strict';

import { getConfiguredMcpKey, getMcpMisconfiguredPayload } from '../src/http.ts';

test('getConfiguredMcpKey prefers the Indeed-specific key and falls back to MCP_API_KEY', () => {
  assert.equal(getConfiguredMcpKey({ INDEED_MCP_API_KEY: ' indeed-key ' }), 'indeed-key');
  assert.equal(getConfiguredMcpKey({ MCP_API_KEY: ' shared-key ' }), 'shared-key');
  assert.equal(getConfiguredMcpKey({}), null);
});

test('getMcpMisconfiguredPayload returns the production deploy error contract', () => {
  const payload = getMcpMisconfiguredPayload();

  assert.equal(payload.ok, false);
  assert.equal(payload.error.code, 'MISCONFIGURED');
  assert.match(payload.error.message, /INDEED_MCP_API_KEY is not configured/i);
});
