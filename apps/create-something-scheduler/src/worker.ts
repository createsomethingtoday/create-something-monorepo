import { DurableObject } from 'cloudflare:workers';
import { Temporal } from '@js-temporal/polyfill';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { z } from 'zod';
import {
  BookingService,
  type AvailabilityInput,
  type CancelBookingInput,
  type CommitBookingInput,
  type PrepareBookingInput,
  type RescheduleBookingInput,
  type UpsertAvailabilityOverrideInput
} from './application/booking-service.js';
import {
  RoomService,
  type CreateRoomInput
} from './application/room-service.js';
import {
  HmacActionTokenSigner,
  HmacProposalSigner,
  HmacRoomCapabilitySigner
} from './auth/action-tokens.js';
import { DurableOAuthStore } from './auth/durable-oauth-store.js';
import { GoogleOAuthClient } from './auth/google-oauth.js';
import { handleApiRequest, type ApiScope } from './http/api.js';
import { schedulerOpenApi } from './http/openapi.js';
import { createSchedulerMcpServer } from './mcp/server.js';
import { GoogleCalendarPort } from './providers/google-calendar.js';
import {
  ProjectedConflictCalendarPort,
  type BusyProjection
} from './providers/projected-calendar.js';
import { ResendNotificationPort } from './providers/resend.js';
import {
  bookingActionExpiresAt,
  buildBookingManageUrl
} from './notifications/manage-link.js';
import { RealtimeKitProvider } from './providers/realtimekit.js';
import { DurableObjectBookingStore } from './storage/durable-booking-store.js';
import { DurableAvailabilityOverrideStore } from './storage/durable-availability-overrides.js';
import { DurableBusyProjectionStore } from './storage/durable-busy-projection.js';
import { DurableRoomStore } from './storage/durable-room-store.js';
import { schedulerPage } from './ui/page.js';
import { roomPage } from './ui/room-page.js';

export interface Env {
  SCHEDULER: DurableObjectNamespace<SchedulerDurableObject>;
  ASSETS?: Fetcher;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_REDIRECT_URI?: string;
  GOOGLE_EVENT_CALENDAR_ID?: string;
  GOOGLE_SELECTED_CALENDAR_IDS?: string;
  WEBFLOW_BUSY_PROJECTION_REQUIRED?: string;
  OAUTH_ENCRYPTION_SECRET?: string;
  PROPOSAL_SIGNING_SECRET?: string;
  ACTION_SIGNING_SECRET?: string;
  OPERATOR_API_TOKEN?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM?: string;
  TURNSTILE_SECRET_KEY?: string;
  TURNSTILE_SITE_KEY?: string;
  TURNSTILE_EXPECTED_HOSTNAME?: string;
  ALLOWED_ORIGINS?: string;
  REALTIMEKIT_API_TOKEN?: string;
  REALTIMEKIT_APP_ID?: string;
  REALTIMEKIT_HOST_PRESET_ID?: string;
  REALTIMEKIT_GUEST_PRESET_ID?: string;
  ROOM_CAPABILITY_SIGNING_SECRET?: string;
  SCHEDULER_PUBLIC_ORIGIN?: string;
  CONFERENCING_PROVIDER?: 'google_meet' | 'first_party';
}

type CalendarConfiguration = {
  selectedCalendarIds: string[];
  eventCalendarId: string;
};

type RuntimeService = Pick<
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
> & Pick<
  RoomService,
  'createRoom' | 'issueJoinCredential' | 'getRoom' | 'endRoom'
>;

const HOST_OBJECT_NAME = 'micah-johnson';
const eventCalendarDefault = 'micah@createsomething.io';
const accountId = '9645bd52e640b8a4f40a3a55ff1dd75a';
const publicOriginDefault = 'https://create-something-scheduler.createsomething.workers.dev';
const bookingPublicOrigin = 'https://createsomething.agency';
const clock = { now: () => new Date().toISOString() };
const projectionReadinessHorizonDays = 28;
const maximumProjectionTtlMinutes = 90;
const maximumProjectionClockSkewMinutes = 5;

const busyProjectionInputSchema = z.object({
  source: z.literal('webflow-google-calendar'),
  rangeStart: z.string().datetime({ offset: true }),
  rangeEnd: z.string().datetime({ offset: true }),
  observedAt: z.string().datetime({ offset: true }),
  expiresAt: z.string().datetime({ offset: true }),
  intervals: z.array(z.object({
    start: z.string().datetime({ offset: true }),
    end: z.string().datetime({ offset: true })
  }).strict()).max(2_000),
  explicitIntent: z.boolean()
}).strict();

