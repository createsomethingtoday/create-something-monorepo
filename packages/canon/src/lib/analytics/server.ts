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
		POST: async ({ request, platform }: { 
			request: Request; 
			platform?: { env?: { DB?: D1Database } } 
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
		GET: async ({ platform, url }: {
			platform?: { env?: { DB?: D1Database } };
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

	return async ({ locals, platform, url }: {
		locals: { user?: { id: string } };
		platform?: { env?: { DB?: D1Database } };
		url: URL;
	}) => {
		const db = platform?.env?.DB;

		if (!db) {
			throw error(500, 'Database not available');
		}

		const userId = locals.user?.id;
		const serviceToken = url.searchParams.get('token');
		const requestUserId = url.searchParams.get('userId');

		if (!userId && !serviceToken) {
			throw error(401, 'Authentication required');
		}

		const targetUserId = userId || requestUserId;

		if (!targetUserId) {
			throw error(400, 'User ID required');
		}

		const days = parseInt(url.searchParams.get('days') || '30');

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

interface D1PreparedStatement {
	bind(...values: unknown[]): D1PreparedStatement;
	run(): Promise<D1Result>;
	first<T = unknown>(): Promise<T | null>;
	first<T = unknown>(column: string): Promise<T | null>;
	all<T = unknown>(): Promise<D1Result<T>>;
}

interface D1Result<T = unknown> {
	success: boolean;
	results?: T[];
	error?: string;
}

function isProperty(value: unknown): value is Property {
	return typeof value === 'string' && VALID_PROPERTIES.includes(value as Property);
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

	const errors: string[] = [];
	const statements: D1PreparedStatement[] = [];

	for (const event of events) {
		try {
			// Validate event
			if (!validateEvent(event)) {
				errors.push(`Invalid event: ${event.eventId}`);
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
					event.eventId,
					event.sessionId,
					event.userId || null,
					event.property,
					event.category,
					event.action,
					event.target || null,
					event.value || null,
					event.url,
					event.referrer || null,
					context.userAgent || null,
					context.ipCountry || null,
					event.metadata ? JSON.stringify(event.metadata) : null,
					event.timestamp
				);

			statements.push(stmt);
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
		await updateDailyAggregates(db, events);
	} catch {
		// Non-critical, don't fail the request
	}

	// Update session summaries asynchronously
	try {
		await updateSessionSummaries(db, events, context);
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

	if (!VALID_PROPERTIES.includes(event.property)) return false;

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
		if (event.value) agg.totalValue += event.value;
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
           unique_sessions = unique_sessions + excluded.unique_sessions,
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
