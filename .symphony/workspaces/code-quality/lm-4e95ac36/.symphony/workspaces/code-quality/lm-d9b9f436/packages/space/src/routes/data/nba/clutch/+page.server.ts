import type { ClutchStats } from '$lib/nba/clutch-calculator';
import { fetchGamesWithStats } from '$lib/nba/api';
import type { PageServerLoad } from './$types';
import type { Game } from '$lib/nba/types';

/**
 * Identify "clutch games" - games decided by 5 points or less
 * Without PBP data, we use final margin as a proxy for clutch situations
 */
function isClutchGame(game: Game): boolean {
	if (game.status !== 'final') return false;
	const margin = Math.abs(game.homeScore - game.awayScore);
	return margin <= 5;
}

/**
 * Calculate a simple "clutch value" metric from box score stats
 * Points + (Assists × 2) + (Steals × 3) - (Turnovers × 2)
 * Only includes players from close games
 */
function calculateClutchValue(points: number, assists: number, steals: number, turnovers: number): number {
	return points + (assists * 2) + (steals * 3) - (turnovers * 2);
}

/**
 * Convert box score stats to ClutchStats interface
 * Note: This is a simplified version using overall game stats
 * Full implementation requires PBP data to isolate last 2 minutes
 */
function createClutchStatsFromBoxScore(
	playerId: string,
	playerName: string,
	stats: any
): ClutchStats {
	const fgPct = stats.fieldGoalsAttempted > 0
		? stats.fieldGoalsMade / stats.fieldGoalsAttempted
		: 0;
	const fg3Pct = stats.threePointersAttempted > 0
		? stats.threePointersMade / stats.threePointersAttempted
		: 0;
	const astToRatio = stats.turnovers > 0
		? stats.assists / stats.turnovers
		: stats.assists;

	// Simplified ice-in-veins rating based on overall game performance
	// Full version would use only clutch-time stats
	const fgScore = fgPct * 30;
	const scoringScore = Math.min(stats.points / 10, 1) * 25;
	const assistScore = Math.min(stats.assists / 3, 1) * 20;
	const plusMinusScore = Math.max(0, Math.min((stats.plusMinusPoints + 10) / 20, 1)) * 15;
	const astToScore = Math.min(astToRatio / 3, 1) * 10;
	const iceInVeinsRating = Math.round(fgScore + scoringScore + assistScore + plusMinusScore + astToScore);

	return {
		playerId,
		playerName,
		fieldGoalsMade: stats.fieldGoalsMade,
		fieldGoalsAttempted: stats.fieldGoalsAttempted,
		fieldGoalPercentage: fgPct,
		threePointersMade: stats.threePointersMade,
		threePointersAttempted: stats.threePointersAttempted,
		threePointPercentage: fg3Pct,
		assists: stats.assists,
		turnovers: stats.turnovers,
		assistToTurnoverRatio: astToRatio,
		pointsScored: stats.points,
		freeThrowsMade: stats.freeThrowsMade,
		freeThrowsAttempted: stats.freeThrowsAttempted,
		possessions: Math.max(1, stats.fieldGoalsAttempted + stats.turnovers),
		minutesPlayed: parseFloat(stats.minutes) || 0,
		plusMinus: stats.plusMinusPoints,
		iceInVeinsRating
	};
}

export const load: PageServerLoad = async ({ url, depends }) => {
	depends('clutch:data');

	const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];

	// Fetch games with box score stats
	const result = await fetchGamesWithStats(date);

	// Check if any games are live
	const hasLiveGames = result.success
		? result.data.some((g) => g.status === 'live')
		: false;

	const clutchStats: ClutchStats[] = [];
	let totalClutchSituations = 0;

	if (result.success) {
		// Filter for clutch games (decided by 5 points or less)
		const clutchGames = result.data.filter(isClutchGame);
		totalClutchSituations = clutchGames.length;

		// Collect all players from clutch games
		const playerStatsMap = new Map<string, { name: string; stats: any; clutchValue: number }>();

		for (const game of clutchGames) {
			// Get box scores if available
			const boxScoreResult = await import('$lib/nba/api').then(m =>
				m.fetchGameBoxScore(game.id)
			);

			if (!boxScoreResult.success) continue;

			const allPlayers = [...boxScoreResult.data.home, ...boxScoreResult.data.away];

			for (const player of allPlayers) {
				if (!player.stats || parseFloat(player.stats.minutes) === 0) continue;

				const clutchValue = calculateClutchValue(
					player.stats.points,
					player.stats.assists,
					player.stats.steals,
					player.stats.turnovers
				);

				// Aggregate stats if player appears in multiple clutch games
				const existing = playerStatsMap.get(player.id);
				if (existing) {
					// Average the stats
					const oldStats = existing.stats;
					const newStats = player.stats;
					playerStatsMap.set(player.id, {
						name: player.name,
						stats: {
							...newStats,
							points: (oldStats.points + newStats.points) / 2,
							assists: (oldStats.assists + newStats.assists) / 2,
							steals: (oldStats.steals + newStats.steals) / 2,
							turnovers: (oldStats.turnovers + newStats.turnovers) / 2,
							fieldGoalsMade: (oldStats.fieldGoalsMade + newStats.fieldGoalsMade) / 2,
							fieldGoalsAttempted: (oldStats.fieldGoalsAttempted + newStats.fieldGoalsAttempted) / 2
						},
						clutchValue: existing.clutchValue + clutchValue
					});
				} else {
					playerStatsMap.set(player.id, {
						name: player.name,
						stats: player.stats,
						clutchValue
					});
				}
			}
		}

		// Convert to ClutchStats and sort by clutch value
		clutchStats.push(
			...Array.from(playerStatsMap.entries())
				.sort((a, b) => b[1].clutchValue - a[1].clutchValue)
				.slice(0, 50) // Top 50 performers
				.map(([playerId, data]) =>
					createClutchStatsFromBoxScore(playerId, data.name, data.stats)
				)
		);
	}

	// Note about data limitations
	const dataNote = totalClutchSituations > 0
		? `Showing top performers from ${totalClutchSituations} close game${totalClutchSituations === 1 ? '' : 's'} (≤5pt margin). Full clutch-time filtering (last 2 minutes) requires play-by-play data (coming soon).`
		: null;

	return {
		date,
		clutchStats,
		totalClutchSituations,
		hasLiveGames,
		dataNote
	};
};
