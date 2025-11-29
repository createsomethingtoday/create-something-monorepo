import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ platform }) => {
	const db = platform?.env?.DB;

	if (!db) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	try {
		type CountResult = { count: number };

		// Get experiments count (from papers table)
		let experimentsCount = 0;
		try {
			const experimentsResult = await db
				.prepare('SELECT COUNT(*) as count FROM papers WHERE published = 1')
				.first<CountResult>();
			experimentsCount = experimentsResult?.count || 0;
		} catch (e) {
			console.error('Error counting experiments:', e);
		}

		// Get submissions count
		let submissionsCount = 0;
		try {
			const submissionsResult = await db
				.prepare('SELECT COUNT(*) as count FROM contact_submissions')
				.first<CountResult>();
			submissionsCount = submissionsResult?.count || 0;
		} catch (e) {
			console.error('Error counting submissions:', e);
		}

		// Get subscribers count
		let subscribersCount = 0;
		try {
			const subscribersResult = await db
				.prepare('SELECT COUNT(*) as count FROM newsletter_subscribers WHERE active = 1')
				.first<CountResult>();
			subscribersCount = subscribersResult?.count || 0;
		} catch (e) {
			console.error('Error counting subscribers:', e);
		}

		// Get executions count (last 30 days)
		let executionsCount = 0;
		try {
			const executionsResult = await db
				.prepare(
					`SELECT COUNT(*) as count FROM experiment_executions
					WHERE created_at >= datetime('now', '-30 days')`
				)
				.first<CountResult>();
			executionsCount = executionsResult?.count || 0;
		} catch (e) {
			console.error('Error counting executions:', e);
		}

		return json({
			experiments: experimentsCount,
			submissions: submissionsCount,
			subscribers: subscribersCount,
			executions: executionsCount
		});
	} catch (error) {
		console.error('Failed to fetch admin stats:', error);
		return json({ error: 'Failed to fetch stats', details: String(error) }, { status: 500 });
	}
};
