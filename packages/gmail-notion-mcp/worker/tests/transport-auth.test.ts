import assert from 'node:assert/strict';
import test from 'node:test';

import { authorizeMcpTransport, resolveServerAccountId } from '../transport-auth.js';

test('transport authorization fails closed without a server credential', () => {
  assert.equal(authorizeMcpTransport(new Request('https://gmail-notion.example/mcp'), {})?.status, 503);
});

test('caller-controlled account headers do not authorize transport', () => {
  const request = new Request('https://gmail-notion.example/mcp', {
    headers: { 'x-mcp-account-id': 'victim' },
  });
  assert.equal(authorizeMcpTransport(request, { MCP_API_KEY: 'secret' })?.status, 401);
});

test('configured bearer authorizes transport without becoming the tenant id', () => {
  const request = new Request('https://gmail-notion.example/mcp', {
    headers: { authorization: 'Bearer secret', 'x-mcp-account-id': 'victim' },
  });
  const env = { MCP_API_KEY: 'secret', MCP_ACCOUNT_ID: 'operator' };
  assert.equal(authorizeMcpTransport(request, env), null);
  assert.equal(resolveServerAccountId(env), 'operator');
});

test('server account identifiers are normalized and never read from the request', () => {
  assert.equal(resolveServerAccountId({ MCP_ACCOUNT_ID: ' Team A / Admin ' }), 'Team_A___Admin');
  assert.equal(resolveServerAccountId({}), 'operator');
});
