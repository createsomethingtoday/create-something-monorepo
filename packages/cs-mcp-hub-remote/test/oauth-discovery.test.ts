import assert from 'node:assert/strict';
import test from 'node:test';

import hubWorker, {
  buildHubOAuthAuthorizationServerMetadata,
  buildHubOAuthProtectedResourceMetadata
} from '../index.ts';

test('buildHubOAuthAuthorizationServerMetadata points to shared identity issuer', () => {
  const metadata = buildHubOAuthAuthorizationServerMetadata(
    new URL('https://mj.mcp.createsomething.agency/.well-known/oauth-authorization-server'),
    {
      OAUTH_ISSUER_URL: 'https://id.createsomething.space'
    } as any
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
      OAUTH_ISSUER_URL: 'https://id.createsomething.space'
    } as any,
    {
      waitUntil() {}
    } as any
  );

  assert.equal(response.status, 200);
  const body = (await response.json()) as Record<string, unknown>;
  assert.equal(body.authorization_endpoint, 'https://id.createsomething.space/oauth/authorize');
  assert.equal(body.resource, 'https://mj.mcp.createsomething.agency/mcp');
});

test('buildHubOAuthProtectedResourceMetadata points to the hub MCP resource', () => {
  const metadata = buildHubOAuthProtectedResourceMetadata(
    new URL('https://mj.mcp.createsomething.agency/mcp/.well-known/oauth-protected-resource'),
    {
      OAUTH_ISSUER_URL: 'https://id.createsomething.space'
    } as any
  );

  assert.equal(metadata.resource, 'https://mj.mcp.createsomething.agency/mcp');
  assert.deepEqual(metadata.authorization_servers, ['https://id.createsomething.space']);
});

test('hub worker serves oauth protected resource metadata from MCP discovery path', async () => {
  const response = await hubWorker.fetch(
    new Request('https://mj.mcp.createsomething.agency/mcp/.well-known/oauth-protected-resource'),
    {
      OAUTH_ISSUER_URL: 'https://id.createsomething.space'
    } as any,
    {
      waitUntil() {}
    } as any
  );

  assert.equal(response.status, 200);
  const body = (await response.json()) as Record<string, unknown>;
  assert.equal(body.resource, 'https://mj.mcp.createsomething.agency/mcp');
});

test('unauthorized MCP responses advertise oauth protected resource metadata', async () => {
  const response = await hubWorker.fetch(
    new Request('https://mj.mcp.createsomething.agency/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} })
    }),
    {
      OAUTH_ISSUER_URL: 'https://id.createsomething.space',
      HUB_API_TOKEN: 'secret',
      HUB_SESSION_RESOLVE_URL: 'https://id.createsomething.space/v1/mcp/sessions/resolve',
      HUB_SESSION_RESOLVE_TOKEN: 'resolve-token'
    } as any,
    {
      waitUntil() {}
    } as any
  );

  assert.equal(response.status, 401);
  assert.match(
    response.headers.get('WWW-Authenticate') ?? '',
    /resource_metadata="https:\/\/mj\.mcp\.createsomething\.agency\/mcp\/\.well-known\/oauth-protected-resource"/
  );
});

test('unauthorized bearer-only MCP path does not advertise oauth metadata', async () => {
  const response = await hubWorker.fetch(
    new Request('https://mj.mcp.createsomething.agency/mcp/bearer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} })
    }),
    {
      OAUTH_ISSUER_URL: 'https://id.createsomething.space',
      HUB_API_TOKEN: 'secret',
      HUB_SESSION_RESOLVE_URL: 'https://id.createsomething.space/v1/mcp/sessions/resolve',
      HUB_SESSION_RESOLVE_TOKEN: 'resolve-token'
    } as any,
    {
      waitUntil() {}
    } as any
  );

  assert.equal(response.status, 401);
  assert.equal(response.headers.get('WWW-Authenticate'), 'Bearer realm="create-something-hub"');
});

test('oauth discovery can be disabled for static bearer-only MCP hosts', async () => {
  const env = {
    OAUTH_ISSUER_URL: 'https://id.createsomething.space',
    HUB_API_TOKEN: 'secret',
    HUB_OAUTH_DISCOVERY_ENABLED: 'false'
  } as any;
  const ctx = {
    waitUntil() {}
  } as any;

  const protectedResourceResponse = await hubWorker.fetch(
    new Request('https://mj.mcp.createsomething.agency/mcp/.well-known/oauth-protected-resource'),
    env,
    ctx
  );
  assert.equal(protectedResourceResponse.status, 404);

  const authorizationServerResponse = await hubWorker.fetch(
    new Request('https://mj.mcp.createsomething.agency/.well-known/oauth-authorization-server'),
    env,
    ctx
  );
  assert.equal(authorizationServerResponse.status, 404);

  const unauthorizedMcpResponse = await hubWorker.fetch(
    new Request('https://mj.mcp.createsomething.agency/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} })
    }),
    env,
    ctx
  );
  assert.equal(unauthorizedMcpResponse.status, 401);
  assert.equal(
    unauthorizedMcpResponse.headers.get('WWW-Authenticate'),
    'Bearer realm="create-something-hub"'
  );
});
