import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { describe, expect, it } from 'vitest';
import {
  BookingService,
  InMemoryBookingStore,
  InMemoryAvailabilityOverrideStore,
  type CalendarPort
} from '../application/booking-service.js';
import { InMemoryRoomStore, RoomService } from '../application/room-service.js';
import { HmacRoomCapabilitySigner } from '../auth/action-tokens.js';
import { createSchedulerMcpServer } from './server.js';

describe('scheduler MCP contract', () => {
  it('normalizes RPC metadata out of structured tool results', async () => {
    const rpcMetadata = Symbol('rpc-metadata');
    const result = {
      status: 'available',
      receiptId: 'receipt_rpc_boundary',
      policyVersion: 'createsomething-together.v1',
      occurredAt: '2026-07-13T15:00:00Z',
      nextActions: ['select_slot'],
      timezone: 'America/Chicago',
      durationMinutes: 30,
      slots: [{ start: '2026-07-14T16:00:00Z', end: '2026-07-14T16:30:00Z' }],
      [rpcMetadata]: 'transport-only'
    };
    const service = {
      getLink: () => ({}),
      listAvailability: async () => result,
      prepareBooking: async () => ({}),
      commitBooking: async () => ({}),
      getBooking: async () => ({}),
      getReceipt: async () => ({}),
      rescheduleBooking: async () => ({}),
      cancelBooking: async () => ({})
    } as unknown as Parameters<typeof createSchedulerMcpServer>[0];
    const server = createSchedulerMcpServer(service);
    const client = new Client(
      { name: 'scheduler-rpc-boundary-test', version: '1.0.0' },
      { capabilities: {} }
    );
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

    try {
      const toolResult = await client.callTool({
        name: 'scheduler_list_availability',
        arguments: {
          from: '2026-07-14T00:00:00Z',
          to: '2026-07-15T00:00:00Z',
          timezone: 'America/Chicago'
        }
      });
      expect(toolResult.isError).not.toBe(true);
      expect(toolResult.structuredContent).toEqual({
        status: 'available',
        receiptId: 'receipt_rpc_boundary',
        policyVersion: 'createsomething-together.v1',
        occurredAt: '2026-07-13T15:00:00Z',
        nextActions: ['select_slot'],
        timezone: 'America/Chicago',
        durationMinutes: 30,
        slots: [{ start: '2026-07-14T16:00:00Z', end: '2026-07-14T16:30:00Z' }]
      });
    } finally {
      await client.close();
      await server.close();
    }
  });

  it('discovers policy and returns availability equivalent to the application service', async () => {
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
    const server = createSchedulerMcpServer(service);
    const client = new Client(
      { name: 'scheduler-contract-test', version: '1.0.0' },
      { capabilities: {} }
    );
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([
      server.connect(serverTransport),
      client.connect(clientTransport)
    ]);

    try {
      const [tools, resources, templates, prompts] = await Promise.all([
        client.listTools(),
        client.listResources(),
        client.listResourceTemplates(),
        client.listPrompts()
      ]);
      expect(tools.tools.map((tool) => tool.name)).toContain('scheduler_get_link');
      expect(tools.tools.map((tool) => tool.name)).toContain('scheduler_list_availability');
      expect(tools.tools.map((tool) => tool.name)).toContain('scheduler_prepare_booking');
      expect(tools.tools.map((tool) => tool.name)).not.toContain('scheduler_commit_booking');
      expect(resources.resources.map((resource) => resource.uri)).toContain(
        'scheduler://links/createsomething/together'
      );
      expect(resources.resources.map((resource) => resource.uri)).toContain(
        'scheduler://policy/createsomething/together'
      );
      expect(templates.resourceTemplates.map((template) => template.uriTemplate)).toContain(
        'scheduler://availability/{from}/{to}/{timezone}'
      );
      expect(prompts.prompts.map((prompt) => prompt.name)).toContain(
        'schedule_create_something_together'
      );

      const input = {
        from: '2026-07-14T00:00:00Z',
        to: '2026-07-15T00:00:00Z',
        timezone: 'America/Chicago',
        durationMinutes: 60
      };
      const [toolResult, directResult] = await Promise.all([
        client.callTool({ name: 'scheduler_list_availability', arguments: input }),
        service.listAvailability(input)
      ]);
      expect(toolResult.isError).not.toBe(true);
      expect(toolResult.structuredContent).toEqual(directResult);

      const resource = await client.readResource({
        uri: 'scheduler://links/createsomething/together'
      });
      const linkContent = resource.contents[0];
      if (!linkContent || !('text' in linkContent)) throw new Error('Expected a text resource.');
      expect(JSON.parse(linkContent.text)).toMatchObject({
        slug: 'createsomething/together',
        durationMinutes: 30,
        durationOptionsMinutes: [30, 60],
        timezone: 'America/Chicago'
      });
    } finally {
      await client.close();
      await server.close();
    }
  });

  it('exposes commit only to operator-scoped MCP clients', async () => {
    let eventCount = 0;
    const calendar: CalendarPort = {
      async listBusyIntervals() {
        return { status: 'available', intervals: [] };
      },
      async createEvent() {
        eventCount += 1;
        return {
          status: 'created',
          eventId: 'google-event-operator',
          meetUrl: 'https://meet.google.com/operator-test'
        };
      },
      async updateEvent(input) {
        return {
          status: 'updated',
          eventId: input.eventId,
          meetUrl: 'https://meet.google.com/operator-test'
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
      bookingStore: new InMemoryBookingStore(),
      availabilityOverrides: new InMemoryAvailabilityOverrideStore()
    });
    const server = createSchedulerMcpServer(service, { role: 'operator' });
    const client = new Client(
      { name: 'scheduler-operator-test', version: '1.0.0' },
      { capabilities: {} }
    );
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

    try {
      const tools = await client.listTools();
      const templates = await client.listResourceTemplates();
      expect(templates.resourceTemplates.map((template) => template.uriTemplate)).toEqual(
        expect.arrayContaining([
          'scheduler://bookings/{bookingId}',
          'scheduler://receipts/{receiptId}'
        ])
      );
      const commitTool = tools.tools.find((tool) => tool.name === 'scheduler_commit_booking');
      expect(tools.tools.map((tool) => tool.name)).toEqual(expect.arrayContaining([
        'scheduler_list_availability_overrides',
        'scheduler_upsert_availability_override',
        'scheduler_delete_availability_override'
      ]));
      expect(commitTool?.annotations).toMatchObject({
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      });
      const appliedOverride = await client.callTool({
        name: 'scheduler_upsert_availability_override',
        arguments: {
          overrideId: 'mcp-wednesday-2026-07-15',
          date: '2026-07-15',
          opensAt: '13:00',
          closesAt: '15:00',
          timezone: 'America/Chicago',
          reason: 'Controlled MCP exception',
          explicitIntent: true
        }
      });
      expect(appliedOverride.structuredContent).toMatchObject({
        status: 'applied',
        override: { overrideId: 'mcp-wednesday-2026-07-15' }
      });
      const listedOverrides = await client.callTool({
        name: 'scheduler_list_availability_overrides',
        arguments: {}
      });
      expect(listedOverrides.structuredContent).toMatchObject({
        status: 'available',
        overrides: [{ overrideId: 'mcp-wednesday-2026-07-15' }]
      });
      const deletedOverride = await client.callTool({
        name: 'scheduler_delete_availability_override',
        arguments: {
          overrideId: 'mcp-wednesday-2026-07-15',
          explicitIntent: true
        }
      });
      expect(deletedOverride.structuredContent).toMatchObject({
        status: 'deleted',
        overrideId: 'mcp-wednesday-2026-07-15'
      });
      const prepared = await client.callTool({
        name: 'scheduler_prepare_booking',
        arguments: {
          slot: {
            start: '2026-07-14T16:00:00Z',
            end: '2026-07-14T16:30:00Z'
          },
          scheduler: {
            name: 'Controlled Test',
            email: 'controlled@example.com'
          }
        }
      });
      const proposal = prepared.structuredContent as { proposalToken?: string };
      const committed = await client.callTool({
        name: 'scheduler_commit_booking',
        arguments: {
          proposalToken: proposal.proposalToken,
          idempotencyKey: 'mcp-operator-commit',
          explicitIntent: true
        }
      });
      expect(committed.structuredContent).toMatchObject({ status: 'committed' });
      expect(eventCount).toBe(1);
      const committedContent = committed.structuredContent as {
        booking?: { bookingId?: string };
        receiptId?: string;
      };
      const bookingId = committedContent.booking?.bookingId;
      if (!bookingId) throw new Error('Expected booking id.');
      const rescheduled = await client.callTool({
        name: 'scheduler_reschedule_booking',
        arguments: {
          bookingId,
          newSlot: {
            start: '2026-07-16T18:00:00Z',
            end: '2026-07-16T18:30:00Z'
          },
          idempotencyKey: 'mcp-reschedule',
          explicitIntent: true
        }
      });
      expect(rescheduled.structuredContent).toMatchObject({ status: 'rescheduled' });
      const read = await client.callTool({
        name: 'scheduler_get_booking',
        arguments: { bookingId }
      });
      expect(read.structuredContent).toMatchObject({
        status: 'rescheduled',
        booking: { bookingId, status: 'rescheduled' }
      });
      const cancelled = await client.callTool({
        name: 'scheduler_cancel_booking',
        arguments: {
          bookingId,
          idempotencyKey: 'mcp-cancel',
          explicitIntent: true
        }
      });
      expect(cancelled.structuredContent).toMatchObject({ status: 'cancelled' });
      const receipt = await client.callTool({
        name: 'scheduler_get_receipt',
        arguments: { receiptId: committedContent.receiptId }
      });
      expect(receipt.structuredContent).toMatchObject({ status: 'committed' });
    } finally {
      await client.close();
      await server.close();
    }
  });

  it('exposes API-equivalent room lifecycle only to operator MCP clients', async () => {
    const booking = new BookingService({
      clock: { now: () => '2026-07-11T22:00:00Z' },
      calendar: {
        async listBusyIntervals() { return { status: 'available', intervals: [] }; },
        async createEvent() { throw new Error('not used'); }
      },
      availabilityOverrides: new InMemoryAvailabilityOverrideStore()
    });
    const capabilities = new HmacRoomCapabilitySigner(
      'controlled-mcp-room-secret-with-enough-entropy'
    );
    let nonce = 0;
    const rooms = new RoomService({
      clock: { now: () => '2026-07-11T22:00:00Z' },
      publicOrigin: 'https://scheduler.local',
      capabilities,
      nonce: () => `mcp-room-nonce-${++nonce}`,
      store: new InMemoryRoomStore(),
      provider: {
        async ensureMeeting() { return { status: 'ready', providerMeetingId: 'meeting-mcp' }; },
        async issueParticipantCredential() {
          return {
            status: 'ready',
            providerParticipantId: 'participant-mcp',
            providerToken: 'provider-token-mcp'
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
      listAvailabilityOverrides: booking.listAvailabilityOverrides.bind(booking),
      upsertAvailabilityOverride: booking.upsertAvailabilityOverride.bind(booking),
      deleteAvailabilityOverride: booking.deleteAvailabilityOverride.bind(booking),
      createRoom: rooms.createRoom.bind(rooms),
      issueJoinCredential: rooms.issueJoinCredential.bind(rooms),
      getRoom: rooms.getRoom.bind(rooms),
      endRoom: rooms.endRoom.bind(rooms)
    };
    const server = createSchedulerMcpServer(service, { role: 'operator' });
    const client = new Client(
      { name: 'scheduler-room-operator-test', version: '1.0.0' },
      { capabilities: {} }
    );
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

    try {
      const tools = await client.listTools();
      expect(tools.tools.map((tool) => tool.name)).toEqual(expect.arrayContaining([
        'scheduler_create_room',
        'scheduler_get_room',
        'scheduler_issue_room_join_credential',
        'scheduler_end_room'
      ]));
      expect(tools.tools.find((tool) => tool.name === 'scheduler_end_room')?.annotations)
        .toMatchObject({ destructiveHint: true, idempotentHint: true });
      const created = await client.callTool({
        name: 'scheduler_create_room',
        arguments: {
          title: 'MCP Controlled Room',
          idempotencyKey: 'mcp-room-create',
          explicitIntent: true
        }
      });
      const createdContent = created.structuredContent as {
        room?: { roomId?: string };
        invites?: { guestUrl?: string };
      };
      const roomId = createdContent.room?.roomId;
      const guestUrl = createdContent.invites?.guestUrl;
      if (!roomId || !guestUrl) throw new Error('Expected room and guest invite.');
      const capability = new URL(guestUrl).searchParams.get('cap');
      if (!capability) throw new Error('Expected guest capability.');
      const joined = await client.callTool({
        name: 'scheduler_issue_room_join_credential',
        arguments: { roomId, capability, displayName: 'MCP Guest' }
      });
      expect(joined.structuredContent).toMatchObject({
        status: 'ready',
        role: 'guest',
        providerToken: 'provider-token-mcp'
      });
      const read = await client.callTool({
        name: 'scheduler_get_room',
        arguments: { roomId }
      });
      expect(read.structuredContent).toMatchObject({ status: 'active', room: { roomId } });
      const ended = await client.callTool({
        name: 'scheduler_end_room',
        arguments: { roomId, idempotencyKey: 'mcp-room-end', explicitIntent: true }
      });
      expect(ended.structuredContent).toMatchObject({ status: 'ended' });
    } finally {
      await client.close();
      await server.close();
    }
  });
});