export class SchedulerDurableObject extends DurableObject<Env> {
  private bookingService(): BookingService {
    const oauthStore = new DurableOAuthStore(
      this.ctx,
      required(this.env.OAUTH_ENCRYPTION_SECRET, 'OAUTH_ENCRYPTION_SECRET')
    );
    const oauth = new GoogleOAuthClient({
      clientId: required(this.env.GOOGLE_CLIENT_ID, 'GOOGLE_CLIENT_ID'),
      clientSecret: required(this.env.GOOGLE_CLIENT_SECRET, 'GOOGLE_CLIENT_SECRET'),
      redirectUri: required(this.env.GOOGLE_REDIRECT_URI, 'GOOGLE_REDIRECT_URI'),
      clock,
      states: oauthStore,
      credentials: oauthStore
    });
    const configured = this.calendarConfiguration();
    const primaryCalendar = new GoogleCalendarPort({
      selectedCalendarIds: configured.selectedCalendarIds,
      eventCalendarId: configured.eventCalendarId,
      accessTokens: oauth
    });
    const calendar = new ProjectedConflictCalendarPort({
      primary: primaryCalendar,
      projection: new DurableBusyProjectionStore(this.ctx),
      clock
    });
    const bookingStore = new DurableObjectBookingStore(this.ctx);
    const conferencing = this.env.CONFERENCING_PROVIDER === 'first_party'
      ? {
          createRoom: async (input: {
            bookingId: string;
            title: string;
            idempotencyKey: string;
          }) => {
            const result = await this.roomService().createRoom({
              ...input,
              explicitIntent: true
            });
            if (result.status !== 'ready' || !result.invites) {
              return {
                status: 'retryable' as const,
                reason: result.status === 'retryable'
                  ? result.reason
                  : 'room_creation_unavailable'
              };
            }
            return {
              status: 'ready' as const,
              roomId: result.room.roomId,
              joinUrl: result.invites.guestUrl
            };
          }
        }
      : undefined;
    return new BookingService({
      calendar,
      clock,
      proposalSigner: new HmacProposalSigner(
        required(this.env.PROPOSAL_SIGNING_SECRET, 'PROPOSAL_SIGNING_SECRET')
      ),
      bookingStore,
      availabilityOverrides: new DurableAvailabilityOverrideStore(this.ctx),
      ...(conferencing ? { conferencing } : {})
    });
  }

  private roomService(): RoomService {
    return new RoomService({
      clock,
      publicOrigin: this.env.SCHEDULER_PUBLIC_ORIGIN ?? publicOriginDefault,
      capabilities: new HmacRoomCapabilitySigner(
        required(this.env.ROOM_CAPABILITY_SIGNING_SECRET, 'ROOM_CAPABILITY_SIGNING_SECRET')
      ),
      nonce: () => crypto.randomUUID(),
      store: new DurableRoomStore(this.ctx),
      provider: new RealtimeKitProvider({
        accountId,
        appId: required(this.env.REALTIMEKIT_APP_ID, 'REALTIMEKIT_APP_ID'),
        apiToken: required(this.env.REALTIMEKIT_API_TOKEN, 'REALTIMEKIT_API_TOKEN'),
        hostPresetName: 'create_something_host',
        guestPresetName: 'create_something_guest'
      })
    });
  }

  createRoom(input: CreateRoomInput) {
    return this.roomService().createRoom(input);
  }

  issueJoinCredential(input: { roomId: string; capability: string; displayName: string }) {
    return this.roomService().issueJoinCredential(input);
  }

  getRoom(input: { roomId: string }) {
    return this.roomService().getRoom(input);
  }

  endRoom(input: { roomId: string; idempotencyKey: string; explicitIntent: boolean; capability?: string }) {
    return this.roomService().endRoom(input);
  }

  getLink() {
    return linkService(this.env.CONFERENCING_PROVIDER === 'first_party').getLink();
  }

  listAvailability(input: AvailabilityInput) {
    return this.bookingService().listAvailability(input);
  }

  prepareBooking(input: PrepareBookingInput) {
    return this.bookingService().prepareBooking(input);
  }

  commitBooking(input: CommitBookingInput) {
    return this.bookingService().commitBooking(input);
  }

  getBooking(bookingId: string) {
    return this.bookingService().getBooking(bookingId);
  }

  getReceipt(receiptId: string) {
    return this.bookingService().getReceipt(receiptId);
  }

  rescheduleBooking(input: RescheduleBookingInput) {
    return this.bookingService().rescheduleBooking(input);
  }

  cancelBooking(input: CancelBookingInput) {
    return this.bookingService().cancelBooking(input);
  }

  listAvailabilityOverrides() {
    return this.bookingService().listAvailabilityOverrides();
  }

  upsertAvailabilityOverride(input: UpsertAvailabilityOverrideInput) {
    return this.bookingService().upsertAvailabilityOverride(input);
  }

