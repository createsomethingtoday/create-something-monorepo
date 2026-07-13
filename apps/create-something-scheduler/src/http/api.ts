import {
  normalizeBookingContext,
  type Booking,
  type BookingService
} from '../application/booking-service.js';
import type { RoomService } from '../application/room-service.js';
import { z } from 'zod';

type SchedulerService = Pick<
  BookingService,
  | 'getLink'
  | 'listAvailability'
  | 'prepareBooking'
  | 'commitBooking'
  | 'getBooking'
  | 'getReceipt'
  | 'rescheduleBooking'
  | 'cancelBooking'
> & Partial<Pick<
  RoomService,
  'createRoom' | 'issueJoinCredential' | 'getRoom' | 'endRoom'
>>;

export type ApiScope =
  | { role: 'public' }
  | { role: 'browser' }
  | { role: 'operator' }
  | { role: 'booking'; bookingId: string };

export type ApiOptions = {
  issueActionToken?: (booking: Booking) => Promise<string>;
};

const prepareSchema = z.object({
  slot: z.object({
    start: z.string().datetime({ offset: true }),
    end: z.string().datetime({ offset: true })
  }),
  scheduler: z.object({
    name: z.string().trim().min(1).max(100),
    email: z.string().email()
  }),
  context: z.object({
    source: z.string().optional(),
    intent: z.string().optional(),
    lane: z.string().optional(),
    warmup: z.string().optional(),
    readiness: z.string().optional(),
    score: z.number().int().optional(),
    atlasSessionId: z.string().optional(),
    agentMessages: z.number().int().optional(),
    warmupNotes: z.string().optional()
  }).strict().optional()
});

const commitSchema = z.object({
  proposalToken: z.string().min(1),
  idempotencyKey: z.string().trim().min(1).max(200),
  explicitIntent: z.boolean()
});

const rescheduleSchema = z.object({
  newSlot: z.object({
    start: z.string().datetime({ offset: true }),
    end: z.string().datetime({ offset: true })
  }),
  idempotencyKey: z.string().trim().min(1).max(200),
  explicitIntent: z.boolean()
});

const cancelSchema = z.object({
  idempotencyKey: z.string().trim().min(1).max(200),
  explicitIntent: z.boolean()
});

const createRoomSchema = z.object({
  bookingId: z.string().trim().min(1).max(200).optional(),
  title: z.string().trim().min(1).max(200),
  idempotencyKey: z.string().trim().min(1).max(200),
  explicitIntent: z.boolean()
});

const joinCredentialSchema = z.object({
  capability: z.string().min(1).max(4096),
  displayName: z.string().trim().min(1).max(80)
});

const endRoomSchema = z.object({
  idempotencyKey: z.string().trim().min(1).max(200),
  explicitIntent: z.boolean(),
  capability: z.string().min(1).max(4096).optional()
});

