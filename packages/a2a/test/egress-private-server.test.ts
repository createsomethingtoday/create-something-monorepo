import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { AddressInfo } from 'node:net';
import { createSenderServer } from '../sender/server.mjs';
import { CallbackTransportError } from '../sender/policy.mjs';
import { callbackPost, type CallbackSenderEnv } from '../src/egress';

const token = 'fixture_sender_token_at_least_32_characters';
const headers = { 'content-type': 'application/json', 'webhook-id': 'evt_fixture', 'webhook-timestamp': '1', 'webhook-signature': 'v1,fixture', 'x-mcp-subscription-id': 'sub_fixture' };

test('private sender refuses missing auth, wrong auth, proxy paths and unsupported envelopes', async () => {
  let sends = 0;
  const server = createSenderServer({ token, send: async () => { sends++; return { status: 204, body: '' }; } });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const root = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    for (const auth of ['', `Bearer ${'x'.repeat(40)}`]) {
      const response = await fetch(`${root}/send`, { method: 'POST', headers: { authorization: auth, 'content-type': 'application/json' }, body: '{}' });
      assert.equal(response.status, 401);
      await response.body?.cancel();
    }
    const routed = await fetch(`${root}/anything`, { method: 'POST', headers: { authorization: `Bearer ${token}` }, body: '{}' });
    assert.equal(routed.status, 404);
    await routed.body?.cancel();
    const malformed = await fetch(`${root}/send`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', 'x-a2a-deadline-at': String(Date.now() + 10000) }, body: JSON.stringify({ url: 'https://hooks.example.net/', body: '{}', headers, overrides: { resolve: 'evil' } }) });
    assert.equal(malformed.status, 400);
    await malformed.body?.cancel();
    assert.equal(sends, 0);
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
});

test('private sender preserves the signed envelope and never returns provider exception text', async () => {
  const body = '{ "value": "🧭" }\n';
  let calls = 0;
  const server = createSenderServer({ token, send: async (url, actualBody, actualHeaders, options) => {
    calls++;
    assert.equal(url, 'https://hooks.example.net/');
    assert.equal(actualBody, body);
    assert.deepEqual(actualHeaders, headers);
    assert.ok(options?.signal);
    assert.ok(options?.deadlineMs && options.deadlineMs <= 10000);
    if (calls === 1) return { status: 202, body: 'ok' };
    throw new Error('https://secret.example/provider?token=secret payload-secret');
  } });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const root = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    const init = { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', 'x-a2a-deadline-at': String(Date.now() + 10000) }, body: JSON.stringify({ url: 'https://hooks.example.net/', body, headers }) };
    const first = await fetch(`${root}/send`, init);
    assert.deepEqual(await first.json(), { status: 202, body: 'ok' });
    const second = await fetch(`${root}/send`, init);
    assert.equal(await second.text(), '{"error":"callback_failed"}');
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
});

test('stale private deadline cannot start a callback after container cold startup', async () => {
  let sends = 0;
  const server = createSenderServer({ token, send: async () => { sends++; return { status: 204, body: '' }; } });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const root = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    const result = await fetch(`${root}/send`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', 'x-a2a-deadline-at': String(Date.now() - 1) },
      body: JSON.stringify({ url: 'https://hooks.example.net/', body: '{}', headers }),
    });
    assert.equal(result.status, 408);
    await result.body?.cancel();
    assert.equal(sends, 0);
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
});

function boundEnv(fetch: (request: Request) => Promise<Response>): CallbackSenderEnv {
  return { CALLBACK_SENDER_TOKEN: token, CALLBACK_SENDER: {
    idFromName: (name) => { assert.equal(name, 'callback-egress-v1'); return {} as DurableObjectId; },
    get: () => ({ fetch }),
  } };
}

test('Worker helper sends exact body through only the private binding', async () => {
  const body = '{ "value": "🧭" }\n';
  const env = boundEnv(async request => {
    assert.equal(request.url, 'http://callback-sender/send');
    assert.equal(request.headers.get('authorization'), `Bearer ${token}`);
    const remaining = Number(request.headers.get('x-a2a-deadline-at')) - Date.now();
    assert.ok(remaining > 0 && remaining <= 10000);
    assert.deepEqual(await request.json(), { url: 'https://hooks.example.net/', body, headers });
    return Response.json({ status: 202, body: 'accepted' });
  });
  assert.deepEqual(await callbackPost(env, 'https://hooks.example.net/', body, headers), { status: 202, body: 'accepted' });
});

test('Worker helper rejects oversized or invalid private responses and redacts exceptions', async () => {
  const cases = [
    async () => Response.json({ status: 200, body: 'x'.repeat(65537) }),
    async () => Response.json({ status: 200.5, body: '' }),
    async () => Response.json({ status: 200, body: '' }, { status: 307 }),
    async () => new Response('x'.repeat(64 * 1024 * 6 + 16 * 1024 + 1)),
    async () => { throw new Error('callback-url-secret body-secret'); },
  ];
  for (const fetch of cases) {
    await assert.rejects(callbackPost(boundEnv(fetch), 'https://hooks.example.net/', '{}', headers), error => {
      assert.ok(error instanceof CallbackTransportError);
      assert.equal(error.message, 'callback_sender_failed');
      return true;
    });
  }
});