  deleteAvailabilityOverride(input: { overrideId: string; explicitIntent: boolean }) {
    return this.bookingService().deleteAvailabilityOverride(input);
  }

  async upsertWebflowBusyProjection(input: unknown) {
    const parsed = busyProjectionInputSchema.safeParse(input);
    if (!parsed.success) {
      return { status: 'rejected' as const, reason: 'webflow_projection_input_invalid' };
    }
    if (!parsed.data.explicitIntent) {
      return { status: 'operator_required' as const, reason: 'explicit_intent_required' };
    }

    const rangeStart = Temporal.Instant.from(parsed.data.rangeStart);
    const rangeEnd = Temporal.Instant.from(parsed.data.rangeEnd);
    const observedAt = Temporal.Instant.from(parsed.data.observedAt);
    const expiresAt = Temporal.Instant.from(parsed.data.expiresAt);
    const now = Temporal.Instant.from(clock.now());
    if (
      Temporal.Instant.compare(rangeStart, rangeEnd) >= 0 ||
      Temporal.Instant.compare(observedAt, expiresAt) >= 0 ||
      Temporal.Instant.compare(
        observedAt,
        now.add({ minutes: maximumProjectionClockSkewMinutes })
      ) > 0 ||
      Temporal.Instant.compare(
        expiresAt,
        now.add({ minutes: maximumProjectionTtlMinutes + maximumProjectionClockSkewMinutes })
      ) > 0 ||
      Temporal.Instant.compare(
        expiresAt,
        observedAt.add({ minutes: maximumProjectionTtlMinutes })
      ) > 0 ||
      parsed.data.intervals.some((interval) => {
        const start = Temporal.Instant.from(interval.start);
        const end = Temporal.Instant.from(interval.end);
        return Temporal.Instant.compare(start, end) >= 0 ||
          Temporal.Instant.compare(start, rangeStart) < 0 ||
          Temporal.Instant.compare(end, rangeEnd) > 0;
      })
    ) {
      return { status: 'rejected' as const, reason: 'webflow_projection_window_invalid' };
    }

    const projection: BusyProjection = {
      source: parsed.data.source,
      rangeStart: rangeStart.toString(),
      rangeEnd: rangeEnd.toString(),
      observedAt: observedAt.toString(),
      expiresAt: expiresAt.toString(),
      intervals: parsed.data.intervals
        .map((interval) => ({
          start: Temporal.Instant.from(interval.start).toString(),
          end: Temporal.Instant.from(interval.end).toString()
        }))
        .sort((left, right) => left.start.localeCompare(right.start))
    };
    await new DurableBusyProjectionStore(this.ctx).write(projection);
    return {
      status: 'accepted' as const,
      receiptId: `projection_${crypto.randomUUID().replaceAll('-', '')}`,
      source: projection.source,
      intervalCount: projection.intervals.length,
      rangeStart: projection.rangeStart,
      rangeEnd: projection.rangeEnd,
      observedAt: projection.observedAt,
      expiresAt: projection.expiresAt
    };
  }

  async createGoogleAuthorizationRequest() {
    return this.oauthClient().createAuthorizationRequest();
  }

  async exchangeGoogleAuthorizationCode(input: { code: string; state: string }) {
    const result = await this.oauthClient().exchangeAuthorizationCode(input);
    if (result.status !== 'connected') return result;
    const calendars = await this.discoverAndPersistCalendars();
    if (calendars.status !== 'available') {
      return { status: 'retryable' as const, reason: calendars.reason };
    }
    return {
      ...result,
      selectedCalendarCount: calendars.selectedCalendarIds.length,
      eventCalendarId: calendars.eventCalendarId
    };
  }

  async discoverAndPersistCalendars() {
    const configured = this.calendarConfiguration();
    const port = new GoogleCalendarPort({
      selectedCalendarIds: [],
      eventCalendarId: configured.eventCalendarId,
      accessTokens: this.oauthClient()
    });
    const result = await port.discoverCalendars();
    if (result.status === 'available') {
      this.ctx.storage.kv.put('google:calendar-configuration', {
        selectedCalendarIds: result.selectedCalendarIds,
        eventCalendarId: result.eventCalendarId
      } satisfies CalendarConfiguration);
    }
    return result;
  }

