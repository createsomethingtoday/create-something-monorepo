import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import {
	composeMarketplaceData,
	type CategoriesResponse,
	type LeaderboardResponse
} from '$lib/marketplace-insights';

export const load: PageServerLoad = async ({ parent, fetch }) => {
	const { user, hasTemplateAsset } = await parent();

	if (!user) {
		throw redirect(302, '/login');
	}

	if (!hasTemplateAsset) {
		throw redirect(302, '/dashboard');
	}

	try {
		const [leaderboardRes, categoriesRes] = await Promise.all([
			fetch('/api/analytics/leaderboard'),
			fetch('/api/analytics/categories')
		]);

		if (!leaderboardRes.ok || !categoriesRes.ok) {
			throw new Error('Failed to load marketplace data');
		}

		const [leaderboardData, categoriesData] = await Promise.all([
			leaderboardRes.json() as Promise<LeaderboardResponse>,
			categoriesRes.json() as Promise<CategoriesResponse>
		]);

		return {
			marketplaceData: composeMarketplaceData(leaderboardData, categoriesData),
			marketplaceError: null
		};
	} catch (err) {
		console.error('Marketplace page load error:', err);
		return {
			marketplaceData: null,
			marketplaceError: err instanceof Error ? err.message : 'Failed to load marketplace data'
		};
	}
};
