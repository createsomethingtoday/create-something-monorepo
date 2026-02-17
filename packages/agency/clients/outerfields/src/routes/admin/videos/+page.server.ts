import type { PageServerLoad } from './$types';
import { listAdminSeries } from '$lib/server/db/series';
import { listAdminVideos } from '$lib/server/db/videos';

export const load: PageServerLoad = async ({ platform }) => {
	const db = platform?.env.DB;
	if (!db) {
		return {
			series: [],
			videos: { videos: [], total: 0 }
		};
	}

	const [series, videos] = await Promise.all([
		listAdminSeries(db),
		listAdminVideos(db, { limit: 100 })
	]);

	return {
		series,
		videos
	};
};

