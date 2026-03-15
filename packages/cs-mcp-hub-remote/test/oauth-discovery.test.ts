import assert from 'node:assert/strict';
import test from 'node:test';

import hubWorker, {
  buildHubOAuthAuthorizationServerMetadata,
  buildHubOAuthProtectedResourceMetadata,
  shouldBypassMcpAuth,
} from '../index.ts';

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
  assert.deepEqual(metadata.scopes_supported, ['openid', 'profile', 'email', 'mcp', 'offline_access']);
  assert.deepEqual(metadata.grant_types_supported, ['authorization_code', 'refresh_token']);
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
  assert.deepEqual(body.scopes_supported, ['openid', 'profile', 'email', 'mcp', 'offline_access']);
  assert.deepEqual(body.grant_types_supported, ['authorization_code', 'refresh_token']);
});

test('buildHubOAuthProtectedResourceMetadata points to the hub MCP resource', () => {
  const metadata = buildHubOAuthProtectedResourceMetadata(
    new URL('https://mj.mcp.createsomething.agency/mcp/.well-known/oauth-protected-resource'),
    {
      OAUTH_ISSUER_URL: 'https://id.createsomething.space',
    } as any,
  );

  assert.equal(metadata.resource, 'https://mj.mcp.createsomething.agency/mcp');
  assert.deepEqual(metadata.authorization_servers, ['https://id.createsomething.space']);
  assert.deepEqual(metadata.scopes_supported, ['openid', 'profile', 'email', 'mcp', 'offline_access']);
});

test('hub worker serves oauth protected resource metadata from MCP discovery path', async () => {
  const response = await hubWorker.fetch(
    new Request('https://mj.mcp.createsomething.agency/mcp/.well-known/oauth-protected-resource'),
    {
      OAUTH_ISSUER_URL: 'https://id.createsomething.space',
    } as any,
    {
      waitUntil() {},
    } as any,
  );

  assert.equal(response.status, 200);
  const body = await response.json() as Record<string, unknown>;
  assert.equal(body.resource, 'https://mj.mcp.createsomething.agency/mcp');
  assert.deepEqual(body.scopes_supported, ['openid', 'profile', 'email', 'mcp', 'offline_access']);
});

test('unauthorized MCP tool execution responses advertise oauth protected resource metadata', async () => {
  const response = await hubWorker.fetch(
    new Request('https://mj.mcp.createsomething.agency/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'hub_status',
          arguments: {},
        },
      }),
    }),
    {
      OAUTH_ISSUER_URL: 'https://id.createsomething.space',
      HUB_API_TOKEN: 'secret',
      HUB_SESSION_RESOLVE_URL: 'https://id.createsomething.space/v1/mcp/sessions/resolve',
      HUB_SESSION_RESOLVE_TOKEN: 'resolve-token',
    } as any,
    {
      waitUntil() {},
    } as any,
  );

  assert.equal(response.status, 401);
  assert.match(
    response.headers.get('WWW-Authenticate') ?? '',
    /resource_metadata="https:\/\/mj\.mcp\.createsomething\.agency\/mcp\/\.well-known\/oauth-protected-resource"/,
  );
});

test('MCP initialize and tools/list handshake requests bypass top-level auth', async () => {
  const initializeRequest = new Request('https://mj.mcp.createsomething.agency/mcp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-03-26',
        capabilities: {},
        clientInfo: {
          name: 'chatgpt',
          version: '1.0.0',
        },
      },
    }),
  });
  const toolsListRequest = new Request('https://mj.mcp.createsomething.agency/mcp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }),
  });

  assert.equal(await shouldBypassMcpAuth(initializeRequest), true);
  assert.equal(await shouldBypassMcpAuth(toolsListRequest), true);
});

test('tool execution requests still require auth', async () => {
  const toolCallRequest = new Request('https://mj.mcp.createsomething.agency/mcp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'hub_status',
        arguments: {},
      },
    }),
  });

  assert.equal(await shouldBypassMcpAuth(toolCallRequest), false);
});
