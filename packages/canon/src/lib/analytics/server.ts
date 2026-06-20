/**
 * Analytics Server Utilities
 *
 * Reusable server-side handlers for processing analytics events.
 * Import this in your +server.ts API route handlers.
 *
 * @packageDocumentation
 */

import type { AnalyticsEvent, EventBatch, BatchResponse, Property, PropertyAnalytics, DailyActivityPoint, CategoryBreakdown } from './types.js';
import { json, error } from '@sveltejs/kit';

const VALID_PROPERTIES: Property[] = ['space', 'io', 'agency', 'ltd', 'lms'];
const DEFAULT_HEALTH_STALE_AFTER_HOURS = 24;
const MAX_SESSION_DURATION_SECONDS = 4 * 60 * 60;
const MAX_BATCH_EVENTS = 50;
const MAX_EVENT_STRING_LENGTH = 500;
const MAX_URL_LENGTH = 2048;
const MAX_METADATA_JSON_LENGTH = 4096;
const DEFAULT_USER_ANALYTICS_DAYS = 30;
const MAX_USER_ANALYTICS_DAYS = 90;

// =============================================================================
// SHARED REQUEST HANDLERS
// =============================================================================

/**
 * Create unified analytics event handlers for SvelteKit routes.
 * 
 * Usage in +server.ts:
 * ```ts
 * import { createAnalyticsEventsHandler } from '@create-something/canon/analytics';
 * export const { POST, GET } = createAnalyticsEventsHandler();
 * ```
 */
export function createAnalyticsEventsHandler() {
	return {
		POST: async ({
			request,
			platform
		}: {
			request: Request;
			platform?: { env?: AnalyticsEnv };
		}) => {
			const db = platform?.env?.DB;

			if (!db) {
				return Response.json({ success: false, error: 'Database not available' }, { status: 500 });
			}

			try {
				const batch = (await request.json()) as EventBatch;

				if (!batch || !Array.isArray(batch.events)) {
					return Response.json({ success: false, error: 'Invalid batch format' }, { status: 400 });
				}

				if (batch.events.length > MAX_BATCH_EVENTS) {
					return Response.json(
						{ success: false, error: `Batch exceeds ${MAX_BATCH_EVENTS} events` },
						{ status: 413 }
					);
				}

				const context = {
					userAgent: request.headers.get('user-agent') || undefined,
					ipCountry: request.headers.get('cf-ipcountry') || undefined
				};

				const result = await processEventBatch(db, batch, context);
				return Response.json(result, { status: result.success ? 200 : 207 });
			} catch (error) {
				console.error('[AnalyticsEventsAPI] Failed to process analytics events', error);
				return Response.json({ success: false, received: 0 }, { status: 200 });
			}
		},

		GET: async () => {
			return Response.json({ status: 'ok', endpoint: 'unified-analytics' });
		}
	};
}

