import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getVideoById, getVideos } from '$lib/server/db/videos';

/**
 * GET /api/videos/[id]/related
 *
 * Returns related videos for the watch page sidebar.
 * Algorithm:
 * 1. Same category, different episodes (ordered by episode_number)
 * 2. Other categories as fallback
 * 3. Excludes the current video
 */
export const GET: RequestHandler = async ({ params, platform, url }) => {
	const db = platform?.env.DB;

	if (!db) {
		return json({ success: false, error: 'Database not available' }, { status: 500 });
	}

	const { id } = params;
	const limit = parseInt(url.searchParams.get('limit') ?? '12');
	const includeSameCategory = url.searchParams.get('sameCategory') !== 'false';
	const includeOther = url.searchParams.get('other') !== 'false';

	if (!id) {
		return json({ success: false, error: 'Video ID is required' }, { status: 400 });
	}

	try {
		// Get the current video to find its category
		const currentVideo = await getVideoById(db, id);

		if (!currentVideo) {
			return json({ success: false, error: 'Video not found' }, { status: 404 });
		}

		// Fetch all videos
		const { videos: allVideos } = await getVideos(db);

		// Same category videos (excluding current)
		const sameCategory = includeSameCategory
			? allVideos
					.filter(v => v.category === currentVideo.category && v.id !== id)
					.sort((a, b) => {
						// Sort by episode number if available
						const aEp = a.episode_number ?? 999;
						const bEp = b.episode_number ?? 999;
						return aEp - bEp;
					})
					.slice(0, Math.ceil(limit * 0.6))
			: [];

		// Other category videos
		const otherCategories = includeOther
			? allVideos
					.filter(v => v.category !== currentVideo.category)
					.slice(0, limit - sameCategory.length)
			: [];

		// Determine next/previous in series
		const seriesVideos = allVideos
			.filter(v => v.category === currentVideo.category)
			.sort((a, b) => (a.episode_number ?? 999) - (b.episode_number ?? 999));

		const currentIndex = seriesVideos.findIndex(v => v.id === id);
		const nextInSeries = currentIndex >= 0 && currentIndex < seriesVideos.length - 1
			? seriesVideos[currentIndex + 1]
			: null;
		const prevInSeries = currentIndex > 0
			? seriesVideos[currentIndex - 1]
			: null;

		return json({
			success: true,
			data: {
				sameCategory,
				otherCategories,
				nextInSeries,
				prevInSeries,
				total: sameCategory.length + otherCategories.length
			}
		});
	} catch (err) {
		console.error('Error fetching related videos:', err);
		return json({ success: false, error: 'Failed to fetch related videos' }, { status: 500 });
	}
};