  async alarm(): Promise<void> {
    const store = new DurableObjectBookingStore(this.ctx);
    const actionSigner = new HmacActionTokenSigner(
      required(this.env.ACTION_SIGNING_SECRET, 'ACTION_SIGNING_SECRET')
    );
    const resend = new ResendNotificationPort({
      apiKey: required(this.env.RESEND_API_KEY, 'RESEND_API_KEY'),
      ...(this.env.RESEND_FROM ? { from: this.env.RESEND_FROM } : {})
    });
    await store.processDueNotifications(
      clock.now(),
      async (job) => {
        const booking = await store.getBooking(job.bookingId);
        if (!booking || booking.status === 'cancelled') {
          throw new Error('resend_failed:booking_unavailable');
        }
        if (booking.slot.start !== job.slotStart) {
          throw new Error('resend_failed:notification_stale');
        }
        const actionToken = await actionSigner.issue({
          bookingId: booking.bookingId,
          expiresAt: bookingActionExpiresAt(booking.slot)
        });
        const manageUrl = buildBookingManageUrl({
          publicOrigin: bookingPublicOrigin,
          bookingId: booking.bookingId,
          actionToken,
          ...(booking.context?.intent ? { intent: booking.context.intent } : {})
        });
        return resend.sendNotification(job, { booking, manageUrl });
      }
    );
  }

