import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDBFromPlatform } from '$lib/server/d1-compat';
import { getVideos, getVideosByCategory } from '$lib/server/db/videos';
import { filterPubliclyPlayable } from '$lib/server/video-availability';

/**
 * GET /api/videos
 * Returns all videos, optionally filtered by category
 * Query params:
 *   - category: filter by category (optional)
 *   - grouped: return videos grouped by category (optional, default false)
 */
export const GET: RequestHandler = async ({ url, platform }) => {
	const db = getDBFromPlatform(platform);

	const category = url.searchParams.get('category') || undefined;
	const grouped = url.searchParams.get('grouped') === 'true';

	try {
		if (grouped) {
			const videosByCategory = await getVideosByCategory(db);
			const filteredByCategory = Object.fromEntries(
				Object.entries(videosByCategory)
					.map(([categoryName, videos]) => [categoryName, filterPubliclyPlayable(videos)])
					.filter(([, videos]) => videos.length > 0)
			);
			return json({ success: true, data: filteredByCategory });
		}

		const result = await getVideos(db, category);
		const videos = filterPubliclyPlayable(result.videos);
		return json({
			success: true,
			data: {
				videos,
				total: videos.length
			}
		});
	} catch (error) {
		console.error('Error fetching videos:', error);
		return json({ error: 'Failed to fetch videos' }, { status: 500 });
	}
};
