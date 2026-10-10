import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { createSchedulerReadClient } from '@create-something/create-something-scheduler/public-read';

/** Both requests go through the consumer export, not raw fetch or a service double. */
export async function smokePublicReads({ baseUrl, from, to, timezone = 'America/Chicago' }) {
  const client = createSchedulerReadClient({ baseUrl });
  const link = await client.getLink();
  assert.equal(link.durationMinutes, 30);
  assert.deepEqual(link.durationOptionsMinutes, [30, 60]);
  const availability = await client.listAvailability({ from, to, timezone, durationMinutes: 60 });
  assert.equal(availability.status, 'available');
  assert.equal(availability.durationMinutes, 60);
  return { link, availability };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const tomorrow = `${new Date(Date.now() + 86400000).toISOString().slice(0, 10)}T00:00:00Z`;
  const dayAfter = `${new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10)}T00:00:00Z`;
  const baseUrl = process.env.SCHEDULER_READ_ORIGIN ?? 'https://schedule.createsomething.agency';
  const { link, availability } = await smokePublicReads({
    baseUrl,
    from: process.env.SCHEDULER_READ_FROM ?? tomorrow,
    to: process.env.SCHEDULER_READ_TO ?? dayAfter
  });
  // Do not log provider or customer data; successful empty availability is valid.
  console.log(JSON.stringify({ baseUrl, linkStatus: 200, availabilityStatus: 200,
    durationOptionsMinutes: link.durationOptionsMinutes,
    slotCount: availability.slots.length, policyVersion: availability.policyVersion }, null, 2));
}
