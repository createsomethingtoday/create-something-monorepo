import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * Hash a string for privacy
 */
async function hashString(str: string): Promise<string> {
	if (!str) return 'anonymous';
	try {
		const encoder = new TextEncoder();
		const data = encoder.encode(str);
		const hashBuffer = await crypto.subtle.digest('SHA-256', data);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		return hashArray
			.map((b) => b.toString(16).padStart(2, '0'))
			.join('')
			.substring(0, 16);
	} catch {
		return 'hash_error';
	}
}

export const POST: RequestHandler = async ({ request, platform, locals }) => {
	const db = platform?.env?.DB;
	if (!db) {
		// Silently fail if DB not available - don't break the app for analytics
		return json({ success: true });
	}

	try {
		const body = await request.json();
		const { eventName, pagePath, properties } = body as {
			eventName: string;
			pagePath?: string;
			properties?: Record<string, unknown>;
		};

		if (!eventName) {
			return json({ error: 'Event name required' }, { status: 400 });
		}

		// Hash user email for privacy
		const userHash = locals.user ? await hashString(locals.user.email) : 'anonymous';

		// Store event
		await db
			.prepare(
				`INSERT INTO analytics_events (event_name, user_hash, page_path, properties)
				 VALUES (?, ?, ?, ?)`
			)
			.bind(eventName, userHash, pagePath || null, properties ? JSON.stringify(properties) : null)
			.run();

		return json({ success: true });
	} catch (error) {
		console.error('Analytics tracking error:', error);
		// Return success anyway - don't break the app for analytics
		return json({ success: true });
	}
};

// GET endpoint to retrieve analytics (for admin/reporting)
export const GET: RequestHandler = async ({ platform, locals, url }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const db = platform?.env?.DB;
	if (!db) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	try {
		const eventName = url.searchParams.get('event');
		const days = parseInt(url.searchParams.get('days') || '7');
		const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 1000);

		const dateFilter = new Date();
		dateFilter.setDate(dateFilter.getDate() - days);
		const dateString = dateFilter.toISOString();

		let query = `SELECT event_name, page_path, properties, created_at 
					 FROM analytics_events 
					 WHERE created_at >= ?`;
		const params: (string | number)[] = [dateString];

		if (eventName) {
			query += ' AND event_name = ?';
			params.push(eventName);
		}

		query += ' ORDER BY created_at DESC LIMIT ?';
		params.push(limit);

		const result = await db
			.prepare(query)
			.bind(...params)
			.all();

		// Also get summary stats
		const summaryResult = await db
			.prepare(
				`SELECT event_name, COUNT(*) as count 
				 FROM analytics_events 
				 WHERE created_at >= ?
				 GROUP BY event_name
				 ORDER BY count DESC`
			)
			.bind(dateString)
			.all();

		return json({
			events: result.results,
			summary: summaryResult.results,
			period: { days, since: dateString }
		});
	} catch (error) {
		console.error('Analytics fetch error:', error);
		return json({ error: 'Failed to fetch analytics' }, { status: 500 });
	}
};