  consumeRateLimit(input: {
    bucket: string;
    subjectHash: string;
    limit: number;
    windowMilliseconds: number;
    now: number;
  }): boolean {
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS rate_limits (
        bucket TEXT NOT NULL,
        subject_hash TEXT NOT NULL,
        window_start INTEGER NOT NULL,
        request_count INTEGER NOT NULL,
        PRIMARY KEY(bucket, subject_hash, window_start)
      );
    `);
    const windowStart = Math.floor(input.now / input.windowMilliseconds)
      * input.windowMilliseconds;
    let allowed = false;
    this.ctx.storage.transactionSync(() => {
      this.ctx.storage.sql.exec(
        `INSERT INTO rate_limits(bucket, subject_hash, window_start, request_count)
         VALUES (?, ?, ?, 0)
         ON CONFLICT(bucket, subject_hash, window_start) DO NOTHING`,
        input.bucket,
        input.subjectHash,
        windowStart
      );
      const row = this.ctx.storage.sql.exec<{ request_count: number }>(
        `SELECT request_count FROM rate_limits
          WHERE bucket = ? AND subject_hash = ? AND window_start = ?`,
        input.bucket,
        input.subjectHash,
        windowStart
      ).toArray()[0];
      allowed = Boolean(row && row.request_count < input.limit);
      if (allowed) {
        this.ctx.storage.sql.exec(
          `UPDATE rate_limits SET request_count = request_count + 1
            WHERE bucket = ? AND subject_hash = ? AND window_start = ?`,
          input.bucket,
          input.subjectHash,
          windowStart
        );
      }
      this.ctx.storage.sql.exec(
        'DELETE FROM rate_limits WHERE window_start < ?',
        windowStart - input.windowMilliseconds
      );
    });
    return allowed;
  }

  async getRuntimeStatus() {
    const configuration = {
      googleOAuth: Boolean(
        this.env.GOOGLE_CLIENT_ID &&
        this.env.GOOGLE_CLIENT_SECRET &&
        this.env.GOOGLE_REDIRECT_URI
      ),
      webflowBusyProjection: this.env.WEBFLOW_BUSY_PROJECTION_REQUIRED === 'true',
      credentialEncryption: Boolean(this.env.OAUTH_ENCRYPTION_SECRET),
      proposalSigning: Boolean(this.env.PROPOSAL_SIGNING_SECRET),
      actionSigning: Boolean(this.env.ACTION_SIGNING_SECRET),
      operatorAuth: Boolean(this.env.OPERATOR_API_TOKEN),
      reminders: Boolean(this.env.RESEND_API_KEY && this.env.RESEND_FROM),
      browserProof: Boolean(
        this.env.TURNSTILE_SECRET_KEY &&
        this.env.TURNSTILE_SITE_KEY &&
        this.env.TURNSTILE_EXPECTED_HOSTNAME
      ),
      realtimeKit: Boolean(this.env.REALTIMEKIT_API_TOKEN && this.env.REALTIMEKIT_APP_ID),
      roomCapabilitySigning: Boolean(this.env.ROOM_CAPABILITY_SIGNING_SECRET)
    };
    let oauthConnected = false;
    if (this.env.OAUTH_ENCRYPTION_SECRET) {
      try {
        oauthConnected = Boolean(
          await new DurableOAuthStore(this.ctx, this.env.OAUTH_ENCRYPTION_SECRET).read()
        );
      } catch {
        oauthConnected = false;
      }
    }
    const discovered = this.ctx.storage.kv.get<CalendarConfiguration>(
      'google:calendar-configuration'
    );
    const eventCalendarId = this.env.GOOGLE_EVENT_CALENDAR_ID ?? eventCalendarDefault;
    const calendarDiscovered = Boolean(
      discovered &&
      discovered.eventCalendarId &&
      discovered.selectedCalendarIds.length > 0
    );
    const projection = await new DurableBusyProjectionStore(this.ctx).read();
    const now = Temporal.Instant.from(clock.now());
    const projectionFresh = Boolean(
      projection && Temporal.Instant.compare(Temporal.Instant.from(projection.expiresAt), now) > 0
    );
    const projectionHorizonCovered = Boolean(
      projection &&
      Temporal.Instant.compare(Temporal.Instant.from(projection.rangeStart), now) <= 0 &&
      Temporal.Instant.compare(
        Temporal.Instant.from(projection.rangeEnd),
        now.add({ hours: projectionReadinessHorizonDays * 24 })
      ) >= 0
    );
    const configured = Object.values(configuration).every(Boolean);
    return {
      ready: configured && oauthConnected && calendarDiscovered &&
        projectionFresh && projectionHorizonCovered,
      configuration,
      oauthConnected,
      calendarDiscovered,
      webflowProjectionFresh: projectionFresh,
      webflowProjectionHorizonCovered: projectionHorizonCovered,
      webflowProjectionObservedAt: projection?.observedAt ?? null,
      webflowProjectionExpiresAt: projection?.expiresAt ?? null,
      webflowProjectionRangeEnd: projection?.rangeEnd ?? null,
      selectedCalendarCount: discovered?.selectedCalendarIds.length ?? 0,
      eventCalendarId: discovered?.eventCalendarId ?? null,
      conferencingProvider: this.env.CONFERENCING_PROVIDER ?? 'google_meet'
    };
  }

  private oauthClient(): GoogleOAuthClient {
    const store = new DurableOAuthStore(
      this.ctx,
      required(this.env.OAUTH_ENCRYPTION_SECRET, 'OAUTH_ENCRYPTION_SECRET')
    );
    return new GoogleOAuthClient({
      clientId: required(this.env.GOOGLE_CLIENT_ID, 'GOOGLE_CLIENT_ID'),
      clientSecret: required(this.env.GOOGLE_CLIENT_SECRET, 'GOOGLE_CLIENT_SECRET'),
      redirectUri: required(this.env.GOOGLE_REDIRECT_URI, 'GOOGLE_REDIRECT_URI'),
      clock,
      states: store,
      credentials: store
    });
  }

  private calendarConfiguration(): CalendarConfiguration {
    const eventCalendarId = this.env.GOOGLE_EVENT_CALENDAR_ID ?? eventCalendarDefault;
    const discovered = this.ctx.storage.kv.get<CalendarConfiguration>(
      'google:calendar-configuration'
    );
    const selectedCalendarIds = discovered?.selectedCalendarIds ?? (
      this.env.GOOGLE_SELECTED_CALENDAR_IDS
        ?.split(',').map((value) => value.trim()).filter(Boolean) ?? [eventCalendarId]
    );
    return { selectedCalendarIds, eventCalendarId };
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === 'GET' && url.pathname === '/health') {
      return json({ ok: true, service: 'create-something-scheduler' }, 200);
    }
    if (request.method === 'GET' && url.pathname === '/openapi.json') {
      return json(schedulerOpenApi, 200);
    }
    if (
      request.method === 'GET' &&
      (url.pathname === '/' || url.pathname === '/createsomething/together')
    ) {
      const nonce = crypto.randomUUID().replaceAll('-', '');
      return new Response(schedulerPage({
        nonce,
        intent: url.searchParams.get('intent'),
        ...(env.TURNSTILE_SITE_KEY ? { turnstileSiteKey: env.TURNSTILE_SITE_KEY } : {})
      }), {
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'cache-control': 'no-store',
          'content-security-policy': [
            "default-src 'self'",
            `script-src 'self' 'nonce-${nonce}' https://challenges.cloudflare.com`,
            `style-src 'self' 'nonce-${nonce}' https://api.fontshare.com https://cdn.jsdelivr.net`,
            "connect-src 'self' https://challenges.cloudflare.com",
            'frame-src https://challenges.cloudflare.com',
            "img-src 'self' data:",
            "font-src 'self' data: https://cdn.fontshare.com https://cdn.jsdelivr.net",
            "base-uri 'none'",
            "form-action 'self'",
            'frame-ancestors https://createsomething.agency'
          ].join('; '),
          'referrer-policy': 'no-referrer',
          'x-content-type-options': 'nosniff'
        }
      });
    }
    const roomPageMatch = url.pathname.match(/^\/rooms\/([^/]+)$/);
    if (request.method === 'GET' && roomPageMatch) {
      const nonce = crypto.randomUUID().replaceAll('-', '');
      return new Response(roomPage({
        roomId: decodeURIComponent(roomPageMatch[1] ?? ''),
        nonce
      }), {
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'cache-control': 'no-store',
          'content-security-policy': [
            "default-src 'self'",
            "script-src 'self' 'wasm-unsafe-eval'",
            `style-src 'self' 'nonce-${nonce}' https://api.fontshare.com https://cdn.jsdelivr.net`,
            "connect-src 'self' https://*.realtime.cloudflare.com wss://*.realtime.cloudflare.com https://*.dyte.in wss://*.dyte.in https://*.dyte.io wss://*.dyte.io https://assets.dyte.io https://dyte-plugins.s3.ap-south-1.amazonaws.com https://turn.cloudflare.com https://stun.cloudflare.com",
            "media-src 'self' blob: https://*.realtime.cloudflare.com https://*.dyte.in",
            "worker-src 'self' blob:",
            "img-src 'self' data: blob: https://*.realtime.cloudflare.com https://assets.dyte.io",
            "font-src 'self' data: https://cdn.fontshare.com https://cdn.jsdelivr.net",
            "base-uri 'none'",
            "form-action 'self'",
            "frame-ancestors 'none'"
          ].join('; '),
          'permissions-policy': 'camera=(self), microphone=(self), display-capture=(self)',
          'referrer-policy': 'no-referrer',
          'x-content-type-options': 'nosniff'
        }
      });
    }

    if (request.method === 'GET' && url.pathname.startsWith('/assets/') && env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    const stub = env.SCHEDULER.getByName(HOST_OBJECT_NAME);
    if (request.method === 'GET' && url.pathname === '/ready') {
      const status = await stub.getRuntimeStatus();
      return json({
        ready: status.ready,
        service: 'create-something-scheduler'
      }, status.ready ? 200 : 503);
    }
    if (request.method === 'GET' && url.pathname === '/api/v1/operator/status') {
      if (!isOperator(request, env)) return unauthorized('operator_scope_required');
      return json(await stub.getRuntimeStatus(), 200);
    }
    if (request.method === 'POST' && url.pathname === '/api/v1/operator/calendars/discover') {
      if (!isOperator(request, env)) return unauthorized('operator_scope_required');
      const result = await stub.discoverAndPersistCalendars();
      return json(result, result.status === 'available' ? 200 : 503);
    }
    if (
      request.method === 'PUT' &&
      url.pathname === '/api/v1/operator/conflict-projections/webflow-google-calendar'
    ) {
      if (!isOperator(request, env)) return unauthorized('operator_scope_required');
      try {
        const result = await stub.upsertWebflowBusyProjection(await request.json());
        return json(
          result,
          result.status === 'accepted'
            ? 200
            : result.status === 'operator_required'
              ? 428
              : 400
        );
      } catch {
        return json({ status: 'rejected', reason: 'webflow_projection_input_invalid' }, 400);
      }
    }
    if (url.pathname === '/api/v1/operator/availability-overrides') {
      if (!isOperator(request, env)) return unauthorized('operator_scope_required');
      try {
        if (request.method === 'GET') {
          return json(await stub.listAvailabilityOverrides(), 200);
        }
        if (request.method === 'POST') {
          const input = await request.json() as UpsertAvailabilityOverrideInput;
          const result = await stub.upsertAvailabilityOverride(input);
          return json(result, overrideMutationStatus(result.status));
        }
      } catch {
        return json({ status: 'rejected', reason: 'availability_override_input_invalid' }, 400);
      }
    }
    const availabilityOverrideMatch = url.pathname.match(
      /^\/api\/v1\/operator\/availability-overrides\/([^/]+)$/
    );
    if (availabilityOverrideMatch && request.method === 'DELETE') {
      if (!isOperator(request, env)) return unauthorized('operator_scope_required');
      try {
        const input = await request.json() as { explicitIntent?: boolean };
        const result = await stub.deleteAvailabilityOverride({
          overrideId: decodeURIComponent(availabilityOverrideMatch[1]!),
          explicitIntent: input.explicitIntent === true
        });
        return json(result, overrideMutationStatus(result.status));
      } catch {
        return json({ status: 'rejected', reason: 'availability_override_input_invalid' }, 400);
      }
    }
    if (url.pathname === '/oauth/google/start') {
      if (!isOperator(request, env)) return unauthorized('operator_scope_required');
      try {
        const authorization = await stub.createGoogleAuthorizationRequest();
        return Response.redirect(authorization.url, 302);
      } catch {
        return configurationUnavailable();
      }
    }
    if (url.pathname === '/oauth/google/callback') {
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      if (!code || !state) return json({ status: 'rejected', reason: 'oauth_callback_invalid' }, 400);
      try {
        const result = await stub.exchangeGoogleAuthorizationCode({ code, state });
        return json(result, result.status === 'connected' ? 200 : result.status === 'retryable' ? 503 : 400);
      } catch {
        return configurationUnavailable();
      }
    }

    if (url.pathname === '/mcp') {
      if (!originAllowed(request, env)) return unauthorized('origin_not_allowed');
      const scope = isOperator(request, env) ? { role: 'operator' as const } : { role: 'public' as const };
      if (
        scope.role === 'public' &&
        !await allowRequest(stub, request, env, 'mcp-public', 120)
      ) return rateLimited();
      const service = serviceProxy(stub);
      const server = createSchedulerMcpServer(service, scope);
      const transport = new WebStandardStreamableHTTPServerTransport({
        enableJsonResponse: true
      });
      await server.connect(transport);
      return transport.handleRequest(request, scope.role === 'operator' ? {
        authInfo: { token: 'operator', clientId: 'operator', scopes: ['scheduler:write'] }
      } : {});
    }

    if (url.pathname.startsWith('/api/v1/')) {
      const roomApi = url.pathname.startsWith('/api/v1/rooms');
      if (url.pathname !== '/api/v1/links/createsomething/together') {
        if (roomApi ? !roomRuntimeConfigured(env) : !serviceRuntimeConfigured(env)) {
          return configurationUnavailable();
        }
      }
      const scope = await resolveApiScope(request, env);
      if (
        request.method === 'POST' &&
        url.pathname === '/api/v1/bookings' &&
        scope.role === 'browser' &&
        !env.ACTION_SIGNING_SECRET
      ) return configurationUnavailable();
      const ratePolicy = apiRatePolicy(url.pathname, request.method, scope);
      if (
        ratePolicy &&
        !await allowRequest(stub, request, env, ratePolicy.bucket, ratePolicy.limit)
      ) return rateLimited();
      const service = serviceProxy(stub);
      try {
        return await handleApiRequest(request, service, scope, env.ACTION_SIGNING_SECRET ? {
          issueActionToken: async (booking) => new HmacActionTokenSigner(env.ACTION_SIGNING_SECRET!).issue({
                bookingId: booking.bookingId,
                expiresAt: bookingActionExpiresAt(booking.slot)
              })
        } : {});
      } catch {
        return configurationUnavailable();
      }
    }

    return json({ status: 'rejected', error: { code: 'not_found', message: 'Route not found.' } }, 404);
  }
} satisfies ExportedHandler<Env>;

