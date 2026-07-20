import { env, runInDurableObject, SELF } from 'cloudflare:test';
import { Temporal } from '@js-temporal/polyfill';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DurableOAuthStore } from './auth/durable-oauth-store.js';

afterEach(() => vi.restoreAllMocks());

function futurePolicyDate(dayOfWeek: number): Temporal.PlainDate {
  let date = Temporal.Now.plainDateISO('America/Chicago').add({ days: 7 });
  while (date.dayOfWeek !== dayOfWeek) date = date.add({ days: 1 });
  return date;
}

function policySlot(dayOfWeek: number, hour: number) {
  const date = futurePolicyDate(dayOfWeek);
  const start = date.toZonedDateTime({
    timeZone: 'America/Chicago',
    plainTime: Temporal.PlainTime.from({ hour })
  });
  return {
    start: start.toInstant().toString(),
    end: start.add({ minutes: 30 }).toInstant().toString()
  };
}

describe('scheduler Worker transport', () => {
  it('serves health, OpenAPI, and the public link contract', async () => {
    const health = await SELF.fetch('https://scheduler.local/health');
    expect(await health.json()).toEqual({
      ok: true,
      service: 'create-something-scheduler'
    });

    const openapi = await SELF.fetch('https://scheduler.local/openapi.json');
    expect(await openapi.json()).toMatchObject({
      openapi: '3.1.0',
      info: { title: 'CREATE SOMETHING Scheduler API' }
    });

    const link = await SELF.fetch(
      'https://scheduler.local/api/v1/links/createsomething/together'
    );
    expect(await link.json()).toMatchObject({
      slug: 'createsomething/together',
      durationMinutes: 30,
      timezone: 'America/Chicago'
    });

    const page = await SELF.fetch('https://scheduler.local/createsomething/together');
    expect(page.headers.get('content-type')).toContain('text/html');
    expect(page.headers.get('content-security-policy')).toContain(
      'frame-ancestors https://createsomething.agency'
    );
    expect(page.headers.get('content-security-policy')).toContain('https://api.fontshare.com');
    expect(page.headers.get('content-security-policy')).toContain('https://cdn.fontshare.com');
    expect(page.headers.get('content-security-policy')).toContain('https://cdn.jsdelivr.net');
    const pageHtml = await page.text();
    expect(pageHtml).toContain('Workflow Mapping Session | CREATE SOMETHING');
    expect(pageHtml).toContain('Choose a time');
    expect(pageHtml).toContain("type:'create-something:scheduler-lifecycle'");
    expect(pageHtml).toContain("notifyParent('booking_form_started'");
    expect(pageHtml).toContain("notifyParent('booking_initiated'");
    expect(pageHtml).toContain("notifyParent('booking_completed'");
    expect(pageHtml).not.toContain('must-not-cross@example.com');

    const room = await SELF.fetch('https://scheduler.local/rooms/room_controlled');
    expect(room.status).toBe(200);
    expect(room.headers.get('cache-control')).toBe('no-store');
    expect(room.headers.get('permissions-policy')).toContain('display-capture=(self)');
    expect(room.headers.get('content-security-policy')).toContain('https://*.realtime.cloudflare.com');
    expect(room.headers.get('content-security-policy')).toContain('https://*.dyte.in');
    expect(room.headers.get('content-security-policy')).toContain('wss://*.dyte.io');
    expect(room.headers.get('content-security-policy')).toContain('https://api.fontshare.com');
    expect(room.headers.get('content-security-policy')).toContain('https://cdn.fontshare.com');
    expect(room.headers.get('content-security-policy')).toContain('https://cdn.jsdelivr.net');
    expect(await room.text()).toContain('data-room-id="room_controlled"');
  });

  it('fails closed instead of exposing slots when OAuth credentials are absent', async () => {
    const readiness = await SELF.fetch('https://scheduler.local/ready');
    expect(readiness.status).toBe(503);
    expect(await readiness.json()).toEqual({
      ready: false,
      service: 'create-something-scheduler'
    });
    const response = await SELF.fetch(
      'https://scheduler.local/api/v1/availability?from=2026-07-14T00%3A00%3A00Z&to=2026-07-15T00%3A00%3A00Z&timezone=America%2FChicago'
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      status: 'retryable',
      reason: 'provider_unavailable',
      slots: []
    });
  });

  it('retries Calendar discovery through an operator-only recovery route', async () => {
    const stub = env.SCHEDULER.getByName('micah-johnson');
    await runInDurableObject(stub, async (_instance, state) => {
      await new DurableOAuthStore(state, 'controlled-oauth-encryption-secret').write({
        accessToken: 'controlled-access-token',
        refreshToken: 'controlled-refresh-token',
        expiresAt: '2099-07-11T18:00:00Z',
        grantedScopes: [
          'https://www.googleapis.com/auth/calendar.events',
          'https://www.googleapis.com/auth/calendar.freebusy',
          'https://www.googleapis.com/auth/calendar.calendarlist.readonly'
        ]
      });
    });
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      expect(String(input)).toContain('/calendar/v3/users/me/calendarList');
      return Response.json({
        items: [{
          id: 'micah@createsomething.io',
          selected: true,
          accessRole: 'owner',
          conferenceProperties: { allowedConferenceSolutionTypes: ['hangoutsMeet'] }
        }]
      });
    });

    const unauthorized = await SELF.fetch(
      'https://scheduler.local/api/v1/operator/calendars/discover',
      { method: 'POST' }
    );
    expect(unauthorized.status).toBe(403);

    const response = await SELF.fetch(
      'https://scheduler.local/api/v1/operator/calendars/discover',
      {
        method: 'POST',
        headers: { authorization: 'Bearer controlled-operator-token' }
      }
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      status: 'available',
      selectedCalendarIds: ['micah@createsomething.io'],
      eventCalendarId: 'micah@createsomething.io'
    });
  });

  it('opens and rolls back a bounded date through the operator availability override API', async () => {
    const overrideDate = futurePolicyDate(3);
    const overrideId = `worker-wednesday-${overrideDate}`;
    const stub = env.SCHEDULER.getByName('micah-johnson');
    await runInDurableObject(stub, async (_instance, state) => {
      await new DurableOAuthStore(state, 'controlled-oauth-encryption-secret').write({
        accessToken: 'controlled-access-token',
        refreshToken: 'controlled-refresh-token',
        expiresAt: '2099-07-11T18:00:00Z',
        grantedScopes: [
          'https://www.googleapis.com/auth/calendar.events',
          'https://www.googleapis.com/auth/calendar.freebusy',
          'https://www.googleapis.com/auth/calendar.calendarlist.readonly'
        ]
      });
      state.storage.kv.put('google:calendar-configuration', {
        selectedCalendarIds: ['micah@createsomething.io'],
        eventCalendarId: 'micah@createsomething.io'
      });
    });
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      expect(String(input)).toBe('https://www.googleapis.com/calendar/v3/freeBusy');
      return Response.json({
        calendars: { 'micah@createsomething.io': { busy: [] } }
      });
    });

    const endpoint = 'https://scheduler.local/api/v1/operator/availability-overrides';
    expect((await SELF.fetch(endpoint)).status).toBe(403);

    const applied = await SELF.fetch(endpoint, {
      method: 'POST',
      headers: {
        authorization: 'Bearer controlled-operator-token',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        overrideId,
        date: overrideDate.toString(),
        opensAt: '13:00',
        closesAt: '15:00',
        timezone: 'America/Chicago',
        reason: 'Controlled client meeting window',
        explicitIntent: true
      })
    });
    expect(applied.status).toBe(200);
    expect(await applied.json()).toMatchObject({
      status: 'applied',
      override: { overrideId, date: overrideDate.toString() }
    });

    const listed = await SELF.fetch(endpoint, {
      headers: { authorization: 'Bearer controlled-operator-token' }
    });
    expect(await listed.json()).toMatchObject({
      status: 'available',
      overrides: [{ overrideId }]
    });

    const availabilityUrl = `https://scheduler.local/api/v1/availability?from=${encodeURIComponent(`${overrideDate}T00:00:00Z`)}&to=${encodeURIComponent(`${overrideDate.add({ days: 1 })}T00:00:00Z`)}&timezone=America%2FChicago`;
    const opened = await SELF.fetch(availabilityUrl);
    const openedBody = await opened.json() as { status: string; slots: Array<{ start: string; end: string }> };
    expect(openedBody.status).toBe('available');
    expect(openedBody.slots).toHaveLength(4);
    expect(Date.parse(openedBody.slots[0].end) - Date.parse(openedBody.slots[0].start)).toBe(
      30 * 60 * 1000
    );

    const oneHour = await SELF.fetch(`${availabilityUrl}&durationMinutes=60`);
    const oneHourBody = await oneHour.json() as {
      durationMinutes: number;
      slots: Array<{ start: string; end: string }>;
    };
    expect(oneHourBody.durationMinutes).toBe(60);
    expect(oneHourBody.slots).toHaveLength(3);
    expect(Date.parse(oneHourBody.slots[2].end) - Date.parse(oneHourBody.slots[2].start)).toBe(
      60 * 60 * 1000
    );

    const deleted = await SELF.fetch(`${endpoint}/${overrideId}`, {
      method: 'DELETE',
      headers: {
        authorization: 'Bearer controlled-operator-token',
        'content-type': 'application/json'
      },
      body: JSON.stringify({ explicitIntent: true })
    });
    expect(deleted.status).toBe(200);
    expect(await deleted.json()).toMatchObject({
      status: 'deleted',
      overrideId
    });

    const closed = await SELF.fetch(availabilityUrl);
    expect(await closed.json()).toMatchObject({ status: 'available', slots: [] });
  });

  it('prepares, commits, and reads a booking through the Worker and host Durable Object', async () => {
    const bookingSlot = policySlot(2, 11);
    const rescheduleSlot = policySlot(4, 13);
    const rescheduleDay = new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'America/Chicago'
    }).format(new Date(rescheduleSlot.start));
    const stub = env.SCHEDULER.getByName('micah-johnson');
    await runInDurableObject(stub, async (_instance, state) => {
      await new DurableOAuthStore(state, 'controlled-oauth-encryption-secret').write({
        accessToken: 'controlled-access-token',
        refreshToken: 'controlled-refresh-token',
        expiresAt: '2099-07-11T18:00:00Z',
        grantedScopes: [
          'https://www.googleapis.com/auth/calendar.events',
          'https://www.googleapis.com/auth/calendar.freebusy',
          'https://www.googleapis.com/auth/calendar.calendarlist.readonly'
        ]
      });
      state.storage.kv.put('google:calendar-configuration', {
        selectedCalendarIds: ['micah@createsomething.io'],
        eventCalendarId: 'micah@createsomething.io'
      });
    });
    let freeBusyCalls = 0;
    const providerRequests: Array<{ url: string; method: string }> = [];
    const resendDeliveries: Array<{ idempotencyKey: string; body: Record<string, unknown> }> = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      providerRequests.push({ url, method: init?.method ?? 'GET' });
      if (url === 'https://api.resend.com/emails') {
        const headers = new Headers(init?.headers);
        resendDeliveries.push({
          idempotencyKey: headers.get('idempotency-key') ?? '',
          body: JSON.parse(String(init?.body)) as Record<string, unknown>
        });
        return Response.json({ id: `resend-controlled-${resendDeliveries.length}` });
      }
      if (url === 'https://challenges.cloudflare.com/turnstile/v0/siteverify') {
        return Response.json({ success: true, hostname: 'scheduler.local' });
      }
      if (url === 'https://www.googleapis.com/calendar/v3/freeBusy') {
        freeBusyCalls += 1;
        return Response.json({
          calendars: { 'micah@createsomething.io': { busy: [] } }
        });
      }
      if (url.startsWith(
        'https://www.googleapis.com/calendar/v3/calendars/micah%40createsomething.io/events?'
      )) {
        return Response.json({
          id: 'google-event-worker',
          hangoutLink: 'https://meet.google.com/worker-test'
        });
      }
      if (
        url.includes('/events/google-event-worker?conferenceDataVersion=1&sendUpdates=all') &&
        init?.method === 'PATCH'
      ) {
        return Response.json({
          id: 'google-event-worker',
          hangoutLink: 'https://meet.google.com/worker-test'
        });
      }
      if (
        url.includes('/events/google-event-worker?sendUpdates=all') &&
        init?.method === 'DELETE'
      ) return new Response(null, { status: 204 });
      throw new Error(`Unexpected provider request: ${url}`);
    });

    const readiness = await SELF.fetch('https://scheduler.local/ready');
    expect(readiness.status).toBe(200);
    expect(await readiness.json()).toEqual({
      ready: true,
      service: 'create-something-scheduler'
    });
    const operatorStatus = await SELF.fetch('https://scheduler.local/api/v1/operator/status', {
      headers: { authorization: 'Bearer controlled-operator-token' }
    });
    expect(await operatorStatus.json()).toMatchObject({
      ready: true,
      oauthConnected: true,
      calendarDiscovered: true,
      selectedCalendarCount: 1,
      configuration: {
        googleOAuth: true,
        reminders: true,
        browserProof: true
      }
    });

    const prepare = await SELF.fetch('https://scheduler.local/api/v1/bookings/prepare', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        slot: bookingSlot,
        scheduler: { name: 'Controlled Worker', email: 'controlled@example.com' }
      })
    });
    expect(prepare.status).toBe(200);
    const proposal = await prepare.json() as { proposalToken: string };

    const commit = await SELF.fetch('https://scheduler.local/api/v1/bookings', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-browser-proof': 'controlled-turnstile-proof'
      },
      body: JSON.stringify({
        proposalToken: proposal.proposalToken,
        idempotencyKey: 'worker-controlled-commit',
        explicitIntent: true
      })
    });
    expect(commit.status).toBe(200);
    const committed = await commit.json() as {
      actionToken: string;
      booking: { bookingId: string };
    };
    expect(committed).toMatchObject({
      booking: { provider: { meetUrl: 'https://meet.google.com/worker-test' } }
    });
    const queuedNotifications = await runInDurableObject(stub, async (_instance, state) =>
      state.storage.sql.exec<{ payload_json: string }>(
        'SELECT payload_json FROM reminders ORDER BY run_at, reminder_id'
      ).toArray().map((row) => JSON.parse(row.payload_json) as Record<string, unknown>)
    );
    expect(queuedNotifications).toEqual([
      expect.objectContaining({
        bookingId: committed.booking.bookingId,
        kind: 'confirmation',
        status: 'pending'
      }),
      expect.objectContaining({
        bookingId: committed.booking.bookingId,
        kind: 'reminder',
        status: 'pending'
      })
    ]);
    expect(JSON.stringify(queuedNotifications)).not.toMatch(
      /controlled@example\.com|worker-test|actionToken|access=/i
    );

    const read = await SELF.fetch(
      `https://scheduler.local/api/v1/bookings/${committed.booking.bookingId}`,
      { headers: { 'x-booking-action-token': committed.actionToken } }
    );
    expect(read.status).toBe(200);
    expect(await read.json()).toMatchObject({
      status: 'committed',
      booking: { bookingId: committed.booking.bookingId }
    });
    const reschedule = await SELF.fetch(
      `https://scheduler.local/api/v1/bookings/${committed.booking.bookingId}/reschedule`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-booking-action-token': committed.actionToken
        },
        body: JSON.stringify({
          newSlot: rescheduleSlot,
          idempotencyKey: 'worker-controlled-reschedule',
          explicitIntent: true
        })
      }
    );
    const rescheduleBody = await reschedule.json();
    expect(
      reschedule.status,
      JSON.stringify({ rescheduleBody, providerRequests })
    ).toBe(200);
    const rescheduled = rescheduleBody as {
      actionToken: string;
      booking: { bookingId: string; slot: { start: string } };
    };
    expect(rescheduled).toMatchObject({
      booking: { slot: { start: rescheduleSlot.start } }
    });
    expect(rescheduled.actionToken).not.toBe(committed.actionToken);

    const cancel = await SELF.fetch(
      `https://scheduler.local/api/v1/bookings/${committed.booking.bookingId}/cancel`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-booking-action-token': rescheduled.actionToken
        },
        body: JSON.stringify({
          idempotencyKey: 'worker-controlled-cancel',
          explicitIntent: true
        })
      }
    );
    expect(cancel.status).toBe(200);
    expect(await cancel.json()).toMatchObject({ status: 'cancelled' });

    const lifecycleNotifications = await runInDurableObject(stub, async (_instance, state) =>
      state.storage.sql.exec<{ status: string; payload_json: string }>(
        'SELECT status, payload_json FROM reminders ORDER BY run_at, reminder_id'
      ).toArray().map((row) => ({
        status: row.status,
        kind: (JSON.parse(row.payload_json) as { kind: string }).kind
      }))
    );
    expect(lifecycleNotifications).toEqual(expect.arrayContaining([
      { kind: 'confirmation', status: 'sent' },
      { kind: 'rescheduled', status: 'sent' },
      { kind: 'reminder', status: 'cancelled' },
      { kind: 'reminder', status: 'cancelled' }
    ]));
    expect(resendDeliveries).toHaveLength(2);
    expect(resendDeliveries.map((delivery) => delivery.idempotencyKey)).toEqual([
      expect.stringMatching(/^notification_confirmation_/),
      expect.stringMatching(/^notification_rescheduled_/)
    ]);
    expect(resendDeliveries.map((delivery) => delivery.body)).toEqual([
      expect.objectContaining({
        to: ['controlled@example.com'],
        subject: 'Your CREATE SOMETHING meeting is booked',
        html: expect.stringContaining('background-color:#f3f3f0'),
        text: expect.stringContaining('Manage this meeting:')
      }),
      expect.objectContaining({
        to: ['controlled@example.com'],
        subject: 'Your CREATE SOMETHING meeting has moved',
        html: expect.stringContaining('#access='),
        text: expect.stringContaining(rescheduleDay)
      })
    ]);
    expect(freeBusyCalls).toBe(3);
  });

  it('enforces a durable fixed-window rate limit without storing the raw subject', async () => {
    const stub = env.SCHEDULER.getByName('rate-limit-test');
    const input = {
      bucket: 'controlled',
      subjectHash: 'already-hashed-subject',
      limit: 2,
      windowMilliseconds: 60_000,
      now: Date.parse('2026-07-11T18:00:00Z')
    };
    await expect(stub.consumeRateLimit(input)).resolves.toBe(true);
    await expect(stub.consumeRateLimit(input)).resolves.toBe(true);
    await expect(stub.consumeRateLimit(input)).resolves.toBe(false);
  });

  it('answers MCP initialize over stateless Streamable HTTP and rejects a foreign Origin', async () => {
    const initialize = await SELF.fetch('https://scheduler.local/mcp', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
        origin: 'https://scheduler.local'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-06-18',
          capabilities: {},
          clientInfo: { name: 'worker-transport-test', version: '1.0.0' }
        }
      })
    });
    expect(initialize.status).toBe(200);
    expect(await initialize.json()).toMatchObject({
      jsonrpc: '2.0',
      id: 1,
      result: {
        serverInfo: { name: 'create-something-scheduler', version: '0.1.0' }
      }
    });

    const publicTools = await mcpRequest('tools/list', {}, 2);
    expect(publicTools.status).toBe(200);
    const publicBody = await publicTools.json() as {
      result: { tools: Array<{ name: string }> };
    };
    expect(publicBody.result.tools.map((tool) => tool.name)).toContain('scheduler_list_availability');
    expect(publicBody.result.tools.map((tool) => tool.name)).not.toContain('scheduler_commit_booking');

    const operatorTools = await mcpRequest('tools/list', {}, 3, {
      authorization: 'Bearer controlled-operator-token'
    });
    const operatorBody = await operatorTools.json() as {
      result: { tools: Array<{ name: string }> };
    };
    expect(operatorBody.result.tools.map((tool) => tool.name)).toContain('scheduler_commit_booking');

    const foreign = await SELF.fetch('https://scheduler.local/mcp', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'https://attacker.example'
      },
      body: '{}'
    });
    expect(foreign.status).toBe(403);
    expect(await foreign.json()).toMatchObject({
      error: { code: 'origin_not_allowed' }
    });
  });
});

function mcpRequest(
  method: string,
  params: Record<string, unknown>,
  id: number,
  headers: Record<string, string> = {}
) {
  return SELF.fetch('https://scheduler.local/mcp', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      origin: 'https://scheduler.local',
      ...headers
    },
    body: JSON.stringify({ jsonrpc: '2.0', id, method, params })
  });
}
