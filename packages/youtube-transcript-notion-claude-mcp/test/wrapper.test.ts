import assert from 'node:assert/strict';
import test from 'node:test';

import worker, {
  buildOAuthAuthorizationServerMetadata,
  buildOAuthProtectedResourceMetadata,
} from '../index.ts';

const ORIGIN = 'https://youtube-transcript-notion-claude-mcp.createsomething.workers.dev';

function makeEnv(overrides: Record<string, string> = {}) {
  return {
    UPSTREAM_MCP_URL: 'https://youtube-transcript-notion-mcp.createsomething.workers.dev/mcp',
    UPSTREAM_MCP_BEARER_TOKEN: 'upstream-secret',
    OAUTH_SIGNING_SECRET: 'test-signing-secret',
    OAUTH_LOGIN_PASSWORD: 'connector-password',
    OAUTH_SUBJECT: 'test-subject',
    ...overrides,
  };
}

test('authorization server metadata advertises OAuth endpoints and MCP resource', () => {
  const metadata = buildOAuthAuthorizationServerMetadata(
    new URL(`${ORIGIN}/.well-known/oauth-authorization-server`),
  );

  assert.equal(metadata.issuer, ORIGIN);
  assert.equal(metadata.authorization_endpoint, `${ORIGIN}/oauth/authorize`);
  assert.equal(metadata.token_endpoint, `${ORIGIN}/oauth/token`);
  assert.equal(metadata.registration_endpoint, `${ORIGIN}/oauth/register`);
  assert.equal(metadata.resource, `${ORIGIN}/mcp`);
});

test('protected resource metadata points to wrapper MCP endpoint', () => {
  const metadata = buildOAuthProtectedResourceMetadata(
    new URL(`${ORIGIN}/mcp/.well-known/oauth-protected-resource`),
  );

  assert.equal(metadata.resource, `${ORIGIN}/mcp`);
  assert.deepEqual(metadata.authorization_servers, [ORIGIN]);
  assert.deepEqual(metadata.bearer_methods_supported, ['header']);
});

test('worker serves discovery metadata at root and MCP paths', async () => {
  for (const path of [
    '/.well-known/oauth-authorization-server',
    '/mcp/.well-known/oauth-authorization-server',
    '/.well-known/oauth-protected-resource',
    '/mcp/.well-known/oauth-protected-resource',
  ]) {
    const response = await worker.fetch(new Request(`${ORIGIN}${path}`), makeEnv());
    assert.equal(response.status, 200, path);
    assert.match(response.headers.get('content-type') ?? '', /application\/json/);
  }
});

test('unauthorized MCP request advertises protected resource metadata', async () => {
  const response = await worker.fetch(
    new Request(`${ORIGIN}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }),
    }),
    makeEnv(),
  );

  assert.equal(response.status, 401);
  assert.match(
    response.headers.get('www-authenticate') ?? '',
    /resource_metadata="https:\/\/youtube-transcript-notion-claude-mcp\.createsomething\.workers\.dev\/mcp\/\.well-known\/oauth-protected-resource"/,
  );
});

test('password authorize flow issues tokens and proxies MCP with upstream bearer', async () => {
  const originalFetch = globalThis.fetch;
  const upstreamCalls: Array<{ url: string; authorization: string | null; body: string }> = [];

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(input, init);
    upstreamCalls.push({
      url: request.url,
      authorization: request.headers.get('authorization'),
      body: request.method === 'GET' || request.method === 'HEAD' ? '' : await request.text(),
    });
    return new Response(JSON.stringify({ proxied: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Mcp-Session-Id': 'session-123',
      },
    });
  }) as typeof fetch;

  try {
    const authorizeParams = new URLSearchParams({
      response_type: 'code',
      client_id: 'claude-test',
      redirect_uri: 'https://claude.ai/api/mcp/auth/callback',
      scope: 'openid profile mcp offline_access',
      state: 'state-123',
    });
    const authorizeResponse = await worker.fetch(
      new Request(`${ORIGIN}/oauth/authorize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          ...Object.fromEntries(authorizeParams.entries()),
          password: 'connector-password',
        }).toString(),
      }),
      makeEnv(),
    );

    assert.equal(authorizeResponse.status, 302);
    const location = authorizeResponse.headers.get('location');
    assert.ok(location);
    const callbackUrl = new URL(location);
    assert.equal(callbackUrl.origin + callbackUrl.pathname, 'https://claude.ai/api/mcp/auth/callback');
    assert.equal(callbackUrl.searchParams.get('state'), 'state-123');
    const code = callbackUrl.searchParams.get('code');
    assert.ok(code);

    const tokenResponse = await worker.fetch(
      new Request(`${ORIGIN}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          client_id: 'claude-test',
          redirect_uri: 'https://claude.ai/api/mcp/auth/callback',
        }).toString(),
      }),
      makeEnv(),
    );

    assert.equal(tokenResponse.status, 200);
    const tokenBody = await tokenResponse.json() as { access_token: string; token_type: string };
    assert.equal(tokenBody.token_type, 'Bearer');
    assert.ok(tokenBody.access_token);

    const mcpResponse = await worker.fetch(
      new Request(`${ORIGIN}/mcp`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokenBody.access_token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
        },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }),
      }),
      makeEnv(),
    );

    assert.equal(mcpResponse.status, 200);
    assert.equal(mcpResponse.headers.get('mcp-session-id'), 'session-123');
    assert.equal(upstreamCalls.length, 1);
    assert.equal(upstreamCalls[0].url, 'https://youtube-transcript-notion-mcp.createsomething.workers.dev/mcp');
    assert.equal(upstreamCalls[0].authorization, 'Bearer upstream-secret');
    assert.match(upstreamCalls[0].body, /tools\/list/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('invalid connector password does not issue an authorization code', async () => {
  const response = await worker.fetch(
    new Request(`${ORIGIN}/oauth/authorize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        response_type: 'code',
        client_id: 'claude-test',
        redirect_uri: 'https://claude.ai/api/mcp/auth/callback',
        password: 'wrong',
      }).toString(),
    }),
    makeEnv(),
  );

  assert.equal(response.status, 401);
  assert.equal(response.headers.get('location'), null);
});
