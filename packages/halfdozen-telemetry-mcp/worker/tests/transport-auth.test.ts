import assert from 'node:assert/strict';
import test from 'node:test';

import { authorizeMcpTransport } from '../transport-auth.js';

test('transport authorization fails closed when the secret is missing', () => {
  const response = authorizeMcpTransport(new Request('https://telemetry.example/mcp'), {});
  assert.equal(response?.status, 503);
});

test('transport authorization rejects missing or incorrect credentials', () => {
  assert.equal(authorizeMcpTransport(new Request('https://telemetry.example/mcp'), { MCP_BEARER_TOKEN: 'secret' })?.status, 401);
  assert.equal(authorizeMcpTransport(new Request('https://telemetry.example/mcp', { headers: { authorization: 'Bearer wrong' } }), { MCP_BEARER_TOKEN: 'secret' })?.status, 401);
});

test('transport authorization accepts the configured bearer credential', () => {
  const response = authorizeMcpTransport(new Request('https://telemetry.example/mcp', { headers: { authorization: 'Bearer secret' } }), { MCP_BEARER_TOKEN: 'secret' });
  assert.equal(response, null);
});