export function createAnalyticsHealthHandler(
	options: {
		properties?: Property[];
		staleAfterHours?: number;
	} = {}
) {
	const configuredProperties = options.properties ?? VALID_PROPERTIES;
	const staleAfterHours = options.staleAfterHours ?? DEFAULT_HEALTH_STALE_AFTER_HOURS;

	return {
		GET: async ({
			platform,
			url
		}: {
			platform?: { env?: AnalyticsEnv };
			url?: URL;
		}) => {
			const db = platform?.env?.DB;
			if (!db) {
				return Response.json({ status: 'error', error: 'Database not available' }, { status: 500 });
			}

			const requestedProperty = url?.searchParams.get('property');
			const properties =
				requestedProperty && isProperty(requestedProperty)
					? [requestedProperty]
					: configuredProperties;

			const placeholders = properties.map(() => '?').join(', ');
			const result = await db
				.prepare(
					`SELECT
						property,
						COUNT(*) AS total_events,
						COUNT(DISTINCT session_id) AS total_sessions,
						MAX(created_at) AS latest_event_at
					FROM unified_events
					WHERE property IN (${placeholders})
					GROUP BY property`
				)
				.bind(...properties)
				.run();

			const rows = new Map(
				((result.results ?? []) as Array<{
					property: Property;
					total_events: number;
					total_sessions: number;
					latest_event_at: string | null;
				}>).map((row) => [row.property, row])
			);

			const checkedAt = new Date();
			const propertyHealth = properties.map((property) => {
				const row = rows.get(property);
				const latestEventAt = row?.latest_event_at ?? null;
				const ageHours = latestEventAt
					? (checkedAt.getTime() - new Date(latestEventAt).getTime()) / (1000 * 60 * 60)
					: null;
				const status = ageHours === null ? 'missing' : ageHours > staleAfterHours ? 'stale' : 'ok';

				return {
					property,
					status,
					latestEventAt,
					ageHours: ageHours === null ? null : Number(ageHours.toFixed(2)),
					totalEvents: row?.total_events ?? 0,
					totalSessions: row?.total_sessions ?? 0
				};
			});

			return Response.json({
				status: propertyHealth.every((item) => item.status === 'ok') ? 'ok' : 'stale',
				checkedAt: checkedAt.toISOString(),
				staleAfterHours,
				properties: propertyHealth
			});
		}
	};
}

/**
 * Create user analytics handler for property-specific endpoints.
 * 
 * Usage in +server.ts:
 * ```ts
 * import { createUserAnalyticsHandler } from '@create-something/canon/analytics';
 * export const GET = createUserAnalyticsHandler({ property: 'ltd' });
 * ```
 */
export function createUserAnalyticsHandler(options: { property: Property }) {
	const PROPERTY = options.property;

	return async ({
		request,
		locals,
		platform,
		url
	}: {
		request: Request;
		locals: { user?: { id: string } };
		platform?: { env?: AnalyticsEnv };
		url: URL;
	}) => {
		const db = platform?.env?.DB;

		if (!db) {
			throw error(500, 'Database not available');
		}

		const userId = locals.user?.id;
		const requestUserId = url.searchParams.get('userId');
		const serviceAuthorized = isAuthorizedAnalyticsServiceRequest(request, platform?.env);

		if (!userId && !serviceAuthorized) {
			throw error(401, 'Authentication required');
		}

		const targetUserId = userId || requestUserId;

		if (!targetUserId) {
			throw error(400, 'User ID required');
		}

		const days = parseBoundedDays(url.searchParams.get('days'));

		try {
			const [sessionsResult, dailyResult, categoryResult, topPagesResult] = await Promise.all([
				db
					.prepare(
						`SELECT
							COUNT(*) as total,
							COALESCE(SUM(page_views), 0) as page_views,
							COALESCE(SUM(duration_seconds), 0) as duration_seconds
						FROM unified_sessions
						WHERE user_id = ?
						AND started_at >= datetime('now', '-' || ? || ' days')`
					)
					.bind(targetUserId, days)
					.first<{ total: number; page_views: number; duration_seconds: number }>(),

				db
					.prepare(
						`SELECT date, SUM(count) as count
						FROM unified_events_daily
						WHERE property = ?
						AND date >= date('now', '-' || ? || ' days')
						GROUP BY date
						ORDER BY date`
					)
					.bind(PROPERTY, days)
					.all<{ date: string; count: number }>(),

				db
					.prepare(
						`SELECT category, COUNT(*) as count
						FROM unified_events
						WHERE user_id = ?
						AND created_at >= datetime('now', '-' || ? || ' days')
						GROUP BY category
						ORDER BY count DESC`
					)
					.bind(targetUserId, days)
					.all<{ category: string; count: number }>(),

				db
					.prepare(
						`SELECT url, COUNT(*) as views
						FROM unified_events
						WHERE user_id = ?
						AND action = 'page_view'
						AND created_at >= datetime('now', '-' || ? || ' days')
						GROUP BY url
						ORDER BY views DESC
						LIMIT 10`
					)
					.bind(targetUserId, days)
					.all<{ url: string; views: number }>()
			]);

			const sessions = sessionsResult || { total: 0, page_views: 0, duration_seconds: 0 };
			const dailyActivity: DailyActivityPoint[] = dailyResult.results || [];
			const categoryBreakdown: CategoryBreakdown[] = (categoryResult.results || []).map((r: { category: string; count: number }) => ({
				category: r.category as CategoryBreakdown['category'],
				count: r.count
			}));
			const topPages = topPagesResult.results || [];

			const response: PropertyAnalytics = {
				property: PROPERTY,
				sessions: {
					total: sessions.total,
					pageViews: sessions.page_views,
					durationSeconds: sessions.duration_seconds
				},
				dailyActivity,
				categoryBreakdown,
				topPages
			};

			return json(response);
		} catch (err) {
			console.error(`[UserAnalyticsAPI:${PROPERTY}] Failed to fetch`, { userId: targetUserId, days, error: err });
			throw error(500, 'Failed to fetch analytics');
		}
	};
}