function linkService(firstParty = false): BookingService {
  return new BookingService({
    clock,
    calendar: {
      async listBusyIntervals() {
        return { status: 'unavailable', reason: 'provider_not_requested' };
      },
      async createEvent() {
        throw new Error('provider_not_requested');
      }
    },
    ...(firstParty ? {
      conferencing: {
        async createRoom() {
          return { status: 'retryable' as const, reason: 'provider_not_requested' };
        }
      }
    } : {})
  });
}

function serviceProxy(stub: DurableObjectStub<SchedulerDurableObject>): RuntimeService {
  return {
    getLink: () => stub.getLink() as unknown as ReturnType<BookingService['getLink']>,
    listAvailability: (input) => stub.listAvailability(input) as unknown as ReturnType<BookingService['listAvailability']>,
    prepareBooking: (input) => stub.prepareBooking(input) as unknown as ReturnType<BookingService['prepareBooking']>,
    commitBooking: (input) => stub.commitBooking(input) as unknown as ReturnType<BookingService['commitBooking']>,
    getBooking: (bookingId) => stub.getBooking(bookingId) as unknown as ReturnType<BookingService['getBooking']>,
    getReceipt: (receiptId) => stub.getReceipt(receiptId) as unknown as ReturnType<BookingService['getReceipt']>,
    rescheduleBooking: (input) => stub.rescheduleBooking(input) as unknown as ReturnType<BookingService['rescheduleBooking']>,
    cancelBooking: (input) => stub.cancelBooking(input) as unknown as ReturnType<BookingService['cancelBooking']>,
    listAvailabilityOverrides: () => stub.listAvailabilityOverrides() as unknown as ReturnType<BookingService['listAvailabilityOverrides']>,
    upsertAvailabilityOverride: (input) => stub.upsertAvailabilityOverride(input) as unknown as ReturnType<BookingService['upsertAvailabilityOverride']>,
    deleteAvailabilityOverride: (input) => stub.deleteAvailabilityOverride(input) as unknown as ReturnType<BookingService['deleteAvailabilityOverride']>,
    createRoom: (input) => stub.createRoom(input) as unknown as ReturnType<RoomService['createRoom']>,
    issueJoinCredential: (input) => stub.issueJoinCredential(input) as unknown as ReturnType<RoomService['issueJoinCredential']>,
    getRoom: (input) => stub.getRoom(input) as unknown as ReturnType<RoomService['getRoom']>,
    endRoom: (input) => stub.endRoom(input) as unknown as ReturnType<RoomService['endRoom']>
  };
}

