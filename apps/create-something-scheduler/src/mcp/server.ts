import {
  McpServer,
  ResourceTemplate
} from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { normalizeBookingContext, type BookingService } from '../application/booking-service.js';
import type { RoomService } from '../application/room-service.js';

const availabilityInputSchema = z.object({
  from: z.string().datetime({ offset: true }).describe('Inclusive UTC or offset ISO instant.'),
  to: z.string().datetime({ offset: true }).describe('Exclusive UTC or offset ISO instant.'),
  timezone: z.string().min(1).describe('IANA timezone used by the scheduler for display.'),
  durationMinutes: z.union([z.literal(30), z.literal(60)]).default(30)
    .describe('Meeting duration. Only 30 or 60 minutes is supported.')
});

const linkOutputSchema = z.object({
  slug: z.literal('createsomething/together'),
  title: z.string(),
  description: z.string(),
  organizer: z.object({ name: z.string(), email: z.string().email() }),
  timezone: z.string(),
  durationMinutes: z.number(),
  durationOptionsMinutes: z.array(z.union([z.literal(30), z.literal(60)])),
  incrementMinutes: z.number(),
  minimumNoticeMinutes: z.number(),
  bufferBeforeMinutes: z.number(),
  bufferAfterMinutes: z.number(),
  availability: z.array(z.object({ day: z.string(), opensAt: z.string(), closesAt: z.string() })),
  conferencing: z.string(),
  policyVersion: z.string()
});

const availabilityOutputSchema = z.object({
  status: z.enum(['available', 'retryable']),
  receiptId: z.string(),
  policyVersion: z.string(),
  occurredAt: z.string(),
  nextActions: z.array(z.string()),
  timezone: z.string().optional(),
  durationMinutes: z.union([z.literal(30), z.literal(60)]),
  reason: z.string().optional(),
  slots: z.array(z.object({ start: z.string(), end: z.string() }))
});
const lifecycleMetadataSchema = {
  receiptId: z.string(),
  policyVersion: z.string(),
  occurredAt: z.string(),
  nextActions: z.array(z.string())
};

const availabilityOverrideSchema = z.object({
  overrideId: z.string(),
  date: z.string(),
  opensAt: z.string(),
  closesAt: z.string(),
  timezone: z.string(),
  reason: z.string(),
  createdAt: z.string()
});
const availabilityOverrideInputSchema = z.object({
  overrideId: z.string().trim().regex(/^[a-z0-9][a-z0-9_-]{2,99}$/),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  opensAt: z.string().regex(/^\d{2}:\d{2}$/),
  closesAt: z.string().regex(/^\d{2}:\d{2}$/),
  timezone: z.string().min(1),
  reason: z.string().trim().min(1).max(200),
  explicitIntent: z.literal(true)
});
const availabilityOverrideListOutputSchema = z.object({
  ...lifecycleMetadataSchema,
  status: z.literal('available'),
  overrides: z.array(availabilityOverrideSchema)
});
const availabilityOverrideMutationOutputSchema = z.object({
  ...lifecycleMetadataSchema,
  status: z.enum(['applied', 'operator_required', 'rejected']),
  override: availabilityOverrideSchema.optional(),
  reason: z.string().optional()
});
const availabilityOverrideDeleteOutputSchema = z.object({
  ...lifecycleMetadataSchema,
  status: z.enum(['deleted', 'operator_required', 'rejected']),
  overrideId: z.string().optional(),
  reason: z.string().optional()
});