// =============================================================================
// TYPES
// =============================================================================

export interface D1Database {
	prepare(query: string): D1PreparedStatement;
	batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
}

export interface AnalyticsEnv {
	DB?: D1Database;
	ANALYTICS_SERVICE_TOKEN?: string;
	USER_ANALYTICS_SERVICE_TOKEN?: string;
	INTERNAL_ANALYTICS_TOKEN?: string;
}

export interface D1PreparedStatement {
	bind(...values: unknown[]): D1PreparedStatement;
	run(): Promise<D1Result>;
	first<T = unknown>(): Promise<T | null>;
	first<T = unknown>(column: string): Promise<T | null>;
	all<T = unknown>(): Promise<D1Result<T>>;
}

export interface D1Result<T = unknown> {
	success: boolean;
	results?: T[];
	error?: string;
}

function isProperty(value: unknown): value is Property {
	return typeof value === 'string' && VALID_PROPERTIES.includes(value as Property);
}

function getConfiguredAnalyticsServiceToken(env?: AnalyticsEnv): string | null {
	return (
		env?.ANALYTICS_SERVICE_TOKEN?.trim() ||
		env?.USER_ANALYTICS_SERVICE_TOKEN?.trim() ||
		env?.INTERNAL_ANALYTICS_TOKEN?.trim() ||
		null
	);
}

function getBearerToken(request: Request): string | null {
	const authorization = request.headers.get('authorization');
	const match = authorization?.match(/^Bearer\s+(.+)$/i);
	return match?.[1]?.trim() || null;
}

function getAnalyticsServiceTokenFromRequest(request: Request): string | null {
	return (
		getBearerToken(request) ||
		request.headers.get('x-analytics-service-token')?.trim() ||
		request.headers.get('x-api-key')?.trim() ||
		null
	);
}

function isAuthorizedAnalyticsServiceRequest(request: Request, env?: AnalyticsEnv): boolean {
	const expected = getConfiguredAnalyticsServiceToken(env);
	const actual = getAnalyticsServiceTokenFromRequest(request);

	return Boolean(expected && actual && actual === expected);
}

function parseBoundedDays(raw: string | null): number {
	const parsed = Number.parseInt(raw ?? String(DEFAULT_USER_ANALYTICS_DAYS), 10);
	if (!Number.isFinite(parsed)) return DEFAULT_USER_ANALYTICS_DAYS;

	return Math.max(1, Math.min(parsed, MAX_USER_ANALYTICS_DAYS));
}

function getEventSourceProperty(event: AnalyticsEvent): Property | null {
	const metadata = event.metadata ?? {};
	const metadataSource = metadata.sourceProperty ?? metadata.source_property;
	const sourceProperty = event.sourceProperty ?? metadataSource;

	if (isProperty(sourceProperty) && sourceProperty !== event.property) {
		return sourceProperty;
	}

	return null;
}

function clampDurationSeconds(value: number): number {
	if (!Number.isFinite(value)) return 0;
	return Math.max(0, Math.min(Math.round(value), MAX_SESSION_DURATION_SECONDS));
}