async function resolveApiScope(request: Request, env: Env): Promise<ApiScope> {
  if (isOperator(request, env)) return { role: 'operator' };
  const actionToken = request.headers.get('x-booking-action-token');
  if (actionToken && env.ACTION_SIGNING_SECRET) {
    const scope = await new HmacActionTokenSigner(env.ACTION_SIGNING_SECRET)
      .verify(actionToken, clock.now());
    if (scope) return scope;
  }
  const browserProof = request.headers.get('x-browser-proof');
  if (browserProof && await verifyTurnstile(browserProof, request, env)) return { role: 'browser' };
  return { role: 'public' };
}

async function verifyTurnstile(token: string, request: Request, env: Env): Promise<boolean> {
  if (!env.TURNSTILE_SECRET_KEY) return false;
  try {
    const body = new FormData();
    body.set('secret', env.TURNSTILE_SECRET_KEY);
    body.set('response', token);
    const remoteIp = request.headers.get('cf-connecting-ip');
    if (remoteIp) body.set('remoteip', remoteIp);
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body
    });
    const result = await response.json() as { success?: boolean; hostname?: string };
    return response.ok && result.success === true && (
      !env.TURNSTILE_EXPECTED_HOSTNAME ||
      result.hostname === env.TURNSTILE_EXPECTED_HOSTNAME
    );
  } catch {
    return false;
  }
}

