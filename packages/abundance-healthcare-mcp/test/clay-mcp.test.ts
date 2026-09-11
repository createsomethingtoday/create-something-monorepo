import test from 'node:test';
import assert from 'node:assert/strict';
import { callClayEnrichment } from '../src/index';
test('Clay request uses authenticated POST and polling uses GET without another request', async () => {
  const id = 'npgclay_12345678-1234-1234-1234-123456789012';
  for (const input of [{ npi: '1000000000', confirm_paid_enrichment: true as const }, { id }]) {
    const read = 'id' in input;
    const result = await callClayEnrichment(input, {
      agencyApiKey: 'secret',
      fetchFn: async (url, init) => {
        assert.equal(
          new URL(String(url)).pathname,
          '/api/abundance/healthcare-providers/enrichment'
        );
        assert.equal(init?.method, read ? 'GET' : 'POST');
        assert.equal(new Headers(init?.headers).get('Authorization'), 'Bearer secret');
        if (read) {
          assert.equal(init?.body, undefined);
          assert.equal(new URL(String(url)).searchParams.get('id'), id);
        } else assert.deepEqual(JSON.parse(String(init?.body)), input);
        return Response.json({ success: true, data: { id, status: 'pending' } });
      }
    });
    assert.equal(result.id, id);
    assert.equal(JSON.stringify(result).includes('secret'), false);
  }
});
test('Clay upstream failure is sanitized and not retried', async () => {
  let calls = 0;
  await assert.rejects(
    callClayEnrichment(
      { npi: '1000000000', confirm_paid_enrichment: true },
      {
        agencyApiKey: 'secret',
        fetchFn: async () => {
          calls++;
          return new Response('secret callback body', { status: 503 });
        }
      }
    ),
    (e) => e instanceof Error && !e.message.includes('secret') && e.message.includes('existing job')
  );
  assert.equal(calls, 1);
});
