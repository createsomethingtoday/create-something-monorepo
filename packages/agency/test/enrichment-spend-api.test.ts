import test from 'node:test';
import assert from 'node:assert/strict';
import { GET, POST } from '../src/routes/api/abundance/enrichment-budget/+server';
function event(method = 'GET', body?: unknown, authorization?: string) {
  const url = new URL(
    'https://createsomething.agency/api/abundance/enrichment-budget?provider=pdl'
  );
  return {
    url,
    request: new Request(url, {
      method,
      headers: { ...(authorization ? { authorization } : {}), 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {})
    }),
    locals: { user: { email: 'synthetic@thenpgroup.com' } },
    platform: {
      env: {
        AGENCY_INTERNAL_API_KEY: 'test-key',
        DB: {
          prepare() {
            throw Error('unexpected DB read');
          }
        }
      }
    }
  } as never;
}
test('spend API requires internal bearer even when user session exists', async () => {
  for (const auth of [undefined, 'Bearer wrong']) {
    assert.equal((await GET(event('GET', undefined, auth))).status, 401);
    assert.equal((await POST(event('POST', { provider: 'pdl' }, auth))).status, 401);
  }
});
test('spend API rejects unknown data, credentials/contact fields and malformed grants before DB writes', async () => {
  for (const body of [
    { provider: 'pdl', digest: 'a'.repeat(64), npi: '1234567893', maximum_usd: 100 },
    {
      action: 'record',
      grant: { id: 'a'.repeat(64), provider: 'pdl', token: 'test', npi: '1234567893' },
      event_id: 'receipt',
      status: 'complete',
      secret: 'credentials'
    },
    {
      action: 'record',
      grant: {
        id: 'a'.repeat(64),
        provider: 'pdl',
        token: 'test',
        npi: '1234567893',
        email: 'private@example.com'
      },
      event_id: 'receipt',
      status: 'complete'
    },
    {
      action: 'record',
      grant: { id: 'a'.repeat(64), provider: 'pdl', token: 'test', npi: '1234567893' },
      event_id: 'private@example.com',
      status: 'complete'
    }
  ])
    assert.equal((await POST(event('POST', body, 'Bearer test-key'))).status, 400);
});
