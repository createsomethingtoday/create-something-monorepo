import { z } from 'zod';
import { Data, Effect, Either } from 'effect';
import { CloudflareApiClient } from '../forge-pilot/generated/sdk/Client.js';
import { CloudflareApiError } from '../forge-pilot/generated/sdk/errors/CloudflareApiError.js';

const duration = z.union([z.literal(30), z.literal(60)]);
const linkSchema = z.object({
  durationMinutes: z.literal(30),
  durationOptionsMinutes: z.array(duration)
});
const availabilitySchema = z.object({
  status: z.enum(['available', 'retryable']),
  durationMinutes: duration,
  timezone: z.string().optional(),
  reason: z.string().optional(),
  slots: z.array(z.object({ start: z.string().datetime({ offset: true }), end: z.string().datetime({ offset: true }) })),
  receiptId: z.string(),
  policyVersion: z.string(),
  occurredAt: z.string().datetime({ offset: true }),
  nextActions: z.array(z.string())
});
const querySchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  timezone: z.string().min(1),
  durationMinutes: duration.optional()
}).strict();
const optionsSchema = z.object({ baseUrl: z.string().url().optional() }).strict();

export type DurationMinutes = 30 | 60;
export type Link = z.infer<typeof linkSchema>;
export type Availability = z.infer<typeof availabilitySchema> & { status: 'available' };
export type RetryableAvailability = z.infer<typeof availabilitySchema> & { status: 'retryable' };
export type AvailabilityQuery = z.infer<typeof querySchema>;
export interface SchedulerReadOptions { baseUrl?: string }
export interface SchedulerReadClient {
  getLink(): Promise<Link>;
  listAvailability(query: AvailabilityQuery): Promise<Availability>;
}

/** Expected failures retain their original cause without exposing the generated client. */
export class SchedulerReadError extends Data.TaggedError('SchedulerReadError')<{
  readonly operation: keyof SchedulerReadClient;
  readonly kind: 'transport' | 'http' | 'decode';
  readonly statusCode?: number;
  readonly cause: unknown;
  readonly message: string;
}> {}

function readFailure(operation: keyof SchedulerReadClient, cause: unknown): SchedulerReadError {
  const statusCode = cause instanceof CloudflareApiError ? cause.statusCode : undefined;
  return new SchedulerReadError({
    operation, kind: statusCode === undefined ? 'transport' : 'http', statusCode, cause,
    message: `Scheduler ${operation} request failed.`
  });
}

function decode<A>(operation: keyof SchedulerReadClient, parse: () => A) {
  return Effect.try({
    try: parse,
    catch: (cause) => new SchedulerReadError({
      operation, kind: 'decode', cause, message: `Scheduler ${operation} response is invalid.`
    })
  });
}

// Preserve domain error identity at the public Promise boundary, not FiberFailure.
async function runRead<A, E>(effect: Effect.Effect<A, E>): Promise<A> {
  const result = await Effect.runPromise(Effect.either(effect));
  if (Either.isLeft(result)) throw result.left;
  return result.right;
}

/** No automatic retries: callers must treat this as unavailable, never as empty availability. */
export class AvailabilityUnavailableError extends Error {
  readonly _tag = 'AvailabilityUnavailableError';
  readonly statusCode = 503;
  constructor(readonly body: RetryableAvailability, cause?: unknown) {
    super('Scheduler availability is temporarily unavailable.', { cause });
    this.name = 'AvailabilityUnavailableError';
  }
}

const linkPath = '/api/v1/links/createsomething/together';
const availabilityPath = '/api/v1/availability';
const queryKeys = new Set(['from', 'to', 'timezone', 'durationMinutes']);

/**
 * The generated SDK is deliberately private. Never forward caller options to it.
 * Its snapshot is still the patched pilot; see README.md and generator-lock.json.
 */
export function createSchedulerReadClient(options: SchedulerReadOptions = {}): SchedulerReadClient {
  const parsed = optionsSchema.parse(options);
  const base = new URL(parsed.baseUrl ?? 'https://schedule.createsomething.agency');
  const loopback = ['127.0.0.1', '[::1]', 'localhost'].includes(base.hostname);
  if ((base.protocol !== 'https:' && !(base.protocol === 'http:' && loopback)) ||
      base.username || base.password || base.pathname !== '/' || base.search || base.hash) {
    throw new TypeError('baseUrl must be a credential-free HTTPS origin (HTTP only for loopback tests).');
  }
  const fetchImpl = globalThis.fetch.bind(globalThis);
  const readFetch: typeof fetch = async (input, init) => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    if (request.method !== 'GET' || url.origin !== base.origin ||
        ![linkPath, availabilityPath].includes(url.pathname) || url.username || url.password ||
        request.headers.has('authorization') || request.headers.has('cookie') ||
        [...url.searchParams.keys()].some((key) => url.pathname === linkPath || !queryKeys.has(key))) {
      throw new TypeError('Scheduler public client rejected a request outside its read boundary.');
    }
    // A fresh Request removes generated/custom headers and browser ambient credentials.
    // Redirects cannot take the request to a protected or credential-bearing path.
    return fetchImpl(new Request(url, {
      method: 'GET', headers: { accept: 'application/json' },
      credentials: 'omit', redirect: 'error', signal: request.signal
    }));
  };
  const generated = new CloudflareApiClient({
    baseUrl: base.origin, fetch: readFetch, maxRetries: 0, timeoutInSeconds: 15
  });
  return Object.freeze({
    async getLink(): Promise<Link> {
      return runRead(Effect.tryPromise({
        try: () => generated.getLink(),
        catch: (cause) => readFailure('getLink', cause)
      }).pipe(Effect.flatMap((body) => decode('getLink', () => linkSchema.parse(body)))));
    },
    async listAvailability(query: AvailabilityQuery): Promise<Availability> {
      const input = querySchema.parse(query);
      const request = Effect.tryPromise({
        try: () => generated.listAvailability(input),
        catch: (cause) => readFailure('listAvailability', cause)
      });
      return runRead(request.pipe(
        Effect.flatMap((response) => decode('listAvailability', (): Availability => {
          const body = availabilitySchema.parse(response);
          if (body.status !== 'available') throw new TypeError('Expected available status for HTTP success.');
          return { ...body, status: 'available' };
        })),
        Effect.catchTag('SchedulerReadError', (error) => {
          if (error.kind !== 'http' || error.statusCode !== 503 || !(error.cause instanceof CloudflareApiError)) {
            return Effect.fail(error);
          }
          const original = error.cause;
          return decode('listAvailability', (): RetryableAvailability => {
            const body = availabilitySchema.parse(original.body);
            if (body.status !== 'retryable' || body.slots.length !== 0) {
              throw new TypeError('Expected retryable availability with no slots for HTTP 503.');
            }
            return { ...body, status: 'retryable' };
          }).pipe(Effect.flatMap((body) => Effect.fail(new AvailabilityUnavailableError(body, original))));
        })
      ));
    }
  });
}
