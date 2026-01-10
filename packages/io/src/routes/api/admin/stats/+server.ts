import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const CACHE_KEY = 'admin:stats';
const CACHE_TTL = 300; // 5 minutes

interface StatsResponse {
	experiments: number;
	submissions: number;
	subscribers: number;
	executions: number;
}

export const GET: RequestHandler = async ({ platform, url }) => {
	const db = platform?.env?.DB;
	const cache = platform?.env?.CACHE;

	if (!db) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	// Check for cache bypass flag (for admin refresh)
	const bypassCache = url.searchParams.get('refresh') === 'true';

	// Try to get from cache first
	if (cache && !bypassCache) {
		try {
			const cached = await cache.get<StatsResponse>(CACHE_KEY, { type: 'json' });
			if (cached) {
				return json(cached, {
					headers: {
						'X-Cache': 'HIT',
						'Cache-Control': 'public, max-age=300'
					}
				});
			}
		} catch (e) {
			console.error('Cache read error:', e);
			// Continue to database query on cache error
		}
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

		const stats: StatsResponse = {
			experiments: experimentsCount,
			submissions: submissionsCount,
			subscribers: subscribersCount,
			executions: executionsCount
		};

		// Store in cache for future requests
		if (cache) {
			try {
				await cache.put(CACHE_KEY, JSON.stringify(stats), {
					expirationTtl: CACHE_TTL
				});
			} catch (e) {
				console.error('Cache write error:', e);
				// Don't fail request on cache write error
			}
		}

		return json(stats, {
			headers: {
				'X-Cache': 'MISS',
				'Cache-Control': 'public, max-age=300'
			}
		});
	} catch (error) {
		console.error('Failed to fetch admin stats:', error);
		return json({ error: 'Failed to fetch stats', details: String(error) }, { status: 500 });
	}
};
