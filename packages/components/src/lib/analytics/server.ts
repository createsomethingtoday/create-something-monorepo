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
