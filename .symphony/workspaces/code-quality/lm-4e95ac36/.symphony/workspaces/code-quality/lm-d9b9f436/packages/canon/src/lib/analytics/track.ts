/**
 * Shared analytics tracking handler
 *
 * Extracts duplicated business logic from:
 * - packages/space/src/routes/api/analytics/track/+server.ts
 * - packages/io/src/routes/api/analytics/track/+server.ts
 * - packages/agency/src/routes/api/analytics/track/+server.ts
 */

import type { AnalyticsEventRequest } from '../types/index.js';

// D1Database type from Cloudflare
type D1Database = {
	prepare(query: string): D1PreparedStatement;
};

type D1PreparedStatement = {
	bind(...values: unknown[]): D1PreparedStatement;
	run(): Promise<D1Result>;
};

type D1Result = {
	success: boolean;
	meta?: unknown;
	error?: string;
};

export interface TrackAnalyticsResult {
	success: boolean;
	error?: string;
	status: number;
}

/**
 * Track an analytics event to D1 database
 *
 * @param db - D1 database instance
 * @param request - Request object (for headers)
 * @returns Result indicating success/failure
 */
export async function trackAnalyticsEvent(
	db: D1Database,
	request: Request
): Promise<TrackAnalyticsResult> {
	try {
		const { event_type, property, path, experiment_id, tag_id, referrer } =
			(await request.json()) as AnalyticsEventRequest;

		if (!event_type) {
			return {
				success: false,
				error: 'event_type is required',
				status: 400
			};
		}

		// Get user agent and country from request headers
		const user_agent = request.headers.get('user-agent') || '';
		const country = request.headers.get('cf-ipcountry') || '';

		// Insert analytics event
		await db
			.prepare(
				`INSERT INTO analytics_events (event_type, property, path, experiment_id, tag_id, referrer, user_agent, country)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
			)
			.bind(
				event_type,
				property || null,
				path || null,
				experiment_id || null,
				tag_id || null,
				referrer || null,
				user_agent,
				country
			)
			.run();

		return { success: true, status: 201 };
	} catch (error) {
		console.error('Failed to track analytics event:', error);
		// Don't fail the request if analytics fails - just log it
		return { success: false, status: 200 };
	}
}