const slotSchema = z.object({ start: z.string(), end: z.string() });
const schedulerSchema = z.object({ name: z.string(), email: z.string().email() });
const bookingContextSchema = z.object({
  source: z.string().optional(),
  intent: z.string().optional(),
  lane: z.string().optional(),
  warmup: z.string().optional(),
  readiness: z.string().optional(),
  score: z.number().int().min(0).max(100).optional(),
  atlasSessionId: z.string().optional(),
  agentMessages: z.number().int().min(0).max(200).optional(),
  warmupNotes: z.string().optional()
});
const prepareOutputSchema = z.object({
  ...lifecycleMetadataSchema,
  status: z.enum(['proposed', 'rejected', 'retryable']),
  proposalId: z.string().optional(),
  proposalToken: z.string().optional(),
  expiresAt: z.string().optional(),
  slot: slotSchema.optional(),
  context: bookingContextSchema.optional(),
  reason: z.string().optional()
});
const bookingSchema = z.object({
  bookingId: z.string(),
  proposalId: z.string(),
  status: z.enum(['committed', 'rescheduled', 'cancelled']),
  slot: slotSchema,
  scheduler: schedulerSchema,
  context: bookingContextSchema.optional(),
  provider: z.object({ eventId: z.string(), meetUrl: z.string().url() })
});
const commitOutputSchema = z.object({
  ...lifecycleMetadataSchema,
  status: z.enum(['committed', 'rejected', 'retryable', 'operator_required']),
  replayed: z.boolean().optional(),
  reason: z.string().optional(),
  booking: bookingSchema.optional()
});
const transitionOutputSchema = z.object({
  ...lifecycleMetadataSchema,
  status: z.enum(['rescheduled', 'cancelled', 'rejected', 'retryable', 'operator_required']),
  replayed: z.boolean().optional(),
  reason: z.string().optional(),
  booking: bookingSchema.optional()
});
const bookingReadOutputSchema = z.object({
  ...lifecycleMetadataSchema,
  status: z.enum(['committed', 'rescheduled', 'cancelled', 'rejected']),
  reason: z.string().optional(),
  booking: bookingSchema.optional()
});
const receiptReadOutputSchema = z.object({
  ...lifecycleMetadataSchema,
  status: z.enum(['proposed', 'committed', 'rescheduled', 'cancelled', 'rejected', 'retryable', 'operator_required', 'reminder_sent', 'reminder_retryable', 'reminder_failed', 'notification_sent', 'notification_retryable', 'notification_failed', 'override_applied', 'override_deleted']),
  reason: z.string().optional(),
  receipt: z.object({
    receiptId: z.string(),
    status: z.enum(['proposed', 'committed', 'rescheduled', 'cancelled', 'rejected', 'retryable', 'operator_required', 'reminder_sent', 'reminder_retryable', 'reminder_failed', 'notification_sent', 'notification_retryable', 'notification_failed', 'override_applied', 'override_deleted']),
    policyVersion: z.string(),
    occurredAt: z.string(),
    nextActions: z.array(z.string()),
    bookingId: z.string().optional(),
    context: bookingContextSchema.optional(),
    reason: z.string().optional()
  }).optional()
});

const roomParticipantSchema = z.object({
  providerParticipantId: z.string(),
  joinedAt: z.string()
});
const roomSchema = z.object({
  roomId: z.string(),
  bookingId: z.string().optional(),
  title: z.string(),
  status: z.enum(['ready', 'active', 'ended']),
  providerMeetingId: z.string(),
  joinUrl: z.string().url(),
  createdAt: z.string(),
  endedAt: z.string().optional(),
  participants: z.object({
    host: roomParticipantSchema.optional(),
    guest: roomParticipantSchema.optional()
  })
});
const createRoomOutputSchema = z.object({
  ...lifecycleMetadataSchema,
  status: z.enum(['ready', 'rejected', 'retryable', 'operator_required']),
  room: roomSchema.optional(),
  replayed: z.boolean().optional(),
  reason: z.string().optional(),
  invites: z.object({
    hostUrl: z.string().url(),
    guestUrl: z.string().url(),
    expiresAt: z.string()
  }).optional()
});
const roomReadOutputSchema = z.object({
  ...lifecycleMetadataSchema,
  status: z.enum(['ready', 'active', 'ended', 'rejected']),
  room: roomSchema.optional(),
  reason: z.string().optional()
});
const roomCredentialOutputSchema = z.object({
  ...lifecycleMetadataSchema,
  status: z.enum(['ready', 'rejected', 'retryable']),
  role: z.enum(['host', 'guest']).optional(),
  providerMeetingId: z.string().optional(),
  providerParticipantId: z.string().optional(),
  providerToken: z.string().optional(),
  nextCapability: z.string().optional(),
  cacheControl: z.literal('no-store').optional(),
  reason: z.string().optional()
});
const endRoomOutputSchema = z.object({
  ...lifecycleMetadataSchema,
  status: z.enum(['ended', 'rejected', 'retryable', 'operator_required']),
  room: roomSchema.optional(),
  replayed: z.boolean().optional(),
  reason: z.string().optional()
});

export type SchedulerMcpScope = { role: 'public' | 'operator' };

