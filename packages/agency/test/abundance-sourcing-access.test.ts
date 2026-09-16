import test from 'node:test';
import assert from 'node:assert/strict';
import { GET, POST } from '../src/routes/api/abundance/healthcare-providers/sourcing/+server.ts';

test('sourcing rejects unrelated signed-in users and geocode writes reject client sessions', async () => {
  const base = {
    url: new URL('https://example.test/api/abundance/healthcare-providers/sourcing'),
    locals: { user: { email: 'user@unrelated.test' } },
    platform: { env: { DB: {}, AGENCY_INTERNAL_API_KEY: 'service-key' } }
  };
  const result = await GET({ ...base, request: new Request(base.url) } as never);
  assert.equal(result.status, 403);
  const write = await POST({
    ...base,
    locals: { user: { email: 'recruiter@thenpgroup.com' } },
    request: new Request(base.url, { method: 'POST', body: '{}' })
  } as never);
  assert.equal(write.status, 401);
});