function truncateString(value: string, maxLength = MAX_EVENT_STRING_LENGTH): string {
	return value.length > maxLength ? value.slice(0, maxLength) : value;
}

function redactSensitiveText(value: string): string {
	return value
		.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
		.replace(/\b(?:sk|pk|pat|ghp|gho|ghu|ghs|ghr)-[A-Za-z0-9_-]{8,}\b/g, '[secret]')
		.replace(/\b(?:Bearer\s+)[A-Za-z0-9._~+/=-]{12,}\b/gi, 'Bearer [secret]')
		.replace(/\b(?:\+?\d[\d\s().-]{8,}\d)\b/g, '[number]');
}

function sanitizeText(value: unknown, maxLength = MAX_EVENT_STRING_LENGTH): string | undefined {
	if (typeof value !== 'string') return undefined;
	return truncateString(redactSensitiveText(value), maxLength);
}

function sanitizeUrl(value: unknown): string | undefined {
	const text = sanitizeText(value, MAX_URL_LENGTH);
	if (!text) return undefined;

	try {
		const url = new URL(text);
		return truncateString(`${url.origin}${url.pathname}`, MAX_URL_LENGTH);
	} catch {
		return truncateString(text.split('?')[0].split('#')[0], MAX_URL_LENGTH);
	}
}

function sanitizeMetadataValue(value: unknown, depth = 0): unknown {
	if (depth > 4) return '[truncated]';
	if (typeof value === 'string') return sanitizeText(value);
	if (typeof value === 'number') return Number.isFinite(value) ? value : null;
	if (typeof value === 'boolean' || value === null) return value;
	if (Array.isArray(value)) return value.slice(0, 25).map((item) => sanitizeMetadataValue(item, depth + 1));
	if (typeof value === 'object') {
		const sanitized: Record<string, unknown> = {};
		for (const [key, childValue] of Object.entries(value as Record<string, unknown>).slice(0, 50)) {
			sanitized[sanitizeText(key, 100) ?? 'field'] = sanitizeMetadataValue(childValue, depth + 1);
		}
		return sanitized;
	}

	return null;
}

function sanitizeMetadata(metadata: unknown): Record<string, unknown> | undefined {
	if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return undefined;

	const sanitized = sanitizeMetadataValue(metadata);
	const json = JSON.stringify(sanitized);
	if (json.length <= MAX_METADATA_JSON_LENGTH) {
		return sanitized as Record<string, unknown>;
	}

	return { truncated: true };
}

function sanitizeAnalyticsEvent(event: unknown): AnalyticsEvent | null {
	if (!event || typeof event !== 'object') return null;
	const candidate = event as AnalyticsEvent;

	const url = sanitizeUrl(candidate.url);
	const timestamp = sanitizeText(candidate.timestamp, 100);
	const eventId = sanitizeText(candidate.eventId, 120);
	const sessionId = sanitizeText(candidate.sessionId, 120);
	const action = sanitizeText(candidate.action, 120);

	if (!url || !timestamp || !eventId || !sessionId || !action) return null;

	return {
		...candidate,
		eventId,
		sessionId,
		userId: sanitizeText(candidate.userId, 120),
		property: candidate.property,
		sourceProperty: isProperty(candidate.sourceProperty) ? candidate.sourceProperty : undefined,
		timestamp,
		url,
		referrer: sanitizeUrl(candidate.referrer),
		category: candidate.category,
		action,
		target: sanitizeText(candidate.target),
		value: typeof candidate.value === 'number' && Number.isFinite(candidate.value) ? candidate.value : undefined,
		metadata: sanitizeMetadata(candidate.metadata)
	};
}

// =============================================================================
// EVENT PROCESSING
// =============================================================================

/**
 * Process a batch of analytics events and store in D1.
 */