export function createSchedulerMcpServer(
  service: Pick<
    BookingService,
    | 'getLink'
    | 'listAvailability'
    | 'prepareBooking'
    | 'commitBooking'
    | 'getBooking'
    | 'getReceipt'
    | 'rescheduleBooking'
    | 'cancelBooking'
    | 'listAvailabilityOverrides'
    | 'upsertAvailabilityOverride'
    | 'deleteAvailabilityOverride'
  > & Partial<Pick<
    RoomService,
    'createRoom' | 'issueJoinCredential' | 'getRoom' | 'endRoom'
  >>,
  scope: SchedulerMcpScope = { role: 'public' }
): McpServer {
  const server = new McpServer(
    { name: 'create-something-scheduler', version: '0.1.0' },
    {
      instructions: 'Inspect the link policy, list availability, prepare without mutation, obtain explicit user intent, then commit once with an idempotency key. Never infer availability or committed state.'
    }
  );

  server.registerResource(
    'create-something-together-link',
    'scheduler://links/createsomething/together',
    {
      title: 'Create Something Together link',
      description: 'Public configuration and deterministic policy for Micah Johnson’s active scheduling link.',
      mimeType: 'application/json'
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify(service.getLink(), null, 2)
        }
      ]
    })
  );

  server.registerResource(
    'create-something-together-policy',
    'scheduler://policy/createsomething/together',
    {
      title: 'Create Something Together scheduling policy',
      description: 'Deterministic duration, wall-clock availability, notice, increment, and conferencing policy.',
      mimeType: 'application/json'
    },
    async (uri) => ({
      contents: [{
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify(service.getLink(), null, 2)
      }]
    })
  );

  server.registerResource(
    'scheduler-availability',
    new ResourceTemplate(
      'scheduler://availability/{from}/{to}/{timezone}',
      { list: undefined }
    ),
    {
      title: 'Current safe scheduler availability',
      description: 'Provider-checked availability for an explicit window and display timezone.',
      mimeType: 'application/json'
    },
    async (uri, variables) => ({
      contents: [{
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify(await service.listAvailability({
          from: String(variables.from),
          to: String(variables.to),
          timezone: String(variables.timezone)
        }), null, 2)
      }]
    })
  );

  server.registerTool(
    'scheduler_get_link',
    {
      title: 'Read Create Something Together policy',
      description: 'Return the authoritative public link and deterministic scheduling policy.',
      inputSchema: z.object({}),
      outputSchema: linkOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async () => textResult(service.getLink())
  );

  server.registerTool(
    'scheduler_list_availability',
    {
      title: 'List Create Something Together availability',
      description: 'Return policy-valid 30- or 60-minute slots after current Calendar conflicts are checked. Fails closed with no slots when the provider is uncertain.',
      inputSchema: availabilityInputSchema,
      outputSchema: availabilityOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (input) => {
      const result = await service.listAvailability(input);
      const structuredContent = jsonContract(result);
      return {
        content: [{ type: 'text', text: JSON.stringify(structuredContent, null, 2) }],
        structuredContent
      };
    }
  );

  server.registerTool(
    'scheduler_prepare_booking',
    {
      title: 'Prepare a Create Something Together booking',
      description: 'Revalidate one selected slot and return a signed, expiring proposal. This does not create a booking or Calendar event.',
      inputSchema: z.object({
        slot: slotSchema,
        scheduler: schedulerSchema,
        context: bookingContextSchema.optional()
      }),
      outputSchema: prepareOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (input) => {
      const context = normalizeBookingContext(input.context);
      const result = await service.prepareBooking({
        slot: input.slot,
        scheduler: input.scheduler,
        ...(context ? { context } : {})
      });
      const structuredContent = jsonContract(result);
      return {
        content: [{ type: 'text', text: JSON.stringify(structuredContent, null, 2) }],
        structuredContent
      };
    }
  );

  if (scope.role === 'operator') {
    server.registerResource(
      'scheduler-availability-overrides',
      'scheduler://availability-overrides',
      {
        title: 'Scheduler availability overrides',
        description: 'Current operator-owned date-specific exceptions layered onto recurring availability.',
        mimeType: 'application/json'
      },
      async (uri) => ({
        contents: [{
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify(await service.listAvailabilityOverrides(), null, 2)
        }]
      })
    );
    server.registerResource(
      'scheduler-booking',
      new ResourceTemplate('scheduler://bookings/{bookingId}', { list: undefined }),
      {
        title: 'Scheduler booking',
        description: 'Current lifecycle state for one operator-scoped booking.',
        mimeType: 'application/json'
      },
      async (uri, variables) => ({
        contents: [{
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify(await service.getBooking(String(variables.bookingId)), null, 2)
        }]
      })
    );
    server.registerResource(
      'scheduler-receipt',
      new ResourceTemplate('scheduler://receipts/{receiptId}', { list: undefined }),
      {
        title: 'Scheduler receipt',
        description: 'Machine-readable lifecycle evidence for one operator-scoped action.',
        mimeType: 'application/json'
      },
      async (uri, variables) => ({
        contents: [{
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify(await service.getReceipt(String(variables.receiptId)), null, 2)
        }]
      })
    );
    if (
      service.createRoom &&
      service.issueJoinCredential &&
      service.getRoom &&
      service.endRoom
    ) {
      const createRoom = service.createRoom;
      const issueJoinCredential = service.issueJoinCredential;
      const getRoom = service.getRoom;
      const endRoom = service.endRoom;
      server.registerResource(
        'scheduler-room',
        new ResourceTemplate('scheduler://rooms/{roomId}', { list: undefined }),
        {
          title: 'CREATE SOMETHING meeting room',
          description: 'Operator-scoped room lifecycle state. Provider participant tokens are never stored in this resource.',
          mimeType: 'application/json'
        },
        async (uri, variables) => ({
          contents: [{
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(await getRoom({ roomId: String(variables.roomId) }), null, 2)
          }]
        })
      );
      server.registerTool(
        'scheduler_create_room',
        {
          title: 'Create a first-party meeting room',
          description: 'Create or safely replay one controlled room and issue fresh host/guest capability URLs after explicit operator intent.',
          inputSchema: z.object({
            bookingId: z.string().trim().min(1).max(200).optional(),
            title: z.string().trim().min(1).max(200),
            idempotencyKey: z.string().trim().min(1).max(200),
            explicitIntent: z.literal(true)
          }),
          outputSchema: createRoomOutputSchema,
          annotations: {
            readOnlyHint: false,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: true
          }
        },
        async (input) => textResult(await createRoom({
          title: input.title,
          idempotencyKey: input.idempotencyKey,
          explicitIntent: input.explicitIntent,
          ...(input.bookingId ? { bookingId: input.bookingId } : {})
        }))
      );
      server.registerTool(
        'scheduler_get_room',
        {
          title: 'Read a first-party meeting room',
          description: 'Read the authoritative room lifecycle without exposing provider credentials.',
          inputSchema: z.object({ roomId: z.string().min(1) }),
          outputSchema: roomReadOutputSchema,
          annotations: {
            readOnlyHint: true,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: false
          }
        },
        async ({ roomId }) => textResult(await getRoom({ roomId }))
      );
      server.registerTool(
        'scheduler_issue_room_join_credential',
        {
          title: 'Exchange a room capability for a fresh join credential',
          description: 'Consume one signed room capability and return a time-bound provider credential in this no-store response only.',
          inputSchema: z.object({
            roomId: z.string().min(1),
            capability: z.string().min(1).max(4096),
            displayName: z.string().trim().min(1).max(80)
          }),
          outputSchema: roomCredentialOutputSchema,
          annotations: {
            readOnlyHint: false,
            destructiveHint: false,
            idempotentHint: false,
            openWorldHint: true
          }
        },
        async (input) => textResult(await issueJoinCredential(input))
      );
      server.registerTool(
        'scheduler_end_room',
        {
          title: 'End a first-party meeting room',
          description: 'Terminally inactivate the provider meeting and remove live participants after explicit operator intent.',
          inputSchema: z.object({
            roomId: z.string().min(1),
            idempotencyKey: z.string().trim().min(1).max(200),
            explicitIntent: z.literal(true)
          }),
          outputSchema: endRoomOutputSchema,
          annotations: {
            readOnlyHint: false,
            destructiveHint: true,
            idempotentHint: true,
            openWorldHint: true
          }
        },
        async (input) => textResult(await endRoom(input))
      );
    }
    server.registerTool(
      'scheduler_list_availability_overrides',
      {
        title: 'List date-specific availability overrides',
        description: 'Return the bounded operator-owned exceptions that augment recurring availability.',
        inputSchema: z.object({}),
        outputSchema: availabilityOverrideListOutputSchema,
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false
        }
      },
      async () => textResult(await service.listAvailabilityOverrides())
    );
    server.registerTool(
      'scheduler_upsert_availability_override',
      {
        title: 'Open a bounded date-specific availability window',
        description: 'Create or replace one explicit date window after operator intent. Public availability still checks Calendar conflicts before exposing slots.',
        inputSchema: availabilityOverrideInputSchema,
        outputSchema: availabilityOverrideMutationOutputSchema,
        annotations: {
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false
        }
      },
      async (input) => textResult(await service.upsertAvailabilityOverride(input))
    );
    server.registerTool(
      'scheduler_delete_availability_override',
      {
        title: 'Delete a date-specific availability override',
        description: 'Roll back one bounded availability exception after explicit operator intent.',
        inputSchema: z.object({
          overrideId: z.string().trim().min(1),
          explicitIntent: z.literal(true)
        }),
        outputSchema: availabilityOverrideDeleteOutputSchema,
        annotations: {
          readOnlyHint: false,
          destructiveHint: true,
          idempotentHint: true,
          openWorldHint: false
        }
      },
      async (input) => textResult(await service.deleteAvailabilityOverride(input))
    );
    server.registerTool(
      'scheduler_commit_booking',
      {
        title: 'Commit a prepared Create Something Together booking',
        description: 'Commit one valid signed proposal after explicit intent. Requires operator scope and a stable caller-supplied idempotency key.',
        inputSchema: z.object({
          proposalToken: z.string().min(1),
          idempotencyKey: z.string().trim().min(1).max(200),
          explicitIntent: z.literal(true)
        }),
        outputSchema: commitOutputSchema,
        annotations: {
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: true
        }
      },
      async (input) => {
        const result = await service.commitBooking(input);
        const structuredContent = jsonContract(result);
        return {
          content: [{ type: 'text', text: JSON.stringify(structuredContent, null, 2) }],
          structuredContent
        };
      }
    );
    server.registerTool(
      'scheduler_get_booking',
      {
        title: 'Read a scheduler booking',
        description: 'Read the current lifecycle state and provider references for one booking.',
        inputSchema: z.object({ bookingId: z.string().min(1) }),
        outputSchema: bookingReadOutputSchema,
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false
        }
      },
      async ({ bookingId }) => textResult(await service.getBooking(bookingId))
    );
    server.registerTool(
      'scheduler_get_receipt',
      {
        title: 'Read a scheduler receipt',
        description: 'Read one machine-verifiable lifecycle receipt.',
        inputSchema: z.object({ receiptId: z.string().min(1) }),
        outputSchema: receiptReadOutputSchema,
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false
        }
      },
      async ({ receiptId }) => textResult(await service.getReceipt(receiptId))
    );
    server.registerTool(
      'scheduler_reschedule_booking',
      {
        title: 'Reschedule a scheduler booking',
        description: 'Move the same logical booking and provider event after a final availability check and explicit intent.',
        inputSchema: z.object({
          bookingId: z.string().min(1),
          newSlot: slotSchema,
          idempotencyKey: z.string().trim().min(1).max(200),
          explicitIntent: z.literal(true)
        }),
        outputSchema: transitionOutputSchema,
        annotations: {
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: true
        }
      },
      async (input) => textResult(await service.rescheduleBooking(input))
    );
    server.registerTool(
      'scheduler_cancel_booking',
      {
        title: 'Cancel a scheduler booking',
        description: 'Cancel the application booking and its provider event after explicit intent.',
        inputSchema: z.object({
          bookingId: z.string().min(1),
          idempotencyKey: z.string().trim().min(1).max(200),
          explicitIntent: z.literal(true)
        }),
        outputSchema: transitionOutputSchema,
        annotations: {
          readOnlyHint: false,
          destructiveHint: true,
          idempotentHint: true,
          openWorldHint: true
        }
      },
      async (input) => textResult(await service.cancelBooking(input))
    );
  }

  server.registerPrompt(
    'schedule_create_something_together',
    {
      title: 'Schedule Create Something Together',
      description: 'Safely sequence discovery, availability, non-mutating preparation, explicit intent, commit, and receipt readback.'
    },
    async () => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: 'Read scheduler://links/createsomething/together. Use scheduler_list_availability instead of inventing slots. Prepare is non-mutating. Before any commit, obtain explicit user intent and use exactly one caller-supplied idempotency key. Treat only a committed receipt as success.'
          }
        }
      ]
    })
  );

  return server;
}

function textResult(value: unknown) {
  const structuredContent = jsonContract(value);
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(structuredContent, null, 2) }],
    structuredContent
  };
}

function jsonContract(value: unknown): Record<string, unknown> {
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}
