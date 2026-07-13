import { describe, expect, it, vi } from 'vitest';
import {
  BookingService,
  InMemoryBookingStore,
  type CalendarPort
} from '../application/booking-service.js';
import { InMemoryRoomStore, RoomService } from '../application/room-service.js';
import { HmacRoomCapabilitySigner } from '../auth/action-tokens.js';
import { handleApiRequest } from './api.js';

describe('scheduler HTTP API v1', () => {
  it('returns service-owned availability as structured JSON', async () => {
    const calendar: CalendarPort = {
      async listBusyIntervals() {
        return { status: 'available', intervals: [] };
      },
      async createEvent() {
        throw new Error('Availability must not create an event.');
      }
    };
    const service = new BookingService({
      calendar,
      clock: { now: () => '2026-07-13T15:00:00Z' }
    });

    const response = await handleApiRequest(
      new Request(
        'https://scheduler.local/api/v1/availability?from=2026-07-14T00%3A00%3A00Z&to=2026-07-15T00%3A00%3A00Z&timezone=America%2FChicago'
      ),
      service
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');
    const body = await response.json() as { status?: string; slots?: unknown[] };
    expect(body).toMatchObject({
      status: 'available',
      policyVersion: 'createsomething-together.v2',
      timezone: 'America/Chicago'
    });
    expect(body.slots).toHaveLength(12);
  });

  it('selects a supported duration through the versioned availability query', async () => {
    const calendar: CalendarPort = {
      async listBusyIntervals() {
        return { status: 'available', intervals: [] };
      },
      async createEvent() {
        throw new Error('Availability must not create an event.');
      }
    };
    const service = new BookingService({
      calendar,
      clock: { now: () => '2026-07-13T15:00:00Z' }
    });
    const response = await handleApiRequest(
      new Request(
        'https://scheduler.local/api/v1/availability?from=2026-07-14T00%3A00%3A00Z&to=2026-07-15T00%3A00%3A00Z&timezone=America%2FChicago&durationMinutes=60'
      ),
      service
    );
    const body = await response.json() as { durationMinutes?: number; slots?: unknown[] };

    expect(response.status).toBe(200);
    expect(body.durationMinutes).toBe(60);
    expect(body.slots).toHaveLength(11);

    const unsupported = await handleApiRequest(
      new Request(
        'https://scheduler.local/api/v1/availability?from=2026-07-14T00%3A00%3A00Z&to=2026-07-15T00%3A00%3A00Z&timezone=America%2FChicago&durationMinutes=90'
      ),
      service
    );
    expect(unsupported.status).toBe(400);
    expect(await unsupported.json()).toMatchObject({
      status: 'rejected',
      error: { code: 'invalid_request', message: 'durationMinutes must be 30 or 60.' }
    });
  });

  it('prepares publicly but requires an operator scope to commit', async () => {
    let eventCount = 0;
    const calendar: CalendarPort = {
      async listBusyIntervals() {
        return { status: 'available', intervals: [] };
      },
      async createEvent() {
        eventCount += 1;
        return {
          status: 'created',
          eventId: 'google-event-1',
          meetUrl: 'https://meet.google.com/controlled-test'
        };
      },
      async updateEvent(input) {
        return {
          status: 'updated',
          eventId: input.eventId,
          meetUrl: 'https://meet.google.com/controlled-test'
        };
      },
      async cancelEvent() {
        return { status: 'cancelled' };
      }
    };
    const signer = {
      sign: (payload: string) => `signed:${payload}`,
      verify: (token: string) => token.startsWith('signed:') ? token.slice(7) : null
    };
    const service = new BookingService({
      calendar,
      clock: { now: () => '2026-07-13T15:00:00Z' },
      proposalSigner: signer,
      bookingStore: new InMemoryBookingStore()
    });
    const issueActionToken = vi.fn(async (booking: { slot: { start: string } }) =>
      `action:${booking.slot.start}`
    );
    const prepareResponse = await handleApiRequest(
      new Request('https://scheduler.local/api/v1/bookings/prepare', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          slot: {
            start: '2026-07-14T16:00:00Z',
            end: '2026-07-14T16:30:00Z'
          },
          scheduler: {
            name: 'Controlled Test',
            email: 'controlled@example.com'
          }
        })
      }),
      service
    );
    const proposal = await prepareResponse.json() as {
      status?: string;
      proposalToken?: string;
    };
    expect(prepareResponse.status).toBe(200);
    expect(proposal.status).toBe('proposed');

    const commitBody = JSON.stringify({
      proposalToken: proposal.proposalToken,
      idempotencyKey: 'api-controlled-commit',
      explicitIntent: true
    });
    const publicCommit = await handleApiRequest(
      new Request('https://scheduler.local/api/v1/bookings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: commitBody
      }),
      service
    );
    expect(publicCommit.status).toBe(403);
    expect(eventCount).toBe(0);

    const operatorCommit = await handleApiRequest(
      new Request('https://scheduler.local/api/v1/bookings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: commitBody
      }),
      service,
      { role: 'operator' },
      { issueActionToken }
    );
    expect(operatorCommit.status).toBe(200);
    const committed = await operatorCommit.json() as {
      status?: string;
      booking?: { bookingId?: string };
      receiptId?: string;
      actionToken?: string;
    };
    expect(committed).toMatchObject({ status: 'committed' });
    expect(committed.actionToken).toBe('action:2026-07-14T16:00:00Z');
    expect(eventCount).toBe(1);

    const bookingId = committed.booking?.bookingId;
    if (!bookingId) throw new Error('Expected booking id.');
    const read = await handleApiRequest(
      new Request(`https://scheduler.local/api/v1/bookings/${bookingId}`),
      service,
      { role: 'operator' }
    );
    expect(await read.json()).toMatchObject({ status: 'committed' });
    const reschedule = await handleApiRequest(
      new Request(`https://scheduler.local/api/v1/bookings/${bookingId}/reschedule`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          newSlot: {
            start: '2026-07-16T18:00:00Z',
            end: '2026-07-16T18:30:00Z'
          },
          idempotencyKey: 'api-reschedule',
          explicitIntent: true
        })
      }),
      service,
      { role: 'operator' },
      { issueActionToken }
    );
    expect(await reschedule.json()).toMatchObject({
      status: 'rescheduled',
      actionToken: 'action:2026-07-16T18:00:00Z'
    });
    expect(issueActionToken).toHaveBeenCalledTimes(2);
    const cancel = await handleApiRequest(
      new Request(`https://scheduler.local/api/v1/bookings/${bookingId}/cancel`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          idempotencyKey: 'api-cancel',
          explicitIntent: true
        })
      }),
      service,
      { role: 'operator' }
    );
    expect(await cancel.json()).toMatchObject({ status: 'cancelled' });
    if (!committed.receiptId) throw new Error('Expected receipt id.');
    const receipt = await handleApiRequest(
      new Request(`https://scheduler.local/api/v1/receipts/${committed.receiptId}`),
      service,
      { role: 'operator' }
    );
    expect(await receipt.json()).toMatchObject({
      status: 'committed',
      receipt: { receiptId: committed.receiptId }
    });
  });

  it('keeps room mutation operator-scoped while exchanging a signed guest capability', async () => {
    const booking = new BookingService({
      clock: { now: () => '2026-07-11T22:00:00Z' },
      calendar: {
        async listBusyIntervals() { return { status: 'available', intervals: [] }; },
        async createEvent() { throw new Error('not used'); }
      }
    });
    const capabilities = new HmacRoomCapabilitySigner(
      'controlled-room-api-secret-with-enough-entropy'
    );
    let nonce = 0;
    const rooms = new RoomService({
      clock: { now: () => '2026-07-11T22:00:00Z' },
      publicOrigin: 'https://scheduler.local',
      capabilities,
      nonce: () => `api-room-nonce-${++nonce}`,
      store: new InMemoryRoomStore(),
      provider: {
        async ensureMeeting() {
          return { status: 'ready', providerMeetingId: 'meeting-api' };
        },
        async issueParticipantCredential() {
          return {
            status: 'ready',
            providerParticipantId: 'participant-api',
            providerToken: 'provider-token-api'
          };
        },
        async endMeeting() { return { status: 'ended' }; }
      }
    });
    const service = {
      getLink: booking.getLink.bind(booking),
      listAvailability: booking.listAvailability.bind(booking),
      prepareBooking: booking.prepareBooking.bind(booking),
      commitBooking: booking.commitBooking.bind(booking),
      getBooking: booking.getBooking.bind(booking),
      getReceipt: booking.getReceipt.bind(booking),
      rescheduleBooking: booking.rescheduleBooking.bind(booking),
      cancelBooking: booking.cancelBooking.bind(booking),
      createRoom: rooms.createRoom.bind(rooms),
      issueJoinCredential: rooms.issueJoinCredential.bind(rooms),
      getRoom: rooms.getRoom.bind(rooms),
      endRoom: rooms.endRoom.bind(rooms)
    };
    const createBody = JSON.stringify({
      title: 'Controlled API Room',
      idempotencyKey: 'api-room-create',
      explicitIntent: true
    });

    const forbidden = await handleApiRequest(new Request('https://scheduler.local/api/v1/rooms', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: createBody
    }), service);
    expect(forbidden.status).toBe(403);

    const createdResponse = await handleApiRequest(new Request('https://scheduler.local/api/v1/rooms', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: createBody
    }), service, { role: 'operator' });
    const created = await createdResponse.json() as {
      room: { roomId: string };
      invites: { guestUrl: string; hostUrl: string };
    };
    expect(createdResponse.status).toBe(200);
    expect(created.invites.guestUrl).toContain(`/rooms/${created.room.roomId}?cap=`);
    const capability = new URL(created.invites.guestUrl).searchParams.get('cap');
    if (!capability) throw new Error('Expected guest capability.');

    const credentialResponse = await handleApiRequest(new Request(
      `https://scheduler.local/api/v1/rooms/${created.room.roomId}/credentials`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ capability, displayName: 'Controlled Guest' })
      }
    ), service);
    expect(credentialResponse.status).toBe(200);
    expect(credentialResponse.headers.get('cache-control')).toBe('no-store');
    expect(await credentialResponse.json()).toMatchObject({
      status: 'ready',
      role: 'guest',
      providerToken: 'provider-token-api'
    });

    const hostCapability = new URL(created.invites.hostUrl).searchParams.get('cap');
    if (!hostCapability) throw new Error('Expected host capability.');
    const hostCredentialResponse = await handleApiRequest(new Request(
      `https://scheduler.local/api/v1/rooms/${created.room.roomId}/credentials`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ capability: hostCapability, displayName: 'Controlled Host' })
      }
    ), service);
    const hostCredential = await hostCredentialResponse.json() as { nextCapability?: string };
    if (!hostCredential.nextCapability) throw new Error('Expected rotated host capability.');

    const endResponse = await handleApiRequest(new Request(
      `https://scheduler.local/api/v1/rooms/${created.room.roomId}/end`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          idempotencyKey: 'api-room-end',
          explicitIntent: true,
          capability: hostCredential.nextCapability
        })
      }
    ), service);
    expect(endResponse.status).toBe(200);
    expect(await endResponse.json()).toMatchObject({ status: 'ended' });
  });
});
