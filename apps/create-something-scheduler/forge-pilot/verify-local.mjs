import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { CloudflareApiClient, CloudflareApi } from './generated/sdk/index.ts';
import { handleApiRequest } from '../src/http/api.ts';

const seen = [];
const link = { durationMinutes: 30, durationOptionsMinutes: [30, 60] };
const availability = (durationMinutes, status = 'available') => ({
  status,
  durationMinutes,
  timezone: 'America/Chicago',
  slots: status === 'available' ? [{ start: '2026-10-01T15:00:00.000Z', end: '2026-10-01T16:00:00.000Z' }] : [],
  receiptId: 'local-read-receipt',
  policyVersion: 'local-test',
  occurredAt: '2026-09-28T18:00:00.000Z',
  nextActions: []
});
const service = {
  getLink: async () => link,
  listAvailability: async ({ from, durationMinutes }) =>
    availability(durationMinutes ?? 30, from === '2026-10-02' ? 'retryable' : 'available')
};
const server = createServer(async (incoming, outgoing) => {
  const url = `http://127.0.0.1:${server.address().port}${incoming.url}`;
  seen.push({ method: incoming.method, path: new URL(url).pathname, query: Object.fromEntries(new URL(url).searchParams), authorization: incoming.headers.authorization ?? null });
  try {
    const response = await handleApiRequest(new Request(url, { method: incoming.method, headers: incoming.headers }), service);
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    outgoing.writeHead(500);
    outgoing.end(String(error));
  }
});

server.listen(0, '127.0.0.1');
await once(server, 'listening');
try {
  const client = new CloudflareApiClient({ baseUrl: `http://127.0.0.1:${server.address().port}`, maxRetries: 0 });
  assert.deepEqual(await client.getLink(), link);
  const query = { from: '2026-10-01', to: '2026-10-03', timezone: 'America/Chicago', durationMinutes: 60 };
  assert.deepEqual(await client.listAvailability(query), availability(60));
  let retryableError;
  try {
    await client.listAvailability({ ...query, from: '2026-10-02' });
  } catch (error) {
    retryableError = error;
  }
  assert.ok(retryableError instanceof CloudflareApi.ServiceUnavailableError);
  assert.equal(retryableError.statusCode, 503);
  assert.deepEqual(retryableError.body, availability(60, 'retryable'));
  assert.deepEqual(seen.map(({ method, path }) => `${method} ${path}`), [
    'GET /api/v1/links/createsomething/together',
    'GET /api/v1/availability',
    'GET /api/v1/availability'
  ]);
  assert.deepEqual(seen[1].query, { ...query, durationMinutes: '60' });
  assert.ok(seen.every((request) => request.authorization === null));
  console.log(JSON.stringify({
    handler: 'src/http/api.ts handleApiRequest',
    sdk: 'patched Forge scratch checkout',
    link,
    availability: availability(60),
    retryableStatus: retryableError.statusCode,
    retryableBody: retryableError.body,
    requests: seen
  }, null, 2));
} finally {
  server.close();
  await once(server, 'close');
}