export async function processEventBatch(
	db: D1Database,
	batch: EventBatch,
	context: {
		userAgent?: string;
		ipCountry?: string;
	}
): Promise<BatchResponse> {
	const { events, sentAt } = batch;

	if (!events || events.length === 0) {
		return { success: true, received: 0 };
	}

	if (events.length > MAX_BATCH_EVENTS) {
		return {
			success: false,
			received: 0,
			errors: [`Batch exceeds ${MAX_BATCH_EVENTS} events`]
		};
	}

	const errors: string[] = [];
	const statements: D1PreparedStatement[] = [];
	const validEvents: AnalyticsEvent[] = [];

	for (const event of events) {
		try {
			const sanitizedEvent = sanitizeAnalyticsEvent(event);

			// Validate event
			if (!sanitizedEvent || !validateEvent(sanitizedEvent)) {
				const eventId = typeof event === 'object' && event && 'eventId' in event ? String(event.eventId) : 'unknown';
				errors.push(`Invalid event: ${eventId}`);
				continue;
			}

			// Prepare insert statement
			const stmt = db
				.prepare(
					`INSERT INTO unified_events
           (id, session_id, user_id, property, category, action, target, value, url, referrer, user_agent, ip_country, metadata, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
				)
				.bind(
					sanitizedEvent.eventId,
					sanitizedEvent.sessionId,
					sanitizedEvent.userId || null,
					sanitizedEvent.property,
					sanitizedEvent.category,
					sanitizedEvent.action,
					sanitizedEvent.target || null,
					sanitizedEvent.value ?? null,
					sanitizedEvent.url,
					sanitizedEvent.referrer || null,
					context.userAgent || null,
					context.ipCountry || null,
					sanitizedEvent.metadata ? JSON.stringify(sanitizedEvent.metadata) : null,
					sanitizedEvent.timestamp
				);

			statements.push(stmt);
			validEvents.push(sanitizedEvent);
		} catch (error) {
			errors.push(`Error processing event ${event.eventId}: ${String(error)}`);
		}
	}

	// Execute batch insert
	if (statements.length > 0) {
		try {
			await db.batch(statements);
		} catch (error) {
			errors.push(`Batch insert failed: ${String(error)}`);
		}
	}

	// Update daily aggregates asynchronously
	try {
		await updateDailyAggregates(db, validEvents);
	} catch {
		// Non-critical, don't fail the request
	}

	// Update session summaries asynchronously
	try {
		await updateSessionSummaries(db, validEvents, context);
	} catch {
		// Non-critical, don't fail the request
	}

	return {
		success: errors.length === 0,
		received: statements.length,
		errors: errors.length > 0 ? errors : undefined,
	};
}

/**
 * Validate an analytics event
 */
function validateEvent(event: AnalyticsEvent): boolean {
	if (!event.eventId || !event.sessionId) return false;
	if (!event.property || !event.category || !event.action) return false;
	if (!event.url || !event.timestamp) return false;
	if (Number.isNaN(Date.parse(event.timestamp))) return false;

	if (!VALID_PROPERTIES.includes(event.property)) return false;
	if (event.eventId.length > 120 || event.sessionId.length > 120) return false;
	if (event.action.length > 120 || event.url.length > MAX_URL_LENGTH) return false;
	if (event.target && event.target.length > MAX_EVENT_STRING_LENGTH) return false;
	if (event.referrer && event.referrer.length > MAX_URL_LENGTH) return false;
	if (event.metadata && JSON.stringify(event.metadata).length > MAX_METADATA_JSON_LENGTH) return false;

	const validCategories = [
		'navigation',
		'interaction',
		'search',
		'content',
		'conversion',
		'error',
		'performance',
	];
	if (!validCategories.includes(event.category)) return false;

	return true;
}

/**
 * Update daily aggregate counts
 */
async function updateDailyAggregates(db: D1Database, events: AnalyticsEvent[]): Promise<void> {
	// Group events by date/property/category/action
	const aggregates = new Map<
		string,
		{
			date: string;
			property: Property;
			category: string;
			action: string;
			count: number;
			sessions: Set<string>;
			totalValue: number;
		}
	>();

	for (const event of events) {
		const date = event.timestamp.split('T')[0];
		const key = `${date}:${event.property}:${event.category}:${event.action}`;

		let agg = aggregates.get(key);
		if (!agg) {
			agg = {
				date,
				property: event.property,
				category: event.category,
				action: event.action,
				count: 0,
				sessions: new Set(),
				totalValue: 0,
			};
			aggregates.set(key, agg);
		}

		agg.count++;
		agg.sessions.add(event.sessionId);
		if (event.value !== undefined && event.value !== null) agg.totalValue += event.value;
	}

	// Upsert aggregates
	const statements: D1PreparedStatement[] = [];

	for (const [key, agg] of aggregates) {
		const id = `daily_${key.replace(/:/g, '_')}`;

		statements.push(
			db
				.prepare(
					`INSERT INTO unified_events_daily (id, date, property, category, action, count, unique_sessions, total_value, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
         ON CONFLICT(date, property, category, action) DO UPDATE SET
           count = count + excluded.count,
           unique_sessions = (
             SELECT COUNT(DISTINCT session_id)
             FROM unified_events
             WHERE date(created_at) = excluded.date
               AND property = excluded.property
               AND category = excluded.category
               AND action = excluded.action
           ),
           total_value = total_value + excluded.total_value,
           updated_at = datetime('now')`
				)
				.bind(id, agg.date, agg.property, agg.category, agg.action, agg.count, agg.sessions.size, agg.totalValue)
		);
	}

	if (statements.length > 0) {
		await db.batch(statements);
	}
}

// =============================================================================
// SESSION MANAGEMENT
// =============================================================================

/**
 * Update session summaries for a batch of events
 * Groups events by session and creates/updates sessions efficiently
 */
async function updateSessionSummaries(
	db: D1Database,
	events: AnalyticsEvent[],
	context: { userAgent?: string; ipCountry?: string }
): Promise<void> {
	// Group events by session
	const sessionEvents = new Map<string, AnalyticsEvent[]>();
	for (const event of events) {
		const existing = sessionEvents.get(event.sessionId) || [];
		existing.push(event);
		sessionEvents.set(event.sessionId, existing);
	}

	// Process each session
	for (const [sessionId, sessionEvts] of sessionEvents) {
		// Sort events by timestamp
		sessionEvts.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

		const firstEvent = sessionEvts[0];
		const lastEvent = sessionEvts[sessionEvts.length - 1];

		// Count event types
		const pageViews = sessionEvts.filter(e => e.category === 'navigation' && e.action === 'page_view').length;
		const interactions = sessionEvts.filter(e => e.category === 'interaction').length;
		const conversions = sessionEvts.filter(e => e.category === 'conversion').length;
		const errors = sessionEvts.filter(e => e.category === 'error').length;
		const maxScrollDepth = Math.max(0, ...sessionEvts.filter(e => e.action === 'scroll_depth' && e.value).map(e => e.value || 0));
		const eventUserId = sessionEvts.find(e => e.userId)?.userId || null;
		const sourceProperty = sessionEvts.map(getEventSourceProperty).find(Boolean) ?? null;

		// Look for session_end event with client-reported duration
		const sessionEndEvent = sessionEvts.find(e => e.action === 'session_end');
		const clientReportedDuration =
			typeof sessionEndEvent?.value === 'number'
				? clampDurationSeconds(sessionEndEvent.value)
				: undefined;

		// Check if session exists
		const existing = await db
			.prepare('SELECT * FROM unified_sessions WHERE id = ?')
			.bind(sessionId)
			.run();

		if (existing.results && existing.results.length > 0) {
			// Prefer client-reported duration from session_end event if available
			if (clientReportedDuration !== undefined && clientReportedDuration > 0) {
				// Use client-reported active time (more accurate)
				await db
					.prepare(
						`UPDATE unified_sessions SET
						 user_id = COALESCE(user_id, ?),
						 source_property = COALESCE(source_property, ?),
						 ended_at = ?,
						 duration_seconds = ?,
						 page_views = page_views + ?,
						 interactions = interactions + ?,
						 conversions = conversions + ?,
						 errors = errors + ?,
						 max_scroll_depth = MAX(max_scroll_depth, ?),
						 exit_url = ?,
						 updated_at = datetime('now')
						 WHERE id = ?`
					)
					.bind(
						eventUserId,
						sourceProperty,
						lastEvent.timestamp,
						clientReportedDuration,
						pageViews,
						interactions,
						conversions,
						errors,
						maxScrollDepth,
						lastEvent.url,
						sessionId
					)
					.run();
			} else {
				// Fall back to timestamp calculation
				// Use MAX(..., 1) to ensure minimum 1 second duration when page_views > 0
				await db
					.prepare(
						`UPDATE unified_sessions SET
						 user_id = COALESCE(user_id, ?),
						 source_property = COALESCE(source_property, ?),
						 ended_at = ?,
						 duration_seconds = MIN(CASE
						   WHEN page_views + ? > 0 THEN MAX(CAST((julianday(?) - julianday(started_at)) * 86400 AS INTEGER), 1)
						   ELSE MAX(CAST((julianday(?) - julianday(started_at)) * 86400 AS INTEGER), 0)
						 END, ?),
						 page_views = page_views + ?,
						 interactions = interactions + ?,
						 conversions = conversions + ?,
						 errors = errors + ?,
						 max_scroll_depth = MAX(max_scroll_depth, ?),
						 exit_url = ?,
						 updated_at = datetime('now')
						 WHERE id = ?`
					)
					.bind(
						eventUserId,
						sourceProperty,
						lastEvent.timestamp,
						pageViews,
						lastEvent.timestamp,
						lastEvent.timestamp,
						MAX_SESSION_DURATION_SECONDS,
						pageViews,
						interactions,
						conversions,
						errors,
						maxScrollDepth,
						lastEvent.url,
						sessionId
					)
					.run();
			}
		} else {
			// Calculate duration in seconds
			let durationSeconds: number;

			if (clientReportedDuration !== undefined && clientReportedDuration > 0) {
				// Prefer client-reported active time (more accurate, excludes hidden tab time)
				durationSeconds = clientReportedDuration;
			} else {
				// Fall back to timestamp calculation
				const startTime = new Date(firstEvent.timestamp).getTime();
				const endTime = new Date(lastEvent.timestamp).getTime();
				durationSeconds = clampDurationSeconds((endTime - startTime) / 1000);

				// Minimum duration fallback: if session has page_view but duration is 0,
				// use 1 second minimum (evidence of user presence)
				if (durationSeconds === 0 && pageViews > 0) {
					durationSeconds = 1;
				}
			}

			// Create new session
			await db
				.prepare(
					`INSERT INTO unified_sessions
					 (id, property, user_id, source_property, started_at, ended_at, duration_seconds, page_views, interactions, conversions, errors, max_scroll_depth, entry_url, exit_url, referrer, user_agent, ip_country)
					 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
				)
				.bind(
					sessionId,
					firstEvent.property,
					firstEvent.userId || null,
					sourceProperty,
					firstEvent.timestamp,
					lastEvent.timestamp,
					durationSeconds,
					pageViews,
					interactions,
					conversions,
					errors,
					maxScrollDepth,
					firstEvent.url,
					lastEvent.url,
					firstEvent.referrer || null,
					context.userAgent || null,
					context.ipCountry || null
				)
				.run();
		}
	}
}

/**
 * Update or create session summary
 */
export async function updateSessionSummary(
	db: D1Database,
	sessionId: string,
	event: AnalyticsEvent,
	context: { userAgent?: string; ipCountry?: string }
): Promise<void> {
	// Check if session exists
	const existing = await db
		.prepare('SELECT * FROM unified_sessions WHERE id = ?')
		.bind(sessionId)
		.run();

	if (existing.results && existing.results.length > 0) {
		// Update existing session
		const sourceProperty = getEventSourceProperty(event);
		const updates: string[] = [
			'ended_at = ?',
			'source_property = COALESCE(source_property, ?)',
			'updated_at = datetime(\'now\')'
		];
		const values: unknown[] = [event.timestamp, sourceProperty];

		if (event.category === 'navigation' && event.action === 'page_view') {
			updates.push('page_views = page_views + 1');
			updates.push('exit_url = ?');
			values.push(event.url);
		}
		if (event.category === 'interaction') {
			updates.push('interactions = interactions + 1');
		}
		if (event.category === 'conversion') {
			updates.push('conversions = conversions + 1');
		}
		if (event.category === 'error') {
			updates.push('errors = errors + 1');
		}
		if (event.action === 'scroll_depth' && event.value) {
			updates.push('max_scroll_depth = MAX(max_scroll_depth, ?)');
			values.push(event.value);
		}

		values.push(sessionId);

		await db
			.prepare(`UPDATE unified_sessions SET ${updates.join(', ')} WHERE id = ?`)
			.bind(...values)
			.run();
	} else {
		// Create new session
		const sourceProperty = getEventSourceProperty(event);
		await db
			.prepare(
				`INSERT INTO unified_sessions
         (id, property, user_id, source_property, started_at, ended_at, page_views, entry_url, referrer, user_agent, ip_country)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
			)
			.bind(
				sessionId,
				event.property,
				event.userId || null,
				sourceProperty,
				event.timestamp,
				event.timestamp,
				event.category === 'navigation' && event.action === 'page_view' ? 1 : 0,
				event.url,
				event.referrer || null,
				context.userAgent || null,
				context.ipCountry || null
			)
			.run();
	}
}

// =============================================================================
// QUERY HELPERS
// =============================================================================

export interface AnalyticsQueryOptions {
	property?: Property;
	category?: string;
	action?: string;
	startDate?: string;
	endDate?: string;
	sessionId?: string;
	limit?: number;
}

/**
 * Query events with filters
 */
export async function queryEvents(
	db: D1Database,
	options: AnalyticsQueryOptions
): Promise<AnalyticsEvent[]> {
	const conditions: string[] = [];
	const values: unknown[] = [];

	if (options.property) {
		conditions.push('property = ?');
		values.push(options.property);
	}
	if (options.category) {
		conditions.push('category = ?');
		values.push(options.category);
	}
	if (options.action) {
		conditions.push('action = ?');
		values.push(options.action);
	}
	if (options.startDate) {
		conditions.push('created_at >= ?');
		values.push(options.startDate);
	}
	if (options.endDate) {
		conditions.push('created_at <= ?');
		values.push(options.endDate);
	}
	if (options.sessionId) {
		conditions.push('session_id = ?');
		values.push(options.sessionId);
	}

	const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
	const limit = options.limit ? `LIMIT ${options.limit}` : 'LIMIT 1000';

	const result = await db
		.prepare(`SELECT * FROM unified_events ${where} ORDER BY created_at DESC ${limit}`)
		.bind(...values)
		.run();

	return (result.results as AnalyticsEvent[]) || [];
}

/**
 * Get daily aggregates for dashboard
 */
export async function getDailyAggregates(
	db: D1Database,
	options: {
		property?: Property;
		days?: number;
	}
): Promise<
	Array<{
		date: string;
		category: string;
		action: string;
		count: number;
		uniqueSessions: number;
	}>
> {
	const days = options.days ?? 30;
	const conditions = ['date >= date(\'now\', ? || \' days\')'];
	const values: unknown[] = [`-${days}`];

	if (options.property) {
		conditions.push('property = ?');
		values.push(options.property);
	}

	const result = await db
		.prepare(
			`SELECT date, category, action, count, unique_sessions as uniqueSessions
       FROM unified_events_daily
       WHERE ${conditions.join(' AND ')}
       ORDER BY date DESC, count DESC`
		)
		.bind(...values)
		.run();

	return (result.results as Array<{
		date: string;
		category: string;
		action: string;
		count: number;
		uniqueSessions: number;
	}>) || [];
}
