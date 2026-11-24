import test from 'node:test';
import assert from 'node:assert/strict';
import { GET } from '../src/routes/api/abundance/healthcare-providers/jobs/+server.ts';
const event = (email?: string, db?: unknown, search = '') => ({
  request: new Request('https://example.com/api/jobs'),
  url: new URL(`https://example.com/api/jobs${search}`),
  locals: { user: email ? { email } : undefined },
  platform: { env: { DB: db } }
});
test('anonymous and non-client sessions cannot query jobs', async () => {
  for (const email of [undefined, 'outsider@example.com']) {
    const response = await GET(event(email) as never);
    assert.equal(response.status, 403);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
  }
});
test('NPG sessions get explicit database unavailable and input errors', async () => {
  assert.equal((await GET(event('nurse@thenpgroup.com') as never)).status, 503);
  assert.equal((await GET(event('nurse@thenpgroup.com', {}, '?limit=999') as never)).status, 400);
});
test('query failures hide database internals', async () => {
  const response = await GET(
    event('nurse@thenpgroup.com', {
      prepare() {
        throw new TypeError('secret connection string');
      }
    }) as never
  );
  assert.equal(response.status, 503);
  assert.ok(!(await response.text()).includes('secret'));
});
