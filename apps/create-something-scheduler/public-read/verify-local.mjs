import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { createSchedulerReadClient, AvailabilityUnavailableError } from '@create-something/create-something-scheduler/public-read';
import { BookingService } from '../src/application/booking-service.ts';
import { handleApiRequest } from '../src/http/api.ts';
import { smokePublicReads } from './smoke.mjs';

assert.throws(() => import.meta.resolve('@create-something/create-something-scheduler/forge-pilot/generated/sdk/index.js'),
  { code: 'ERR_PACKAGE_PATH_NOT_EXPORTED' });

let calendarAvailable = true;
let calendarReads = 0;
let calendarWrites = 0;
const service = new BookingService({
  clock: { now: () => '2026-07-13T15:00:00Z' },
  calendar: {
    async listBusyIntervals() {
      calendarReads++;
      return calendarAvailable ? { status: 'available', intervals: [] } : { status: 'unavailable', reason: 'controlled_unavailable' };
    },
    async createEvent() { calendarWrites++; throw new Error('Public reads must not create events.'); }
  }
});
const requests = [];
const server = createServer(async (incoming, outgoing) => {
  try {
    const url = `http://127.0.0.1:${server.address().port}${incoming.url}`;
    const response = await handleApiRequest(new Request(url, {
      method: incoming.method, headers: incoming.headers
    }), service);
    const body = await response.text();
    requests.push({ method: incoming.method, path: new URL(url).pathname,
      query: Object.fromEntries(new URL(url).searchParams), status: response.status,
      authorization: incoming.headers.authorization ?? null, cookie: incoming.headers.cookie ?? null,
      body: JSON.parse(body) });
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    outgoing.end(body);
  } catch (error) {
    outgoing.writeHead(500);
    outgoing.end(String(error));
  }
});
server.listen(0, '127.0.0.1');
await once(server, 'listening');
try {
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const query = { from: '2026-07-14T00:00:00Z', to: '2026-07-15T00:00:00Z', timezone: 'America/Chicago' };
  const result = await smokePublicReads({ baseUrl, ...query });
  assert.equal(result.availability.slots.length, 11);
  assert.deepEqual(result.availability, requests[1].body);
  calendarAvailable = false;
  await assert.rejects(createSchedulerReadClient({ baseUrl }).listAvailability({ ...query, durationMinutes: 60 }), (error) => {
    assert.ok(error instanceof AvailabilityUnavailableError);
    assert.equal(error.statusCode, 503);
    assert.deepEqual(error.body, requests[2].body);
    assert.equal(error.body.status, 'retryable');
    assert.deepEqual(error.body.slots, []);
    return true;
  });
  assert.deepEqual(requests.map(({ method, path, status }) => [method, path, status]), [
    ['GET', '/api/v1/links/createsomething/together', 200],
    ['GET', '/api/v1/availability', 200], ['GET', '/api/v1/availability', 503]
  ]);
  assert.deepEqual(requests[1].query, { ...query, durationMinutes: '60' });
  assert.ok(requests.every(({ authorization, cookie }) => authorization === null && cookie === null));
  assert.equal(calendarReads, 2);
  assert.equal(calendarWrites, 0);
  console.log(JSON.stringify({ handler: 'handleApiRequest', service: 'BookingService',
    provider: 'controlled CalendarPort', generatedSnapshot: 'patched pilot, not upstream release',
    statuses: requests.map(({ status }) => status), calendarReads, calendarWrites,
    slotCount: result.availability.slots.length, credentials: 'none' }, null, 2));
} finally {
  server.closeAllConnections();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}
