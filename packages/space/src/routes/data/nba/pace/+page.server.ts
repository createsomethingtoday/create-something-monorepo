import { fetchGamesWithStats } from '$lib/nba/api';
import type { PageServerLoad } from './$types';
import type { TeamStats } from '$lib/nba/types';

interface PaceData {
	teamName: string;
	pace: number;
	pointsPerPossession: number;
	possessions: number;
	points: number;
}

/**
 * Calculate possessions using simplified formula (without offensive rebounds)
 * Possessions ≈ FGA + 0.44 × FTA + TOV
 *
 * Note: Full formula includes offensive rebounds (FGA + 0.44 × FTA - ORB + TOV)
 * but TeamStats only has total rebounds, not offensive rebounds separately.
 */
function calculatePossessions(stats: TeamStats, points: number): number {
	const fga = stats.fieldGoalsAttempted;
	const fta = stats.freeThrowsAttempted;
	const tov = stats.turnovers;

	// Simplified possessions formula
	const possessions = fga + 0.44 * fta + tov;

	return possessions > 0 ? possessions : 0;
}

export const load: PageServerLoad = async ({ url, depends }) => {
	depends('pace:data');

	const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];

	// Fetch games with box score stats
	const result = await fetchGamesWithStats(date);

	// Check if any games are live
	const hasLiveGames = result.success
		? result.data.some((g) => g.status === 'live')
		: false;

	// Calculate pace data from completed games with stats
	const paceData: PaceData[] = [];

	if (result.success) {
		for (const game of result.data) {
			// Only include games with complete stats
			if (game.status === 'final' && game.homeStats && game.awayStats) {
				// Calculate home team pace
				const homePossessions = calculatePossessions(game.homeStats, game.homeScore);
				if (homePossessions > 0) {
					paceData.push({
						teamName: `${game.homeTeam.city} ${game.homeTeam.name}`,
						pace: homePossessions,
						pointsPerPossession: game.homeScore / homePossessions,
						possessions: homePossessions,
						points: game.homeScore
					});
				}

				// Calculate away team pace
				const awayPossessions = calculatePossessions(game.awayStats, game.awayScore);
				if (awayPossessions > 0) {
					paceData.push({
						teamName: `${game.awayTeam.city} ${game.awayTeam.name}`,
						pace: awayPossessions,
						pointsPerPossession: game.awayScore / awayPossessions,
						possessions: awayPossessions,
						points: game.awayScore
					});
				}
			}
		}

		// Sort by pace (highest first)
		paceData.sort((a, b) => b.pace - a.pace);
	}

	return {
		date,
		paceData,
		hasLiveGames,
	};
};
