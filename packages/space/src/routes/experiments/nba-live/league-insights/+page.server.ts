import type { PageServerLoad } from './$types';
import { fetchLiveGames } from '$lib/nba/api';
import { calculateLeagueInsights } from '$lib/nba/league-calculations';

export const load: PageServerLoad = async ({ url }) => {
	const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];

	// Fetch games for the specified date
	const result = await fetchLiveGames(date);

	if (!result.success || !result.data) {
		return {
			error: true,
			insights: null,
			date,
			timestamp: Date.now(),
		};
	}

	// Calculate league insights
	const insights = calculateLeagueInsights(result.data);

	return {
		error: false,
		insights,
		date,
		timestamp: Date.now(),
	};
};