export async function handleApiRequest(
  request: Request,
  service: SchedulerService,
  scope: ApiScope = { role: 'public' },
  options: ApiOptions = {}
): Promise<Response> {
  const url = new URL(request.url);
  if (request.method === 'GET' && url.pathname === '/api/v1/links/createsomething/together') {
    return json(await service.getLink(), 200);
  }
  if (request.method === 'GET' && url.pathname === '/api/v1/availability') {
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const timezone = url.searchParams.get('timezone');
    const duration = url.searchParams.get('durationMinutes');
    if (!from || !to || !timezone) {
      return json(
        {
          status: 'rejected',
          error: {
            code: 'invalid_request',
            message: 'from, to, and timezone are required.'
          }
        },
        400
      );
    }

    try {
      const result = await service.listAvailability({
        from,
        to,
        timezone,
        ...(duration === null ? {} : { durationMinutes: Number(duration) })
      });
      return json(result, result.status === 'retryable' ? 503 : 200);
    } catch (error) {
      return json(
        {
          status: 'rejected',
          error: {
            code: 'invalid_request',
            message: error instanceof Error ? error.message : 'The availability request is invalid.'
          }
        },
        400
      );
    }
  }

  if (request.method === 'POST' && url.pathname === '/api/v1/bookings/prepare') {
    const parsed = prepareSchema.safeParse(await readJson(request));
    if (!parsed.success) return invalidRequest(parsed.error.issues);
    const context = normalizeBookingContext(parsed.data.context);
    const result = await service.prepareBooking({
      slot: parsed.data.slot,
      scheduler: parsed.data.scheduler,
      ...(context ? { context } : {})
    });
    return json(result, result.status === 'proposed' ? 200 : result.status === 'retryable' ? 503 : 409);
  }

  if (request.method === 'POST' && url.pathname === '/api/v1/bookings') {
    if (scope.role !== 'operator' && scope.role !== 'browser') {
      return json(
        {
          status: 'operator_required',
          error: {
            code: 'operator_scope_required',
            message: 'Booking commit requires an authenticated operator or an approved browser anti-abuse scope.'
          },
          nextActions: ['authenticate_operator']
        },
        403
      );
    }
    const parsed = commitSchema.safeParse(await readJson(request));
    if (!parsed.success) return invalidRequest(parsed.error.issues);
    const result = await service.commitBooking(parsed.data);
    const status = result.status === 'committed'
      ? 200
      : result.status === 'retryable'
        ? 503
        : result.status === 'operator_required'
          ? 428
          : 409;
    if (result.status === 'committed' && options.issueActionToken) {
      return json({
        ...result,
        actionToken: await options.issueActionToken(result.booking)
      }, status);
    }
    return json(result, status);
  }

  if (request.method === 'POST' && url.pathname === '/api/v1/rooms') {
    if (scope.role !== 'operator') return forbiddenRoom('operator_scope_required');
    if (!service.createRoom) return roomServiceUnavailable();
    const parsed = createRoomSchema.safeParse(await readJson(request));
    if (!parsed.success) return invalidRequest(parsed.error.issues);
    const result = await service.createRoom({
      title: parsed.data.title,
      idempotencyKey: parsed.data.idempotencyKey,
      explicitIntent: parsed.data.explicitIntent,
      ...(parsed.data.bookingId ? { bookingId: parsed.data.bookingId } : {})
    });
    return json(result, roomMutationStatus(result.status));
  }

  const roomMatch = url.pathname.match(/^\/api\/v1\/rooms\/([^/]+)$/);
  if (request.method === 'GET' && roomMatch) {
    if (scope.role !== 'operator') return forbiddenRoom('operator_scope_required');
    if (!service.getRoom) return roomServiceUnavailable();
    const result = await service.getRoom({
      roomId: decodeURIComponent(roomMatch[1] ?? '')
    });
    return json(result, result.status === 'rejected' ? 404 : 200);
  }

  const credentialMatch = url.pathname.match(/^\/api\/v1\/rooms\/([^/]+)\/credentials$/);
  if (request.method === 'POST' && credentialMatch) {
    if (!service.issueJoinCredential) return roomServiceUnavailable();
    const parsed = joinCredentialSchema.safeParse(await readJson(request));
    if (!parsed.success) return invalidRequest(parsed.error.issues);
    const result = await service.issueJoinCredential({
      roomId: decodeURIComponent(credentialMatch[1] ?? ''),
      ...parsed.data
    });
    return json(result, result.status === 'ready' ? 200 : result.status === 'retryable' ? 503 : 409);
  }

  const endRoomMatch = url.pathname.match(/^\/api\/v1\/rooms\/([^/]+)\/end$/);
  if (request.method === 'POST' && endRoomMatch) {
    if (!service.endRoom) return roomServiceUnavailable();
    const parsed = endRoomSchema.safeParse(await readJson(request));
    if (!parsed.success) return invalidRequest(parsed.error.issues);
    if (scope.role !== 'operator' && !parsed.data.capability) {
      return forbiddenRoom('host_capability_required');
    }
    const result = await service.endRoom({
      roomId: decodeURIComponent(endRoomMatch[1] ?? ''),
      idempotencyKey: parsed.data.idempotencyKey,
      explicitIntent: parsed.data.explicitIntent,
      ...(parsed.data.capability ? { capability: parsed.data.capability } : {})
    });
    return json(result, roomMutationStatus(result.status));
  }

  const bookingMatch = url.pathname.match(/^\/api\/v1\/bookings\/([^/]+)$/);
  if (request.method === 'GET' && bookingMatch) {
    const bookingId = decodeURIComponent(bookingMatch[1] ?? '');
    if (!canAccessBooking(scope, bookingId)) return forbiddenBooking();
    const result = await service.getBooking(bookingId);
    return json(result, result.status === 'rejected' ? 404 : 200);
  }

  const rescheduleMatch = url.pathname.match(/^\/api\/v1\/bookings\/([^/]+)\/reschedule$/);
  if (request.method === 'POST' && rescheduleMatch) {
    const bookingId = decodeURIComponent(rescheduleMatch[1] ?? '');
    if (!canAccessBooking(scope, bookingId)) return forbiddenBooking();
    const parsed = rescheduleSchema.safeParse(await readJson(request));
    if (!parsed.success) return invalidRequest(parsed.error.issues);
    const result = await service.rescheduleBooking({ bookingId, ...parsed.data });
    if (result.status === 'rescheduled' && options.issueActionToken) {
      return json({
        ...result,
        actionToken: await options.issueActionToken(result.booking)
      }, transitionStatus(result.status));
    }
    return json(result, transitionStatus(result.status));
  }

  const cancelMatch = url.pathname.match(/^\/api\/v1\/bookings\/([^/]+)\/cancel$/);
  if (request.method === 'POST' && cancelMatch) {
    const bookingId = decodeURIComponent(cancelMatch[1] ?? '');
    if (!canAccessBooking(scope, bookingId)) return forbiddenBooking();
    const parsed = cancelSchema.safeParse(await readJson(request));
    if (!parsed.success) return invalidRequest(parsed.error.issues);
    const result = await service.cancelBooking({ bookingId, ...parsed.data });
    return json(result, transitionStatus(result.status));
  }

  const receiptMatch = url.pathname.match(/^\/api\/v1\/receipts\/([^/]+)$/);
  if (request.method === 'GET' && receiptMatch) {
    if (scope.role !== 'operator') return forbiddenBooking();
    const result = await service.getReceipt(decodeURIComponent(receiptMatch[1] ?? ''));
    return json(result, result.status === 'rejected' ? 404 : 200);
  }

  return json(
    {
      status: 'rejected',
      error: {
        code: 'not_found',
        message: 'The requested scheduler API route does not exist.'
      }
    },
    404
  );
}

