import assert from 'node:assert/strict';
import test from 'node:test';

import identityWorker from '../src/index.ts';

function makeEnv() {
  return {
    ENVIRONMENT: 'test',
    ALLOWED_ORIGINS: 'https://chatgpt.com',
    MCP_HUB_URL: 'https://mj.mcp.createsomething.agency/mcp',
  } as any;
}

test('identity worker serves oauth authorization server metadata', async () => {
  const response = await identityWorker.fetch(
    new Request('https://id.createsomething.space/.well-known/oauth-authorization-server'),
    makeEnv(),
  );

  assert.equal(response.status, 200);
  const body = await response.json() as Record<string, unknown>;
  assert.equal(body.authorization_endpoint, 'https://id.createsomething.space/oauth/authorize');
  assert.equal(body.token_endpoint, 'https://id.createsomething.space/oauth/token');
  assert.deepEqual(body.scopes_supported, [
    'openid',
    'profile',
    'email',
    'mcp',
    'offline_access',
    'template-review:read',
    'template-review:write',
    'template-review:queue-read',
  ]);
});

test('identity worker renders oauth authorize page', async () => {
  const response = await identityWorker.fetch(
    new Request(
      'https://id.createsomething.space/oauth/authorize?response_type=code&client_id=chatgpt&redirect_uri=https%3A%2F%2Fchat.openai.com%2Fa%2Fcallback&scope=openid%20mcp',
    ),
    makeEnv(),
  );

  assert.equal(response.status, 200);
  const text = await response.text();
  assert.match(text, /Authorize MCP Access/);
  assert.match(text, /name="client_id" value="chatgpt"/);
});

test('Template Review authorize page describes the resource-bound application grant', async () => {
  const resource = 'https://webflow-template-review-mcp.createsomething.workers.dev/mcp';
  const response = await identityWorker.fetch(
    new Request(
      `https://id.createsomething.space/oauth/authorize?response_type=code&client_id=workflow-shadow-pilot&redirect_uri=${encodeURIComponent('http://127.0.0.1:65221/callback')}&scope=${encodeURIComponent('openid profile email mcp template-review:queue-read')}&resource=${encodeURIComponent(resource)}`,
    ),
    makeEnv(),
  );

  assert.equal(response.status, 200);
  const text = await response.text();
  assert.match(text, /Application MCP Access/);
  assert.match(text, /short-lived access token bound to this resource and the requested scopes/);
  assert.match(text, new RegExp(`Resource: ${resource.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  assert.match(text, /Scopes: openid profile email mcp template-review:queue-read/);
  assert.doesNotMatch(text, /managed MCP bearer token/);
  assert.doesNotMatch(text, /Hub:/);
});
