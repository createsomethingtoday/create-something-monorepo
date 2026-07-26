import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getCatalogExperimentPapers } from '$lib/config/experimentCatalog';

const CACHE_KEY = 'admin:stats:v2';
const CACHE_TTL = 300;

interface StatsResponse {
	experiments: number;
	submissions: number | null;
	subscribers: number | null;
	executions: number | null;
}

interface CountResult {
	count: number;
}

async function readCount(
	db: NonNullable<App.Platform['env']>['DB'],
	query: string,
	label: string
): Promise<number | null> {
	try {
		const result = await db.prepare(query).first<CountResult>();
		return result?.count ?? 0;
	} catch (error) {
		console.error(`Error counting ${label}:`, error);
		return null;
	}
}

function isComplete(stats: StatsResponse) {
	return (
		stats.submissions !== null &&
		stats.subscribers !== null &&
		stats.executions !== null
	);
}

export const GET: RequestHandler = async ({ platform, url }) => {
	const db = platform?.env?.DB;
	const cache = platform?.env?.CACHE;

	if (!db) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	const bypassCache = url.searchParams.get('refresh') === 'true';

	if (cache && !bypassCache) {
		try {
			const cached = await cache.get<StatsResponse>(CACHE_KEY, { type: 'json' });
			if (cached) {
				return json(cached, {
					headers: {
						'X-Cache': 'HIT',
						'X-Data-Complete': 'true',
						'Cache-Control': 'private, max-age=300'
					}
				});
			}
		} catch (error) {
			console.error('Cache read error:', error);
		}
	}

	const [submissions, subscribers, executions] = await Promise.all([
		readCount(db, 'SELECT COUNT(*) as count FROM contact_submissions', 'submissions'),
		readCount(
			db,
			'SELECT COUNT(*) as count FROM newsletter_subscribers WHERE active = 1',
			'subscribers'
		),
		readCount(
			db,
			`SELECT COUNT(*) as count FROM experiment_executions
			WHERE executed_at >= datetime('now', '-30 days')`,
			'executions'
		)
	]);

	const stats: StatsResponse = {
		experiments: getCatalogExperimentPapers().length,
		submissions,
		subscribers,
		executions
	};
	const complete = isComplete(stats);

	if (cache && complete) {
		try {
			await cache.put(CACHE_KEY, JSON.stringify(stats), { expirationTtl: CACHE_TTL });
		} catch (error) {
			console.error('Cache write error:', error);
		}
	}

	return json(stats, {
		headers: {
			'X-Cache': 'MISS',
			'X-Data-Complete': String(complete),
			'Cache-Control': complete ? 'private, max-age=300' : 'no-store'
		}
	});
};
