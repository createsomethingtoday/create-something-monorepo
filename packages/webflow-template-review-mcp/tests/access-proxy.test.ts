import assert from 'node:assert/strict';
import test from 'node:test';

import { handleAccessProxyRequest } from '../src/access-proxy.js';

const PROXY_ORIGIN = 'https://webflow-template-review-mcp-access.createsomething.workers.dev';
const UPSTREAM_ORIGIN = 'https://webflow-template-review-mcp.createsomething.workers.dev';

test('Access proxy fails closed without the Access application assertion', async () => {
  const response = await handleAccessProxyRequest(
    new Request(`${PROXY_ORIGIN}/mcp`, { method: 'POST', body: '{}' }),
    { upstreamOrigin: UPSTREAM_ORIGIN },
  );

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), {
    error: 'unauthorized',
    message: 'Missing Cloudflare Access application assertion.',
  });
});

test('Access proxy exposes only the dedicated MCP route', async () => {
  const response = await handleAccessProxyRequest(
    new Request(`${PROXY_ORIGIN}/health`, {
      headers: { 'Cf-Access-Jwt-Assertion': 'signed-access-assertion' },
    }),
    { upstreamOrigin: UPSTREAM_ORIGIN },
  );

  assert.equal(response.status, 404);
});

test('Access proxy forwards the signed assertion and MCP transport headers to the isolated upstream route', async () => {
  let forwarded: Request | null = null;
  const response = await handleAccessProxyRequest(
    new Request(`${PROXY_ORIGIN}/mcp?session=one`, {
      method: 'POST',
      headers: {
        accept: 'application/json, text/event-stream',
        'content-type': 'application/json',
        'mcp-protocol-version': '2025-03-26',
        'mcp-session-id': 'session-one',
        'cf-access-jwt-assertion': 'signed-access-assertion',
        'cf-access-authenticated-user-email': 'forged@example.com',
        authorization: 'Bearer opaque-managed-oauth-token',
      },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'initialize', id: 1 }),
    }),
    {
      upstreamOrigin: UPSTREAM_ORIGIN,
      fetch: async (request) => {
        forwarded = request;
        return new Response('forwarded', {
          status: 202,
          headers: { 'mcp-session-id': 'upstream-session' },
        });
      },
    },
  );

  assert.equal(response.status, 202);
  assert.equal(await response.text(), 'forwarded');
  assert.equal(response.headers.get('mcp-session-id'), 'upstream-session');
  assert.ok(forwarded);
  assert.equal(forwarded.url, `${UPSTREAM_ORIGIN}/access/mcp?session=one`);
  assert.equal(forwarded.method, 'POST');
  assert.equal(forwarded.headers.get('cf-access-jwt-assertion'), 'signed-access-assertion');
  assert.equal(forwarded.headers.get('mcp-protocol-version'), '2025-03-26');
  assert.equal(forwarded.headers.get('mcp-session-id'), 'session-one');
  assert.equal(forwarded.headers.get('cf-access-authenticated-user-email'), null);
  assert.equal(forwarded.headers.get('authorization'), null);
  assert.deepEqual(await forwarded.json(), { jsonrpc: '2.0', method: 'initialize', id: 1 });
});

test('Access proxy rejects an invalid upstream origin before forwarding', async () => {
  const response = await handleAccessProxyRequest(
    new Request(`${PROXY_ORIGIN}/mcp`, {
      headers: { 'Cf-Access-Jwt-Assertion': 'signed-access-assertion' },
    }),
    { upstreamOrigin: 'http://localhost:8787' },
  );

  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), {
    error: 'misconfigured',
    message: 'Access proxy upstream is not configured.',
  });

  const wrongWorker = await handleAccessProxyRequest(
    new Request(`${PROXY_ORIGIN}/mcp`, {
      headers: { 'Cf-Access-Jwt-Assertion': 'signed-access-assertion' },
    }),
    { upstreamOrigin: 'https://attacker.workers.dev' },
  );

  assert.equal(wrongWorker.status, 500);
});
