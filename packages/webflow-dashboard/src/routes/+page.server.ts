import type { PageServerLoad } from './$types';
import type { Asset } from '$lib/types';
import { getAirtableClient } from '$lib/server/airtable';

interface DashboardStats {
	totalAssets: number;
	publishedAssets: number;
	inReviewAssets: number;
	totalRevenue: number;
}

export const load: PageServerLoad = async ({ locals, platform }) => {
	let stats: DashboardStats = {
		totalAssets: 0,
		publishedAssets: 0,
		inReviewAssets: 0,
		totalRevenue: 0
	};

	let assets: Asset[] = [];

	if (locals.user?.email && platform?.env) {
		try {
			const airtable = getAirtableClient(platform.env);
			assets = await airtable.getAssetsByEmail(locals.user.email, { limit: 6 });

			// Calculate stats from assets
			stats = {
				totalAssets: assets.length,
				publishedAssets: assets.filter(a => a.status === 'Published').length,
				inReviewAssets: assets.filter(a => a.status === 'Scheduled' || a.status === 'Upcoming').length,
				totalRevenue: assets.reduce((sum, a) => sum + (a.cumulativeRevenue ?? 0), 0)
			};
		} catch (error) {
			console.error('Failed to load dashboard data:', error);
		}
	}

	return {
		user: locals.user,
		stats,
		assets
	};
};
