import type { PageServerLoad } from './$types';
import { fetchGamesWithStats } from '$lib/nba/api';
import { calculateLeagueInsights } from '$lib/nba/league-calculations';
import { env } from '$env/dynamic/private';

export const load: PageServerLoad = async ({ url }) => {
	const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
	const proxyUrl = env.NBA_PROXY_URL;

	// Fetch games with detailed statistics for insights
	const result = await fetchGamesWithStats(date, proxyUrl);

	if (!result.success || !result.data) {
		return {
			error: true,
			insights: null,
			date,
			timestamp: Date.now(),
		};
	}

	// Calculate league insights from games with stats
	const insights = calculateLeagueInsights(result.data);

	return {
		error: false,
		insights,
		date,
		timestamp: Date.now(),
	};
};
