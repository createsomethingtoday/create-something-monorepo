import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getVideos, getVideosByCategory } from '$lib/server/db/videos';

/**
 * GET /api/videos
 * Returns all videos, optionally filtered by category
 * Query params:
 *   - category: filter by category (optional)
 *   - grouped: return videos grouped by category (optional, default false)
 */
export const GET: RequestHandler = async ({ url, platform }) => {
	const db = platform?.env.DB;

	if (!db) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	const category = url.searchParams.get('category') || undefined;
	const grouped = url.searchParams.get('grouped') === 'true';

	try {
		if (grouped) {
			const videosByCategory = await getVideosByCategory(db);
			return json({ success: true, data: videosByCategory });
		}

		const result = await getVideos(db, category);
		return json({ success: true, data: result });
	} catch (error) {
		console.error('Error fetching videos:', error);
		return json({ error: 'Failed to fetch videos' }, { status: 500 });
	}
};
