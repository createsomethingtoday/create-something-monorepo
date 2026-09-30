import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createBrokerClient, IntegrationError } from '../src/index.ts';

test('connection status uses trusted authorization and rejects a mismatched provider readback', async () => {
  const requests: Request[] = [];
  const broker = createBrokerClient({
    baseUrl: 'https://gigi.example.test',
    getAccessToken: async () => 'trusted-session',
    fetch: async (request) => {
      requests.push(request as Request);
      return Response.json({ provider: 'googlecalendar', state: 'connected', connectedAccountId: 'account-1' });
    },
  });

  await assert.rejects(broker.connectionStatus('gmail'), (error) =>
    error instanceof IntegrationError && error.reason === 'invalid_readback');
  assert.equal(requests.length, 1);
  assert.equal(requests[0]?.headers.get('authorization'), 'Bearer trusted-session');
  assert.equal(requests[0]?.headers.get('x-mcp-account-id'), null);
  assert.equal(new URL(requests[0]!.url).pathname, '/v1/gigi/connections/gmail');
});

test('begin connection sends one request and returns a bounded consent link', async () => {
  let calls = 0;
  const broker = createBrokerClient({
    baseUrl: 'https://gigi.example.test',
    getAccessToken: async () => 'trusted-session',
    fetch: async (request) => {
      calls++;
      const req = request as Request;
      assert.equal(req.method, 'POST');
      assert.equal(new URL(req.url).pathname, '/v1/gigi/connections/gmail/link');
      assert.deepEqual(await req.json(), { requestId: 'request-1' });
      return Response.json({ provider: 'gmail', status: 'awaiting_consent',
        attemptId: 'attempt-1', connectedAccountId: 'ca_123', url: 'https://connect.composio.dev/example',
        expiresAt: '2030-01-01T00:00:00Z' });
    },
  });
  const result = await broker.beginConnection('gmail', 'request-1');
  assert.equal(result.status, 'awaiting_consent');
  assert.equal(result.connectedAccountId, 'ca_123');
  assert.equal(calls, 1);
});

test('consent link without connected account ID fails closed', async () => {
  const broker = createBrokerClient({ baseUrl: 'https://gigi.example.test', getAccessToken: async () => 'token',
    fetch: async () => Response.json({ provider: 'gmail', status: 'awaiting_consent', attemptId: 'attempt-1',
      url: 'https://connect.composio.dev/example', expiresAt: '2030-01-01T00:00:00Z' }) });
  await assert.rejects(broker.beginConnection('gmail', 'request-1'), (error) =>
    error instanceof IntegrationError && error.reason === 'invalid_readback');
});

test('authorization failure remains a typed failure without exposing response content', async () => {
  const broker = createBrokerClient({
    baseUrl: 'https://gigi.example.test',
    getAccessToken: async () => 'trusted-session',
    fetch: async () => new Response('secret diagnostic', { status: 403 }),
  });
  await assert.rejects(broker.connectionStatus('gmail'), (error) =>
    error instanceof IntegrationError && error.reason === 'unauthorized');
});

test('connected status requires an account identity', async () => {
  const broker = createBrokerClient({
    baseUrl: 'https://gigi.example.test', getAccessToken: async () => 'trusted-session',
    fetch: async () => Response.json({ provider: 'gmail', state: 'connected' }),
  });
  await assert.rejects(broker.connectionStatus('gmail'), (error) =>
    error instanceof IntegrationError && error.reason === 'invalid_readback');
});

test('reconnectable is accepted only for attention status', async () => {
  const valid = createBrokerClient({ baseUrl: 'https://gigi.example.test', getAccessToken: async () => 'token',
    fetch: async () => Response.json({ provider: 'gmail', state: 'attention', connectedAccountId: 'ca_old', reconnectable: true }) });
  assert.equal((await valid.connectionStatus('gmail')).reconnectable, true);
  const invalid = createBrokerClient({ baseUrl: 'https://gigi.example.test', getAccessToken: async () => 'token',
    fetch: async () => Response.json({ provider: 'gmail', state: 'connected', connectedAccountId: 'ca_old', reconnectable: true }) });
  await assert.rejects(invalid.connectionStatus('gmail'), (error) => error instanceof IntegrationError && error.reason === 'invalid_readback');
});
