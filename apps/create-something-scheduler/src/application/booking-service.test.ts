import { describe, expect, it, vi } from 'vitest';
import {
  BookingService,
  InMemoryAvailabilityOverrideStore,
  InMemoryBookingStore,
  type CalendarPort,
  type Clock
} from './booking-service.js';

const fixedClock: Clock = {
  now: () => '2026-07-13T15:00:00Z'
};

const passThroughSigner = {
  sign: (payload: string) => `signed:${payload}`,
  verify: (token: string) => token.startsWith('signed:') ? token.slice(7) : null
};

describe('BookingService availability', () => {
  it('reports the owned room policy whenever the conferencing port is configured', () => {
    const calendar = {
      async listBusyIntervals() { return { status: 'available' as const, intervals: [] }; },
      async createEvent() { throw new Error('Policy read must not create an event.'); }
    };
    const service = new BookingService({
      calendar,
      clock: fixedClock,
      conferencing: {
        async createRoom() {
          return { status: 'retryable' as const, reason: 'not_requested' };
        }
      }
    });

    expect(service.getLink().conferencing).toBe('create_something_room');
  });

  it('offers starts only on the hour and half hour', async () => {
    const calendar: CalendarPort = {
      async listBusyIntervals() {
        return { status: 'available', intervals: [] };
      },
      async createEvent() {
        throw new Error('Availability reads must not create events.');
      }
    };
    const service = new BookingService({ calendar, clock: fixedClock });
    const result = await service.listAvailability({
      from: '2026-07-14T00:00:00Z',
      to: '2026-07-15T00:00:00Z',
      timezone: 'America/Chicago'
    });

    expect(result.status).toBe('available');
    if (result.status !== 'available') throw new Error('Expected aligned availability.');
    expect(result.slots).toHaveLength(12);
    expect(result.slots.every((slot) => [0, 30].includes(new Date(slot.start).getUTCMinutes())))
      .toBe(true);
  });

  it('offers continuous 60-minute meetings on the existing start-time grid', async () => {
    const calendar: CalendarPort = {
      async listBusyIntervals() {
        return { status: 'available', intervals: [] };
      },
      async createEvent() {
        throw new Error('Availability reads must not create events.');
      }
    };
    const service = new BookingService({ calendar, clock: fixedClock });

    const result = await service.listAvailability({
      from: '2026-07-14T00:00:00Z',
      to: '2026-07-15T00:00:00Z',
      timezone: 'America/Chicago',
      durationMinutes: 60
    });

    expect(result.status).toBe('available');
    if (result.status !== 'available') throw new Error('Expected one-hour availability.');
    expect(result.durationMinutes).toBe(60);
    expect(result.slots).toHaveLength(11);
    expect(result.slots[0]).toEqual({
      start: '2026-07-14T16:00:00Z',
      end: '2026-07-14T17:00:00Z'
    });
    expect(result.slots.at(-1)).toEqual({
      start: '2026-07-14T21:00:00Z',
      end: '2026-07-14T22:00:00Z'
    });
  });

  it('opens a bounded Wednesday window through an operator-owned override', async () => {
    const calendar: CalendarPort = {
      async listBusyIntervals() {
        return { status: 'available', intervals: [] };
      },
      async createEvent() {
        throw new Error('Availability reads must not create events.');
      }
    };
    const service = new BookingService({
      calendar,
      clock: fixedClock,
      availabilityOverrides: new InMemoryAvailabilityOverrideStore(),
      bookingStore: new InMemoryBookingStore()
    });

    const applied = await service.upsertAvailabilityOverride({
      overrideId: 'client-wednesday-2026-07-15',
      date: '2026-07-15',
      opensAt: '13:00',
      closesAt: '15:00',
      timezone: 'America/Chicago',
      reason: 'Client requested a Wednesday meeting.',
      explicitIntent: true
    });
    expect(applied).toMatchObject({
      status: 'applied',
      override: { date: '2026-07-15', opensAt: '13:00', closesAt: '15:00' }
    });

    const result = await service.listAvailability({
      from: '2026-07-15T00:00:00Z',
      to: '2026-07-16T00:00:00Z',
      timezone: 'America/Chicago'
    });
    expect(result.status).toBe('available');
    if (result.status !== 'available') throw new Error('Expected Wednesday availability.');
    expect(result.slots).toHaveLength(4);
    expect(result.slots[0]).toEqual({
      start: '2026-07-15T18:00:00Z',
      end: '2026-07-15T18:30:00Z'
    });
    expect(result.slots.at(-1)).toEqual({
      start: '2026-07-15T19:30:00Z',
      end: '2026-07-15T20:00:00Z'
    });
  });

  it('returns only open Tuesday slots after subtracting Google Calendar conflicts', async () => {
    const calendar: CalendarPort = {
      async listBusyIntervals() {
        return {
          status: 'available',
          intervals: [
            {
              start: '2026-07-14T17:00:00Z',
              end: '2026-07-14T17:30:00Z'
            }
          ]
        };
      },
      async createEvent() {
        throw new Error('Availability reads must not create events.');
      }
    };
    const service = new BookingService({ calendar, clock: fixedClock });

    const result = await service.listAvailability({
      from: '2026-07-14T00:00:00Z',
      to: '2026-07-15T00:00:00Z',
      timezone: 'America/Chicago'
    });

    expect(result.status).toBe('available');
    if (result.status !== 'available') throw new Error('Expected available slots.');
    expect(result.slots).toHaveLength(11);
    expect(result.slots[0]).toEqual({
      start: '2026-07-14T16:00:00Z',
      end: '2026-07-14T16:30:00Z'
    });
    expect(result.slots.every((slot) => [0, 30].includes(new Date(slot.start).getUTCMinutes())))
      .toBe(true);
    expect(result.slots.at(-1)).toEqual({
      start: '2026-07-14T21:30:00Z',
      end: '2026-07-14T22:00:00Z'
    });
  });

  it('fails closed instead of exposing slots when Calendar availability is uncertain', async () => {
    const calendar: CalendarPort = {
      async listBusyIntervals() {
        return { status: 'unavailable', reason: 'provider_timeout' };
      },
      async createEvent() {
        throw new Error('Availability reads must not create events.');
      }
    };
    const service = new BookingService({ calendar, clock: fixedClock });

    const result = await service.listAvailability({
      from: '2026-07-14T00:00:00Z',
      to: '2026-07-15T00:00:00Z',
      timezone: 'America/Chicago'
    });

    expect(result).toMatchObject({
      status: 'retryable',
      reason: 'provider_timeout',
      slots: []
    });
  });

  it('keeps 11:00 AM Central as wall-clock time across daylight-saving offsets', async () => {
    const calendar: CalendarPort = {
      async listBusyIntervals() {
        return { status: 'available', intervals: [] };
      },
      async createEvent() {
        throw new Error('Availability reads must not create events.');
      }
    };
    const service = new BookingService({ calendar, clock: fixedClock });

    const winter = await service.listAvailability({
      from: '2026-12-03T00:00:00Z',
      to: '2026-12-04T00:00:00Z',
      timezone: 'America/Chicago'
    });

    expect(winter.status).toBe('available');
    if (winter.status !== 'available') throw new Error('Expected winter availability.');
    expect(winter.slots[0]?.start).toBe('2026-12-03T17:00:00Z');
    expect(winter.slots.at(-1)?.start).toBe('2026-12-03T22:30:00Z');
  });

  it('rounds the minimum-notice boundary up to the next half-hour start', async () => {
    const calendar: CalendarPort = {
      async listBusyIntervals() {
        return { status: 'available', intervals: [] };
      },
      async createEvent() {
        throw new Error('Availability reads must not create events.');
      }
    };
    const service = new BookingService({
      calendar,
      clock: { now: () => '2026-07-14T16:07:00Z' }
    });

    const result = await service.listAvailability({
      from: '2026-07-14T16:00:00Z',
      to: '2026-07-14T22:00:00Z',
      timezone: 'America/Chicago'
    });

    expect(result.status).toBe('available');
    if (result.status !== 'available') throw new Error('Expected availability.');
    expect(result.slots[0]?.start).toBe('2026-07-14T17:30:00Z');
  });

  it('prepares an expiring proposal without creating a Calendar event', async () => {
    const createEvent = vi.fn();
    const calendar: CalendarPort = {
      async listBusyIntervals() {
        return { status: 'available', intervals: [] };
      },
      createEvent
    };
    const service = new BookingService({
      calendar,
      clock: fixedClock,
      proposalSigner: {
        ...passThroughSigner
      },
      bookingStore: new InMemoryBookingStore()
    });

    const result = await service.prepareBooking({
      slot: {
        start: '2026-07-14T16:00:00Z',
        end: '2026-07-14T16:30:00Z'
      },
      scheduler: {
        name: 'Controlled Test',
        email: 'controlled@example.com'
      }
    });

    expect(result).toMatchObject({
      status: 'proposed',
      expiresAt: '2026-07-13T15:10:00Z',
      proposalToken: expect.stringMatching(/^signed:/),
      nextActions: ['obtain_explicit_intent', 'commit_booking']
    });
    expect(createEvent).not.toHaveBeenCalled();
  });

  it('preserves a selected 60-minute duration through proposal and commit', async () => {
    const createEvent = vi.fn(async () => ({
      status: 'created' as const,
      eventId: 'google-event-one-hour',
      meetUrl: 'https://meet.google.com/one-hour-test'
    }));
    const calendar: CalendarPort = {
      async listBusyIntervals() {
        return { status: 'available', intervals: [] };
      },
      createEvent
    };
    const service = new BookingService({
      calendar,
      clock: fixedClock,
      proposalSigner: passThroughSigner,
      bookingStore: new InMemoryBookingStore()
    });
    const slot = {
      start: '2026-07-14T16:00:00Z',
      end: '2026-07-14T17:00:00Z'
    };
    const prepared = await service.prepareBooking({
      slot,
      scheduler: { name: 'One Hour Test', email: 'one-hour@example.com' }
    });
    expect(prepared).toMatchObject({ status: 'proposed', slot });
    if (prepared.status !== 'proposed') throw new Error('Expected one-hour proposal.');

    const committed = await service.commitBooking({
      proposalToken: prepared.proposalToken,
      idempotencyKey: 'one-hour-commit',
      explicitIntent: true
    });
    expect(committed).toMatchObject({ status: 'committed', booking: { slot } });
    expect(createEvent).toHaveBeenCalledWith(expect.objectContaining({ slot }));

    const unsupported = await service.prepareBooking({
      slot: { start: slot.start, end: '2026-07-14T17:30:00Z' },
      scheduler: { name: 'Too Long', email: 'too-long@example.com' }
    });
    expect(unsupported).toMatchObject({ status: 'rejected', reason: 'unsupported_duration' });
  });

  it('retains safe Atlas context from proposal through Calendar, booking, and receipt', async () => {
    const createEvent = vi.fn(async () => ({
      status: 'created' as const,
      eventId: 'google-event-atlas',
      meetUrl: 'https://meet.google.com/atlas-test'
    }));
    const service = new BookingService({
      calendar: {
        async listBusyIntervals() {
          return { status: 'available' as const, intervals: [] };
        },
        createEvent
      },
      clock: fixedClock,
      proposalSigner: passThroughSigner,
      bookingStore: new InMemoryBookingStore()
    });
    const context = {
      source: 'Atlas Canvas',
      intent: 'Workflow Map',
      lane: 'Fit',
      warmup: 'atlas_canvas',
      readiness: 'Ready',
      score: 84,
      atlasSessionId: 'session_123',
      agentMessages: 7,
      warmupNotes: 'Map the approval handoff.'
    };
    const prepared = await service.prepareBooking({
      slot: { start: '2026-07-14T16:00:00Z', end: '2026-07-14T16:30:00Z' },
      scheduler: { name: 'Atlas Test', email: 'atlas@example.com' },
      context
    });
    expect(prepared).toMatchObject({
      status: 'proposed',
      context: { source: 'atlas-canvas', intent: 'workflow-map', warmupNotes: context.warmupNotes }
    });
    if (prepared.status !== 'proposed') throw new Error('Expected Atlas proposal.');
    const committed = await service.commitBooking({
      proposalToken: prepared.proposalToken,
      idempotencyKey: 'atlas-context-commit',
      explicitIntent: true
    });
    expect(committed).toMatchObject({
      status: 'committed',
      booking: { context: prepared.context }
    });
    expect(createEvent).toHaveBeenCalledWith(expect.objectContaining({ context: prepared.context }));
    expect(await service.getReceipt(committed.receiptId)).toMatchObject({
      status: 'committed',
      receipt: { context: prepared.context }
    });
  });

  it('commits one Calendar event when concurrent callers race for the same proposal', async () => {
    const createEvent = vi.fn(async () => ({
      status: 'created' as const,
      eventId: 'google-event-1',
      meetUrl: 'https://meet.google.com/controlled-test'
    }));
    const calendar: CalendarPort = {
      async listBusyIntervals() {
        return { status: 'available', intervals: [] };
      },
      createEvent
    };
    const service = new BookingService({
      calendar,
      clock: fixedClock,
      proposalSigner: passThroughSigner,
      bookingStore: new InMemoryBookingStore()
    });
    const prepared = await service.prepareBooking({
      slot: {
        start: '2026-07-14T16:00:00Z',
        end: '2026-07-14T16:30:00Z'
      },
      scheduler: {
        name: 'Controlled Test',
        email: 'controlled@example.com'
      }
    });
    if (prepared.status !== 'proposed') throw new Error('Expected a proposal.');

    const results = await Promise.all([
      service.commitBooking({
        proposalToken: prepared.proposalToken,
        idempotencyKey: 'commit-a',
        explicitIntent: true
      }),
      service.commitBooking({
        proposalToken: prepared.proposalToken,
        idempotencyKey: 'commit-b',
        explicitIntent: true
      })
    ]);

    expect(results.map((result) => result.status).sort()).toEqual(['committed', 'rejected']);
    expect(createEvent).toHaveBeenCalledTimes(1);
    expect(results.find((result) => result.status === 'rejected')).toMatchObject({
      reason: 'slot_claimed',
      nextActions: ['list_availability']
    });
    const committed = results.find((result) => result.status === 'committed');
    if (!committed || committed.status !== 'committed') throw new Error('Expected committed result.');
    await expect(service.getBooking(committed.booking.bookingId)).resolves.toMatchObject({
      status: 'committed',
      booking: committed.booking
    });
    await expect(service.getReceipt(committed.receiptId)).resolves.toMatchObject({
      status: 'committed',
      receipt: {
        receiptId: committed.receiptId,
        bookingId: committed.booking.bookingId
      }
    });
  });

  it('returns a retryable receipt and releases the claim when event creation is uncertain', async () => {
    let attempts = 0;
    const calendar: CalendarPort = {
      async listBusyIntervals() {
        return { status: 'available', intervals: [] };
      },
      async createEvent() {
        attempts += 1;
        if (attempts === 1) throw new Error('provider_event_http_500');
        return {
          status: 'created',
          eventId: 'google-event-recovered',
          meetUrl: 'https://meet.google.com/recovered-test'
        };
      }
    };
    const service = new BookingService({
      calendar,
      clock: fixedClock,
      proposalSigner: passThroughSigner,
      bookingStore: new InMemoryBookingStore()
    });
    const prepared = await service.prepareBooking({
      slot: {
        start: '2026-07-14T16:00:00Z',
        end: '2026-07-14T16:30:00Z'
      },
      scheduler: {
        name: 'Controlled Test',
        email: 'controlled@example.com'
      }
    });
    if (prepared.status !== 'proposed') throw new Error('Expected a proposal.');
    const input = {
      proposalToken: prepared.proposalToken,
      idempotencyKey: 'retry-provider-commit',
      explicitIntent: true
    };

    await expect(service.commitBooking(input)).resolves.toMatchObject({
      status: 'retryable',
      reason: 'provider_event_http_500',
      nextActions: ['retry_commit', 'contact_operator']
    });
    await expect(service.commitBooking(input)).resolves.toMatchObject({
      status: 'committed',
      replayed: false
    });
    expect(attempts).toBe(2);
  });

  it('reschedules and cancels the same logical booking with lifecycle readback', async () => {
    const updateEvent = vi.fn(async (input) => ({
      status: 'updated' as const,
      eventId: input.eventId,
      meetUrl: 'https://meet.google.com/lifecycle-test'
    }));
    const cancelEvent = vi.fn(async () => ({ status: 'cancelled' as const }));
    const calendar: CalendarPort = {
      async listBusyIntervals() {
        return { status: 'available', intervals: [] };
      },
      async createEvent() {
        return {
          status: 'created',
          eventId: 'google-event-lifecycle',
          meetUrl: 'https://meet.google.com/lifecycle-test'
        };
      },
      updateEvent,
      cancelEvent
    };
    const service = new BookingService({
      calendar,
      clock: fixedClock,
      proposalSigner: passThroughSigner,
      bookingStore: new InMemoryBookingStore()
    });
    const prepared = await service.prepareBooking({
      slot: {
        start: '2026-07-14T16:00:00Z',
        end: '2026-07-14T16:30:00Z'
      },
      scheduler: {
        name: 'Controlled Test',
        email: 'controlled@example.com'
      }
    });
    if (prepared.status !== 'proposed') throw new Error('Expected proposal.');
    const committed = await service.commitBooking({
      proposalToken: prepared.proposalToken,
      idempotencyKey: 'lifecycle-commit',
      explicitIntent: true
    });
    if (committed.status !== 'committed') throw new Error('Expected commit.');

    const changedDuration = await service.rescheduleBooking({
      bookingId: committed.booking.bookingId,
      newSlot: {
        start: '2026-07-16T18:00:00Z',
        end: '2026-07-16T19:00:00Z'
      },
      idempotencyKey: 'lifecycle-duration-change',
      explicitIntent: true
    });
    expect(changedDuration).toMatchObject({
      status: 'rejected',
      reason: 'duration_change_requires_new_booking'
    });
    expect(updateEvent).not.toHaveBeenCalled();

    const rescheduled = await service.rescheduleBooking({
      bookingId: committed.booking.bookingId,
      newSlot: {
        start: '2026-07-16T18:00:00Z',
        end: '2026-07-16T18:30:00Z'
      },
      idempotencyKey: 'lifecycle-reschedule',
      explicitIntent: true
    });
    expect(rescheduled).toMatchObject({
      status: 'rescheduled',
      booking: {
        bookingId: committed.booking.bookingId,
        status: 'rescheduled',
        slot: {
          start: '2026-07-16T18:00:00Z',
          end: '2026-07-16T18:30:00Z'
        }
      }
    });
    expect(updateEvent).toHaveBeenCalledTimes(1);

    const cancelled = await service.cancelBooking({
      bookingId: committed.booking.bookingId,
      idempotencyKey: 'lifecycle-cancel',
      explicitIntent: true
    });
    expect(cancelled).toMatchObject({
      status: 'cancelled',
      booking: {
        bookingId: committed.booking.bookingId,
        status: 'cancelled'
      }
    });
    expect(cancelEvent).toHaveBeenCalledTimes(1);
    await expect(service.getBooking(committed.booking.bookingId)).resolves.toMatchObject({
      status: 'cancelled',
      booking: { status: 'cancelled' }
    });
  });

  it('creates one first-party room before Calendar and reuses it on commit replay', async () => {
    const createRoom = vi.fn(async (input: { bookingId: string }) => ({
      status: 'ready' as const,
      roomId: `room-${input.bookingId}`,
      joinUrl: `https://scheduler.local/rooms/room-${input.bookingId}?cap=guest-capability`
    }));
    const createEvent = vi.fn(async (input: { conferencing?: { joinUrl: string } }) => ({
      status: 'created' as const,
      eventId: 'event-first-party',
      meetUrl: input.conferencing?.joinUrl ?? 'missing-room-url'
    }));
    const calendar: CalendarPort = {
      async listBusyIntervals() { return { status: 'available', intervals: [] }; },
      createEvent: createEvent as CalendarPort['createEvent']
    };
    const service = new BookingService({
      calendar,
      clock: fixedClock,
      proposalSigner: passThroughSigner,
      bookingStore: new InMemoryBookingStore(),
      conferencing: { createRoom }
    } as ConstructorParameters<typeof BookingService>[0]);
    const prepared = await service.prepareBooking({
      slot: { start: '2026-07-14T16:00:00Z', end: '2026-07-14T16:30:00Z' },
      scheduler: { name: 'Controlled Guest', email: 'controlled@example.com' }
    });
    if (prepared.status !== 'proposed') throw new Error('Expected proposal.');
    const input = {
      proposalToken: prepared.proposalToken,
      idempotencyKey: 'first-party-room-commit',
      explicitIntent: true
    };

    const committed = await service.commitBooking(input);
    const replayed = await service.commitBooking(input);

    expect(committed).toMatchObject({
      status: 'committed',
      booking: { provider: { meetUrl: expect.stringContaining('/rooms/room-booking_') } }
    });
    expect(replayed).toMatchObject({ status: 'committed', replayed: true });
    expect(createRoom).toHaveBeenCalledTimes(1);
    expect(createEvent).toHaveBeenCalledTimes(1);
    expect(createEvent).toHaveBeenCalledWith(expect.objectContaining({
      conferencing: expect.objectContaining({
        provider: 'first_party',
        joinUrl: expect.stringContaining('/rooms/')
      })
    }));
  });
});
