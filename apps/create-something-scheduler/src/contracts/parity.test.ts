import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { describe, expect, it } from 'vitest';
import {
  BookingService,
  InMemoryBookingStore,
  type CalendarPort
} from '../application/booking-service.js';
import { handleApiRequest } from '../http/api.js';
import { createSchedulerMcpServer } from '../mcp/server.js';

describe('API and MCP parity', () => {
  it('prepares through API, commits through MCP, and replays through API without duplication', async () => {
    let eventCount = 0;
    const calendar: CalendarPort = {
      async listBusyIntervals() {
        return { status: 'available', intervals: [] };
      },
      async createEvent() {
        eventCount += 1;
        return {
          status: 'created',
          eventId: 'google-event-parity',
          meetUrl: 'https://meet.google.com/parity-test'
        };
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
    const proposal = await prepareResponse.json() as { proposalToken?: string };

    const server = createSchedulerMcpServer(service, { role: 'operator' });
    const client = new Client(
      { name: 'scheduler-parity-test', version: '1.0.0' },
      { capabilities: {} }
    );
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

    try {
      const commitInput = {
        proposalToken: proposal.proposalToken,
        idempotencyKey: 'cross-interface-commit',
        explicitIntent: true
      };
      const mcpCommit = await client.callTool({
        name: 'scheduler_commit_booking',
        arguments: commitInput
      });
      const apiReplayResponse = await handleApiRequest(
        new Request('https://scheduler.local/api/v1/bookings', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(commitInput)
        }),
        service,
        { role: 'operator' }
      );
      const mcpResult = mcpCommit.structuredContent as {
        receiptId?: string;
        booking?: unknown;
        replayed?: boolean;
      };
      const apiResult = await apiReplayResponse.json() as {
        receiptId?: string;
        booking?: unknown;
        replayed?: boolean;
      };

      expect(mcpResult.replayed).toBe(false);
      expect(apiResult.replayed).toBe(true);
      expect(apiResult.receiptId).toBe(mcpResult.receiptId);
      expect(apiResult.booking).toEqual(mcpResult.booking);
      expect(eventCount).toBe(1);
    } finally {
      await client.close();
      await server.close();
    }
  });
});