function isOperator(request: Request, env: Env): boolean {
  return Boolean(
    env.OPERATOR_API_TOKEN &&
    request.headers.get('authorization') === `Bearer ${env.OPERATOR_API_TOKEN}`
  );
}

function originAllowed(request: Request, env: Env): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  if (origin === new URL(request.url).origin) return true;
  return (env.ALLOWED_ORIGINS ?? '').split(',').map((value) => value.trim()).includes(origin);
}

function required(value: string | undefined, name: string): string {
  if (!value) throw new Error(`runtime_configuration_missing:${name}`);
  return value;
}

function serviceRuntimeConfigured(env: Env): boolean {
  return Boolean(
    env.GOOGLE_CLIENT_ID &&
    env.GOOGLE_CLIENT_SECRET &&
    env.GOOGLE_REDIRECT_URI &&
    env.WEBFLOW_BUSY_PROJECTION_REQUIRED === 'true' &&
    env.OAUTH_ENCRYPTION_SECRET &&
    env.PROPOSAL_SIGNING_SECRET
  );
}

function roomRuntimeConfigured(env: Env): boolean {
  return Boolean(
    env.REALTIMEKIT_API_TOKEN &&
    env.REALTIMEKIT_APP_ID &&
    env.ROOM_CAPABILITY_SIGNING_SECRET
  );
}

function overrideMutationStatus(status: string): number {
  if (status === 'applied' || status === 'deleted') return 200;
  if (status === 'operator_required') return 428;
  return 409;
}

function apiRatePolicy(
  pathname: string,
  method: string,
  scope: ApiScope
): { bucket: string; limit: number } | null {
  if (scope.role === 'operator' || scope.role === 'booking') return null;
  if (method === 'GET' && pathname === '/api/v1/availability') {
    return { bucket: 'api-availability', limit: 60 };
  }
  if (method === 'POST' && pathname === '/api/v1/bookings/prepare') {
    return { bucket: 'api-prepare', limit: 10 };
  }
  if (method === 'POST' && pathname === '/api/v1/bookings') {
    return { bucket: 'api-commit', limit: 5 };
  }
  if (method === 'POST' && /\/api\/v1\/rooms\/[^/]+\/credentials$/.test(pathname)) {
    return { bucket: 'api-room-credential', limit: 20 };
  }
  return null;
}

async function allowRequest(
  stub: DurableObjectStub<SchedulerDurableObject>,
  request: Request,
  env: Env,
  bucket: string,
  limit: number
): Promise<boolean> {
  const subject = request.headers.get('cf-connecting-ip') ?? 'unknown-client';
  const salt = env.ACTION_SIGNING_SECRET ?? env.PROPOSAL_SIGNING_SECRET ?? 'unconfigured';
  const digest = new Uint8Array(await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`${salt}:${subject}`)
  ));
  const subjectHash = Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return await stub.consumeRateLimit({
    bucket,
    subjectHash,
    limit,
    windowMilliseconds: 60_000,
    now: Date.now()
  });
}

function configurationUnavailable(): Response {
  return json({
    status: 'retryable',
    error: {
      code: 'runtime_configuration_unavailable',
      message: 'The scheduler runtime is not configured or temporarily unavailable.'
    },
    nextActions: ['contact_operator']
  }, 503);
}

function unauthorized(code: string): Response {
  return json({ status: 'operator_required', error: { code, message: 'Authorization failed.' } }, 403);
}

function rateLimited(): Response {
  return json({
    status: 'retryable',
    error: { code: 'rate_limited', message: 'Too many scheduler requests.' },
    nextActions: ['retry_later']
  }, 429);
}

function json(value: unknown, status: number): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'no-referrer'
    }
  });
}
