import { env, runInDurableObject, SELF } from 'cloudflare:test';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DurableOAuthStore } from './auth/durable-oauth-store.js';

const primary = 'micah@createsomething.io';
const halfDozen = 'mj@halfdozen.co';
const busy = { start: '2037-07-28T20:00:00Z', end: '2037-07-28T20:30:00Z' };
const operatorHeaders = {
  authorization: 'Bearer controlled-operator-token',
  'content-type': 'application/json'
};

beforeEach(async () => {
  await runInDurableObject(env.SCHEDULER.getByName('micah-johnson'), async (_instance, state) => {
    await new DurableOAuthStore(state, 'controlled-oauth-encryption-secret').write({
      accessToken: 'controlled-access-token', refreshToken: 'controlled-refresh-token',
      expiresAt: '2099-07-11T18:00:00Z',
      grantedScopes: ['https://www.googleapis.com/auth/calendar.freebusy']
    });
    // Existing installations have persisted discovery that predates the required source.
    state.storage.kv.put('google:calendar-configuration', {
      selectedCalendarIds: [primary], eventCalendarId: primary
    });
    state.storage.kv.put('projection:webflow-google-calendar', {
      source: 'webflow-google-calendar', rangeStart: '2020-01-01T00:00:00Z',
      rangeEnd: '2099-12-31T00:00:00Z', observedAt: new Date().toISOString(),
      expiresAt: '2099-07-11T17:00:00Z', intervals: []
    });
  });
});
afterEach(() => vi.restoreAllMocks());

function mockCalendar(readHalfDozen: () => unknown) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    // A rejected booking must never reach event creation or email delivery.
    expect(String(input)).toBe('https://www.googleapis.com/calendar/v3/freeBusy');
    const requested = JSON.parse(String(init?.body)).items as Array<{ id: string }>;
    return Response.json({ calendars: Object.fromEntries(requested.map(({ id }) => [
      id, id === halfDozen ? readHalfDozen() : { busy: [] }
    ])) });
  });
}

function availability(duration: number) {
  return SELF.fetch('https://scheduler.local/api/v1/availability?' + new URLSearchParams({
    from: '2037-07-28T16:00:00Z', to: '2037-07-28T22:00:00Z',
    timezone: 'America/Chicago', durationMinutes: String(duration)
  }));
}

describe('required Half Dozen conflict coverage through the Worker', () => {
  it.each([30, 60])('excludes Half Dozen conflicts for %i-minute slots despite old discovery', async duration => {
    mockCalendar(() => ({ busy: [busy] }));
    const response = await availability(duration);
    expect(response.status).toBe(200);
    const body = await response.json() as { slots: Array<{ start: string; end: string }> };
    expect(body.slots).toContainEqual({ start: '2037-07-28T18:00:00Z', end: duration === 30 ? '2037-07-28T18:30:00Z' : '2037-07-28T19:00:00Z' });
    expect(body.slots.some(slot => slot.start < busy.end && busy.start < slot.end)).toBe(false);
  });

  it.each([undefined, { errors: [{ reason: 'notFound' }] }])('fails availability and readiness closed for missing or denied Half Dozen (%j)', async missing => {
    mockCalendar(() => missing);
    const response = await availability(30);
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ status: 'retryable', reason: 'provider_calendar_error', slots: [] });
    expect((await SELF.fetch('https://scheduler.local/ready')).status).toBe(503);
    const status = await SELF.fetch('https://scheduler.local/api/v1/operator/status', { headers: operatorHeaders });
    expect(await status.json()).toMatchObject({ ready: false, requiredCalendarCoverage: { status: 'unavailable' } });
  });

  it('reports ready when required coverage is confirmed', async () => {
    mockCalendar(() => ({ busy: [] }));
    expect((await SELF.fetch('https://scheduler.local/ready')).status).toBe(200);
    const status = await SELF.fetch('https://scheduler.local/api/v1/operator/status', { headers: operatorHeaders });
    expect(await status.json()).toMatchObject({ ready: true, requiredCalendarCoverage: { status: 'available' } });
  });

  it('rejects a booking if Half Dozen becomes busy after preparation', async () => {
    let intervals: typeof busy[] = [];
    mockCalendar(() => ({ busy: intervals }));
    const prepare = await SELF.fetch('https://scheduler.local/api/v1/bookings/prepare', {
      method: 'POST', headers: operatorHeaders,
      body: JSON.stringify({ slot: busy, timezone: 'America/Chicago', scheduler: { name: 'Controlled test', email: 'controlled@example.com' } })
    });
    expect(prepare.status).toBe(200);
    const proposal = await prepare.json() as { proposalToken: string };
    intervals = [busy];
    const commit = await SELF.fetch('https://scheduler.local/api/v1/bookings', {
      method: 'POST', headers: operatorHeaders,
      body: JSON.stringify({ proposalToken: proposal.proposalToken, idempotencyKey: 'required-hd-conflict', explicitIntent: true })
    });
    expect(commit.status).toBe(409);
    expect(await commit.json()).toMatchObject({ status: 'rejected', reason: 'slot_unavailable' });
  });
});
