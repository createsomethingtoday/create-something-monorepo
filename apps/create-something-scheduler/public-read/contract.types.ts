import { createSchedulerReadClient, type DurationMinutes } from '@create-something/create-something-scheduler/public-read';

const client = createSchedulerReadClient();
const duration: DurationMinutes = 60;
void client.listAvailability({ from: '2026-10-01', to: '2026-10-02', timezone: 'UTC', durationMinutes: duration });
// @ts-expect-error The only public operations are getLink and listAvailability.
client.fetch('/api/v1/bookings', { method: 'POST' });
// @ts-expect-error No booking writes.
client.commitBooking({});
// @ts-expect-error No credentials or headers accepted.
createSchedulerReadClient({ headers: { authorization: 'Bearer forbidden' } });
// @ts-expect-error No arbitrary transport accepted.
createSchedulerReadClient({ fetch: globalThis.fetch });
// @ts-expect-error Unsupported durations rejected statically and at runtime.
client.listAvailability({ from: '2026-10-01', to: '2026-10-02', timezone: 'UTC', durationMinutes: 90 });
// @ts-expect-error No request options exposing header/query/method overrides.
client.getLink({ headers: { authorization: 'Bearer forbidden' } });
// @ts-expect-error Generated internals have no package export.
import { CloudflareApiClient } from '@create-something/create-something-scheduler/public-read/generated/sdk/index.js';
