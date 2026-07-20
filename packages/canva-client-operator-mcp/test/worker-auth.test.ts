import assert from 'node:assert/strict';
import test from 'node:test';

import worker from '../worker/index.js';

const env = {
  CS_IDENTITY_ISSUER: 'https://id.createsomething.space',
  OAUTH_ALLOWED_EMAIL_DOMAIN: 'createsomething.io',
} as never;

test('Worker exposes Claude protected-resource discovery and challenges unauthenticated MCP requests', async () => {
  const discovery = await worker.fetch(
    new Request('https://canva-client-mcp.example.com/.well-known/oauth-protected-resource'),
    env,
    {} as ExecutionContext,
  );
  assert.equal(discovery.status, 200);
  assert.deepEqual((await discovery.json() as { authorization_servers: string[] }).authorization_servers, [
    'https://id.createsomething.space',
  ]);

  const unauthorized = await worker.fetch(
    new Request('https://canva-client-mcp.example.com/mcp', { method: 'POST' }),
    env,
    {} as ExecutionContext,
  );
  assert.equal(unauthorized.status, 401);
  assert.equal(
    unauthorized.headers.get('WWW-Authenticate'),
    'Bearer resource_metadata="https://canva-client-mcp.example.com/.well-known/oauth-protected-resource"',
  );
});