function canAccessBooking(scope: ApiScope, bookingId: string): boolean {
  return scope.role === 'operator' || (scope.role === 'booking' && scope.bookingId === bookingId);
}

function forbiddenBooking(): Response {
  return json(
    {
      status: 'operator_required',
      error: {
        code: 'booking_scope_required',
        message: 'This operation requires operator scope or the matching booking action scope.'
      },
      nextActions: ['authenticate_booking_action']
    },
    403
  );
}

function forbiddenRoom(code: string): Response {
  return json({
    status: 'operator_required',
    error: {
      code,
      message: 'This room operation requires operator scope.'
    },
    nextActions: ['authenticate_operator']
  }, 403);
}

function roomServiceUnavailable(): Response {
  return json({
    status: 'retryable',
    error: {
      code: 'room_service_unavailable',
      message: 'The room service is not configured or temporarily unavailable.'
    }
  }, 503);
}

function roomMutationStatus(status: string): number {
  if (status === 'ready' || status === 'ended') return 200;
  if (status === 'retryable') return 503;
  if (status === 'operator_required') return 428;
  return 409;
}

function transitionStatus(status: string): number {
  if (status === 'rescheduled' || status === 'cancelled') return 200;
  if (status === 'retryable') return 503;
  if (status === 'operator_required') return 428;
  return 409;
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function invalidRequest(issues: z.ZodIssue[]): Response {
  return json(
    {
      status: 'rejected',
      error: {
        code: 'invalid_request',
        message: 'The JSON request body is invalid.',
        issues: issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message
        }))
      }
    },
    400
  );
}

function json(value: unknown, status: number): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}
