import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDBFromPlatform } from '$lib/server/d1-compat';
import { getFeaturedCatalogVideos } from '$lib/server/db/videos';

/**
 * GET /api/v1/catalog/featured?limit=6
 * Public curated set for marketing / featured sections.
 */
export const GET: RequestHandler = async ({ url, platform }) => {
	const db = getDBFromPlatform(platform);

	const limitParam = url.searchParams.get('limit');
	const limit = limitParam ? Number.parseInt(limitParam, 10) : 6;

	const rows = await getFeaturedCatalogVideos(db, Number.isFinite(limit) ? limit : 6);

	return json({
		success: true,
		data: {
			videos: rows.map((row) => ({
				seriesTitle: row.seriesTitle,
				seriesSlug: row.seriesSlug,
				video: {
					id: row.video.id,
					title: row.video.title,
					tier: row.video.tier,
					episode_number: row.video.episode_number,
					duration_seconds: row.video.duration_seconds,
					duration: row.video.duration,
					thumbnail_path: row.video.thumbnail_path,
					series_id: row.video.series_id
				}
			}))
		}
	});
};

