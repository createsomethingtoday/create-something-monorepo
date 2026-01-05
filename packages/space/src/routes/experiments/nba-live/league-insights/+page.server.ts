import type { PageServerLoad } from './$types';
import { fetchLiveGames } from '$lib/nba/api';
import { calculateLeagueInsights } from '$lib/nba/league-calculations';

export const load: PageServerLoad = async () => {
	// Fetch today's games
	const result = await fetchLiveGames();

	if (!result.success || !result.data) {
		return {
			error: true,
			insights: null,
			timestamp: Date.now(),
		};
	}

	// Calculate league insights
	const insights = calculateLeagueInsights(result.data);

	return {
		error: false,
		insights,
		timestamp: Date.now(),
	};
};
