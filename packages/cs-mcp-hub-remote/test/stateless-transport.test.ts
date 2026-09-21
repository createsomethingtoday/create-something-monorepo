import assert from 'node:assert/strict';
import test from 'node:test';
import hubWorker from '../index.ts';

const env = {
  HUB_API_TOKEN: 'fixture-token', HUB_ENABLED_SERVERS: '[]', HUB_ENABLED_BUNDLES: '[]',
  HUB_IDENTITY_MODE: 'compat',
} as any;
const ctx = { waitUntil() {} } as any;

for (const method of ['GET', 'DELETE']) {
  test(`authenticated stateless ${method} rejects before runtime discovery`, async (t) => {
    const network = t.mock.method(globalThis, 'fetch', async () => { throw new Error('unexpected network'); });
    for (const path of ['/mcp', '/mcp/']) {
      for (const accept of ['application/json', 'text/event-stream']) {
        const response = await hubWorker.fetch(new Request(`https://fixture.test${path}`, {
          method, headers: { Authorization: 'Bearer fixture-token', Accept: accept },
        }), env, ctx);
        assert.equal(response.status, 405);
        assert.equal(response.headers.get('Allow'), 'POST, OPTIONS');
        assert.equal(response.headers.get('Access-Control-Allow-Origin'), '*');
        assert.equal(await response.text(), '');
      }
    }
    assert.equal(network.mock.callCount(), 0);
  });
  test(`unauthenticated ${method} retains authentication challenge`, async () => {
    const response = await hubWorker.fetch(new Request('https://fixture.test/mcp', { method }), env, ctx);
    assert.equal(response.status, 401);
    assert.match(response.headers.get('WWW-Authenticate') ?? '', /resource_metadata=/);
  });
}

test('stateless transport preserves preflight and POST initialize', async () => {
  const preflight = await hubWorker.fetch(new Request('https://fixture.test/mcp', { method: 'OPTIONS' }), env, ctx);
  assert.equal(preflight.status, 204);
  const response = await hubWorker.fetch(new Request('https://fixture.test/mcp', {
    method: 'POST', headers: { Authorization: 'Bearer fixture-token', 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {
      protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'fixture', version: '1' },
    } }),
  }), env, ctx);
  assert.equal(response.status, 200);
  assert.equal((await response.json() as any).result.serverInfo.name, 'create-something-hub-remote');
});
