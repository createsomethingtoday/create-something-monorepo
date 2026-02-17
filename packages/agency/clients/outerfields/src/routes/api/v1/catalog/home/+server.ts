import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getHomeCatalogRows } from '$lib/server/db/videos';

function safeParseJsonArray(value: string | null | undefined): string[] {
	if (!value) return [];
	try {
		const parsed = JSON.parse(value) as unknown;
		if (!Array.isArray(parsed)) return [];
		return parsed.filter((entry) => typeof entry === 'string') as string[];
	} catch {
		return [];
	}
}

/**
 * GET /api/v1/catalog/home
 * Public catalog endpoint used by the home page.
 *
 * Returns published series rows (ordered by series.sort_order) with published+ready videos.
 */
export const GET: RequestHandler = async ({ platform }) => {
	const db = platform?.env.DB;
	if (!db) {
		return json({ success: false, error: 'Database not available' }, { status: 500 });
	}

	const rows = await getHomeCatalogRows(db);

	return json({
		success: true,
		data: {
			rows: rows.map((row) => ({
				series: {
					id: row.series.id,
					slug: row.series.slug,
					title: row.series.title,
					description: row.series.description,
					sortOrder: row.series.sort_order,
					homeFilters: safeParseJsonArray(row.series.home_filters)
				},
				videos: row.videos.map((video) => ({
					id: video.id,
					title: video.title,
					tier: video.tier,
					episode_number: video.episode_number,
					duration_seconds: video.duration_seconds,
					duration: video.duration,
					thumbnail_path: video.thumbnail_path,
					series_id: video.series_id
				}))
			}))
		}
	});
};

