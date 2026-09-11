import test from 'node:test';
import assert from 'node:assert/strict';
import { POST } from '../src/routes/api/abundance/healthcare-providers/travel/+server.ts';
test('travel calculations require service authorization even for a signed-in client', async () => {
  const request = new Request('https://example.test/api/abundance/healthcare-providers/travel', {
    method: 'POST',
    body: '{}'
  });
  const response = await POST({
    request,
    locals: { user: { email: 'recruiter@thenpgroup.com' } },
    platform: { env: { DB: {}, AGENCY_INTERNAL_API_KEY: 'key', GEOCODIO_API_KEY: 'vendor' } }
  } as never);
  assert.equal(response.status, 401);
});

test('travel CSV rejects unrelated users and redirects signed-out users to sign in', async () => {
  const { GET } = await import('../src/routes/delivery/abundance/travel.csv/+server.ts');
  const base = {
    url: new URL('https://example.test/delivery/abundance/travel.csv?id=abtravel_test'),
    platform: { env: { DB: {} } }
  };
  await assert.rejects(
    async () => await GET({ ...base, locals: { user: { email: 'user@unrelated.test' } } } as never),
    (e: unknown) => (e as { status: number }).status === 403
  );
  await assert.rejects(
    async () => await GET({ ...base, locals: {} } as never),
    (e: unknown) => {
      const r = e as { status: number; location: string };
      return r.status === 303 && r.location.startsWith('/login?redirect=');
    }
  );
});
