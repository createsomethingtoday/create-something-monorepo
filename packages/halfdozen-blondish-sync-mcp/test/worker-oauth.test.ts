import assert from 'node:assert/strict';
import test from 'node:test';

import { createTicketSyncWorker } from '../src/http.js';
import type { Env } from '../src/types.js';

const origin = 'https://halfdozen-cracked-sync-mcp.createsomething.workers.dev';
const env = {
  CS_IDENTITY_ISSUER: 'https://id.createsomething.space',
  OAUTH_ALLOWED_EMAILS: 'operator@createsomething.io',
  SYNC_SERVER_NAME: 'halfdozen-cracked-sync-mcp',
  SYNC_CLIENT_SLUG: 'cracked',
  SYNC_TENANT_SLUG: 'cracked-live',
  SYNC_CLIENT_DISPLAY_NAME: 'Cracked Live',
  SYNC_TOOL_PREFIX: 'cracked_sync',
} as Env;

const context = {
  waitUntil() {},
  passThroughOnException() {},
  props: {},
} as unknown as ExecutionContext;

const worker = createTicketSyncWorker(async () => new Response('served'));

test('worker serves Claude OAuth protected-resource discovery from both standard paths', async () => {
  for (const path of [
    '/.well-known/oauth-protected-resource',
    '/mcp/.well-known/oauth-protected-resource',
  ]) {
    const response = await worker.fetch(new Request(`${origin}${path}`), env, context);
    assert.equal(response.status, 200);
    const body = await response.json() as Record<string, unknown>;
    assert.equal(body.resource, `${origin}/mcp`);
    assert.deepEqual(body.authorization_servers, ['https://id.createsomething.space']);
  }
});

test('anonymous MCP requests advertise OAuth discovery to Claude', async () => {
  const response = await worker.fetch(
    new Request(`${origin}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }),
    }),
    env,
    context,
  );

  assert.equal(response.status, 401);
  assert.equal(
    response.headers.get('WWW-Authenticate'),
    `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource"`,
  );
});

test('health reports OAuth readiness without exposing allowlist contents', async () => {
  const response = await worker.fetch(new Request(`${origin}/health`), env, context);
  const body = await response.json() as Record<string, any>;

  assert.equal(body.auth.oauth.configured, true);
  assert.equal(body.auth.oauth.allowlist_configured, true);
  assert.equal(body.auth.oauth.authorization_server, 'https://id.createsomething.space');
  assert.deepEqual(body.auth.oauth.scopes, ['cracked-sync:read', 'cracked-sync:write']);
  assert.equal(JSON.stringify(body).includes('operator@createsomething.io'), false);
});
