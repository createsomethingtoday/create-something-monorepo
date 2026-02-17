import type { PageServerLoad } from './$types';
import { listAdminSeries } from '$lib/server/db/series';

export const load: PageServerLoad = async ({ platform }) => {
	const db = platform?.env.DB;
	if (!db) {
		return {
			series: []
		};
	}

	const series = await listAdminSeries(db);
	return {
		series
	};
};

