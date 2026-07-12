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
