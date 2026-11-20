import test from 'node:test';
import assert from 'node:assert/strict';
import { triggerEnrichmentRecovery } from '../worker/recovery-trigger.js';

test('scheduled recovery sends one bounded authenticated receipt-only request', async () => {
  const calls: string[] = [];
  await triggerEnrichmentRecovery({ AGENCY_INTERNAL_API_KEY: 'fixture-key' }, async (input, init) => {
    calls.push(String(input));
    assert.equal(init?.method, 'POST');
    assert.equal(init?.redirect, 'manual');
    assert.equal(new Headers(init?.headers).get('Authorization'), 'Bearer fixture-key');
    assert.ok(init?.signal);
    assert.equal(init?.body, undefined);
    return Response.json({ success: true });
  });
  assert.deepEqual(calls, ['https://createsomething.agency/api/abundance/healthcare-providers/reconcile']);
});

test('recovery never retries or follows redirects and never logs credentials', async () => {
  for (const status of [302, 401, 503]) {
    let calls = 0;
    await assert.rejects(triggerEnrichmentRecovery({ AGENCY_INTERNAL_API_KEY: 'fixture-key' }, async () => {
      calls++;
      return new Response('sensitive provider output', {status});
    }), error => error instanceof Error && !/fixture-key|sensitive/.test(error.message));
    assert.equal(calls, 1);
  }
});

test('recovery rejects missing credentials and a noncanonical destination before dispatch', async () => {
  let calls = 0;
  for (const env of [{}, {AGENCY_INTERNAL_API_KEY:'fixture-key', AGENCY_BASE_URL:'https://other.test'}]) {
    await assert.rejects(triggerEnrichmentRecovery(env, async () => {calls++;return Response.json({});}));
  }
  assert.equal(calls, 0);
});
