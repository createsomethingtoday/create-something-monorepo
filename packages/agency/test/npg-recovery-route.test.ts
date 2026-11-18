import test from 'node:test';
import assert from 'node:assert/strict';
import { POST } from '../src/routes/api/abundance/healthcare-providers/reconcile/+server';

function event(authorization?: string, db?: unknown) {
  return {
    request: new Request('https://createsomething.agency/api/abundance/healthcare-providers/reconcile', {
      method: 'POST', headers: authorization ? { authorization } : {}
    }),
    locals: { user: { email: 'synthetic@thenpgroup.com' } },
    platform: { env: { AGENCY_INTERNAL_API_KEY: 'synthetic-internal-key', DB: db } }
  } as never;
}

test('recovery requires service authority even with a signed-in user', async () => {
  const db = { prepare() { assert.fail('unauthorized request reached storage'); } };
  for (const auth of [undefined, 'Bearer incorrect']) {
    const response = await POST(event(auth, db));
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { success: false });
  }
});

test('recovery fails closed without database and returns only aggregate counts for an empty batch', async () => {
  assert.equal((await POST(event('Bearer synthetic-internal-key'))).status, 503);
  let reads = 0;
  const db = { prepare() { return { bind() { return { async all() { reads++; return { results: [] }; } }; } }; } };
  const response = await POST(event('Bearer synthetic-internal-key', db));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), { success: true, processed: 0 });
  assert.equal(reads, 2);
});
