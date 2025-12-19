/**
 * Admin Analytics Summary
 *
 * Quick stats for the admin dashboard index page.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ platform }) => {
	const db = platform?.env?.DB;

	if (!db) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	try {
		// Get total events
		const totalResult = await db
			.prepare('SELECT COUNT(*) as count FROM unified_events')
			.first<{ count: number }>();

		// Get today's events
		const todayResult = await db
			.prepare(
				`SELECT COUNT(*) as count FROM unified_events
				 WHERE date(created_at) = date('now')`
			)
			.first<{ count: number }>();

		// Get sessions in last 24 hours
		const sessionsResult = await db
			.prepare(
				`SELECT COUNT(DISTINCT session_id) as count FROM unified_events
				 WHERE created_at >= datetime('now', '-24 hours')`
			)
			.first<{ count: number }>();

		// Get top action
		const topActionResult = await db
			.prepare(
				`SELECT action, COUNT(*) as count FROM unified_events
				 GROUP BY action ORDER BY count DESC LIMIT 1`
			)
			.first<{ action: string; count: number }>();

		return json({
			totalEvents: totalResult?.count || 0,
			todayEvents: todayResult?.count || 0,
			activeSessions: sessionsResult?.count || 0,
			topAction: topActionResult?.action || '',
		});
	} catch (error) {
		console.error('Analytics summary error:', error);
		return json(
			{
				totalEvents: 0,
				todayEvents: 0,
				activeSessions: 0,
				topAction: '',
			},
			{ status: 200 }
		);
	}
};
