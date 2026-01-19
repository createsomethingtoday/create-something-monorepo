/**
 * Analytics Server Utilities
 *
 * Reusable server-side handlers for processing analytics events.
 * Import this in your +server.ts API route handlers.
 *
 * @packageDocumentation
 */

import type { AnalyticsEvent, EventBatch, BatchResponse, Property } from './types.js';

// =============================================================================
// SHARED REQUEST HANDLERS
// =============================================================================

/**
 * Create unified analytics event handlers for SvelteKit routes.
 * 
 * Usage in +server.ts:
 * ```ts
 * import { createAnalyticsEventsHandler } from '@create-something/components/analytics';
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
}

interface D1Result<T = unknown> {
	success: boolean;
	results?: T[];
	error?: string;
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

	const validProperties: Property[] = ['space', 'io', 'agency', 'ltd', 'lms'];
	if (!validProperties.includes(event.property)) return false;

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

		// Look for session_end event with client-reported duration
		const sessionEndEvent = sessionEvts.find(e => e.action === 'session_end');
		const clientReportedDuration = sessionEndEvent?.value;

		// Check if session exists
		const existing = await db
			.prepare('SELECT * FROM unified_sessions WHERE id = ?')
			.bind(sessionId)
			.run();

		if (existing.results && existing.results.length > 0) {
			// Update existing session
			// Get user_id from first event with one (in case user logged in mid-session)
			const eventUserId = sessionEvts.find(e => e.userId)?.userId || null;

			// Prefer client-reported duration from session_end event if available
			if (clientReportedDuration !== undefined && clientReportedDuration > 0) {
				// Use client-reported active time (more accurate)
				await db
					.prepare(
						`UPDATE unified_sessions SET
						 user_id = COALESCE(user_id, ?),
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
						lastEvent.timestamp,
						Math.round(clientReportedDuration),
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
						 ended_at = ?,
						 duration_seconds = CASE
						   WHEN page_views + ? > 0 THEN MAX(CAST((julianday(?) - julianday(started_at)) * 86400 AS INTEGER), 1)
						   ELSE CAST((julianday(?) - julianday(started_at)) * 86400 AS INTEGER)
						 END,
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
						lastEvent.timestamp,
						pageViews,
						lastEvent.timestamp,
						lastEvent.timestamp,
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
				durationSeconds = Math.round(clientReportedDuration);
			} else {
				// Fall back to timestamp calculation
				const startTime = new Date(firstEvent.timestamp).getTime();
				const endTime = new Date(lastEvent.timestamp).getTime();
				durationSeconds = Math.round((endTime - startTime) / 1000);

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
					 (id, property, user_id, started_at, ended_at, duration_seconds, page_views, interactions, conversions, errors, max_scroll_depth, entry_url, exit_url, referrer, user_agent, ip_country)
					 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
				)
				.bind(
					sessionId,
					firstEvent.property,
					firstEvent.userId || null,
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
		const updates: string[] = ['ended_at = ?', 'updated_at = datetime(\'now\')'];
		const values: unknown[] = [event.timestamp];

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
		await db
			.prepare(
				`INSERT INTO unified_sessions
         (id, property, user_id, started_at, ended_at, page_views, entry_url, referrer, user_agent, ip_country)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
			)
			.bind(
				sessionId,
				event.property,
				event.userId || null,
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
