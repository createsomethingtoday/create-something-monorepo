import assert from 'node:assert/strict';
import test from 'node:test';

import hubWorker, { buildHubOAuthAuthorizationServerMetadata } from '../index.ts';

test('buildHubOAuthAuthorizationServerMetadata points to shared identity issuer', () => {
  const metadata = buildHubOAuthAuthorizationServerMetadata(
    new URL('https://mj.mcp.createsomething.agency/.well-known/oauth-authorization-server'),
    {
      OAUTH_ISSUER_URL: 'https://id.createsomething.space',
    } as any,
  );

  assert.equal(metadata.issuer, 'https://id.createsomething.space');
  assert.equal(metadata.authorization_endpoint, 'https://id.createsomething.space/oauth/authorize');
  assert.equal(metadata.token_endpoint, 'https://id.createsomething.space/oauth/token');
  assert.equal(metadata.resource, 'https://mj.mcp.createsomething.agency/mcp');
});

test('hub worker serves oauth authorization server metadata from custom-domain discovery path', async () => {
  const response = await hubWorker.fetch(
    new Request('https://mj.mcp.createsomething.agency/.well-known/oauth-authorization-server'),
    {
      OAUTH_ISSUER_URL: 'https://id.createsomething.space',
    } as any,
    {
      waitUntil() {},
    } as any,
  );

  assert.equal(response.status, 200);
  const body = await response.json() as Record<string, unknown>;
  assert.equal(body.authorization_endpoint, 'https://id.createsomething.space/oauth/authorize');
  assert.equal(body.resource, 'https://mj.mcp.createsomething.agency/mcp');
});
