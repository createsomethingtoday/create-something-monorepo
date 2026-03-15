import type { PageServerLoad } from './$types';
import { getDBFromPlatform } from '$lib/server/d1-compat';
import { listAdminSeries } from '$lib/server/db/series';

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

export const load: PageServerLoad = async ({ platform }) => {
	const db = getDBFromPlatform(platform);
	const series = await listAdminSeries(db);

	return {
		series: series.map((row) => ({
			...row,
			homeFilters: safeParseJsonArray(row.home_filters)
		}))
	};
};
