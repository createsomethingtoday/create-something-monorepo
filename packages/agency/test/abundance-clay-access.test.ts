import test from 'node:test';
import assert from 'node:assert/strict';
import { POST, GET } from '../src/routes/api/abundance/healthcare-providers/enrichment/+server';
import { POST as callback } from '../src/routes/api/webhooks/npg-clay/+server';
test('enrichment read and paid dispatch require service authorization even for signed-in clients', async () => {
  for (const handler of [POST, GET]) {
    let accessed = false;
    const response = await handler({
      request: new Request('https://example.test/api/abundance/healthcare-providers/enrichment'),
      url: new URL('https://example.test'),
      locals: { user: { email: 'recruiter@thenpgroup.com' } },
      platform: {
        env: {
          AGENCY_INTERNAL_API_KEY: 'test-key',
          get DB() {
            accessed = true;
            throw Error('unauthorized database access');
          }
        }
      }
    } as never);
    assert.equal(response.status, 401);
    assert.equal(accessed, false);
  }
});
test('disabled integration fails closed before dispatch', async () => {
  let dispatched = false;
  const response = await POST({
    request: new Request('https://example.test', {
      method: 'POST',
      headers: { Authorization: 'Bearer test-key' },
      body: '{}'
    }),
    platform: { env: { AGENCY_INTERNAL_API_KEY: 'test-key', DB: {} } },
    fetch: async () => {
      dispatched = true;
      throw Error('unexpected');
    }
  } as never);
  assert.equal(response.status, 503);
  assert.equal(dispatched, false);
});
test('callback without scoped token cannot access the database', async () => {
  const response = await callback({
    request: new Request('https://example.test', {
      method: 'POST',
      body: JSON.stringify({ request_id: 'forged', result: { outcome: 'candidate' } })
    }),
    platform: {
      env: {
        DB: {
          prepare() {
            throw Error('unexpected database access');
          }
        }
      }
    }
  } as never);
  assert.equal(response.status, 401);
});
