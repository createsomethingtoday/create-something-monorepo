/**
 * ClickUp Analytics API Endpoint
 *
 * Returns live project progress metrics from internal proposal workflows.
 */
import { json, type RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ platform }) => {
	const db = platform?.env?.DB;
	if (!db) {
		return json(
			{
				success: false,
				error: 'Database not available'
			},
			{ status: 503 }
		);
	}

	try {
		const now = Date.now();
		const startOfDay = new Date();
		startOfDay.setHours(0, 0, 0, 0);
		const startOfDayMs = startOfDay.getTime();

		const [activeResult, completedTodayResult, totalResult, doneResult] = await Promise.all([
			db.prepare(
				`SELECT COUNT(*) as count
				 FROM agent_proposals
				 WHERE status IN ('pending', 'approved')`
			).first<{ count: number }>(),
			db
				.prepare(
					`SELECT COUNT(*) as count
					 FROM agent_proposals
					 WHERE status IN ('applied', 'rolled_back', 'rejected')
					   AND updated_at >= ?`
				)
				.bind(startOfDayMs)
				.first<{ count: number }>(),
			db.prepare('SELECT COUNT(*) as count FROM agent_proposals').first<{ count: number }>(),
			db
				.prepare(
					`SELECT COUNT(*) as count
					 FROM agent_proposals
					 WHERE status IN ('applied', 'rolled_back')`
				)
				.first<{ count: number }>()
		]);

		const activeTasks = Number(activeResult?.count || 0);
		const completedToday = Number(completedTodayResult?.count || 0);
		const total = Number(totalResult?.count || 0);
		const done = Number(doneResult?.count || 0);
		const progress = total > 0 ? Math.round((done / total) * 100) : 0;

		return json({
			success: true,
			data: {
				activeTasks,
				completedToday,
				progress
			},
			refreshedAt: now,
			source: 'd1'
		});
	} catch (error) {
		console.error('ClickUp analytics error:', error);
		return json(
			{
				success: false,
				error: 'Failed to fetch ClickUp analytics'
			},
			{ status: 500 }
		);
	}
};
