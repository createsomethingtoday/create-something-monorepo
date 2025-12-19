import type { PageServerLoad } from './$types';
import { getAirtableClient } from '$lib/server/airtable';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals, platform }) => {
	if (!locals.user?.email) {
		throw error(401, 'Unauthorized');
	}

	if (!platform?.env) {
		throw error(500, 'Server configuration error');
	}

	try {
		const airtable = getAirtableClient(platform.env);

		// Fetch analytics data in parallel
		const [categories, leaderboard] = await Promise.all([
			airtable.getCategoryPerformance(),
			airtable.getLeaderboard(20)
		]);

		// Calculate summary stats
		const totalCategoryRevenue = categories.reduce((sum, c) => sum + c.revenue, 0);
		const totalTemplates = categories.reduce((sum, c) => sum + c.count, 0);
		const topCategory = categories.length > 0 ? categories[0] : null;

		const leaderboardRevenue = leaderboard.reduce((sum, t) => sum + t.revenue, 0);
		const leaderboardPurchases = leaderboard.reduce((sum, t) => sum + t.purchases, 0);

		return {
			user: locals.user,
			categories,
			leaderboard,
			summary: {
				totalCategories: categories.length,
				totalCategoryRevenue,
				totalTemplates,
				topCategory: topCategory?.category || 'N/A',
				leaderboardCount: leaderboard.length,
				leaderboardRevenue,
				leaderboardPurchases
			}
		};
	} catch (err) {
		console.error('Failed to load marketplace insights:', err);
		throw error(500, 'Failed to load marketplace insights');
	}
};
