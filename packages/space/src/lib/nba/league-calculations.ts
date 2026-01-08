/**
 * League-wide NBA Analytics
 *
 * Calculations for league-wide trends and insights across all games.
 * Used by the League Insights page.
 */

import type { Game } from './types';

export interface LeagueInsights {
	averageScoring: number;
	averagePace: number; // Estimated possessions per game
	averageAssists: number;
	average3PtAttempts: number;
	homeWinPercentage: number;
	competitiveBalance: {
		closeGames: number; // Games decided by 5 points or less
		blowouts: number; // Games decided by 20+ points
		competitive: number; // Games decided by 6-19 points
	};
	totalGames: number;
	correlationData: Array<{
		team: string;
		assists: number;
		totalPoints: number;
	}>;
}

/**
 * Calculate league-wide insights from a set of completed games.
 *
 * @param games - Array of completed games
 * @returns League insights with averages, trends, and correlation data
 */
export function calculateLeagueInsights(games: Game[]): LeagueInsights {
	const completedGames = games.filter((g) => g.status === 'final');

	if (completedGames.length === 0) {
		return {
			averageScoring: 0,
			averagePace: 0,
			averageAssists: 0,
			average3PtAttempts: 0,
			homeWinPercentage: 0,
			competitiveBalance: {
				closeGames: 0,
				blowouts: 0,
				competitive: 0,
			},
			totalGames: 0,
			correlationData: [],
		};
	}

	// Calculate averages
	let totalPoints = 0;
	let totalAssists = 0;
	let total3PtAttempts = 0;
	let homeWins = 0;
	let closeGames = 0;
	let blowouts = 0;
	let competitive = 0;

	// Build correlation data (team assists vs total points)
	const correlationData: Array<{ team: string; assists: number; totalPoints: number }> = [];

	for (const game of completedGames) {
		const gameTotal = game.homeScore + game.awayScore;
		const margin = Math.abs(game.homeScore - game.awayScore);

		totalPoints += gameTotal;

		// Competitive balance
		if (margin <= 5) {
			closeGames++;
		} else if (margin >= 20) {
			blowouts++;
		} else {
			competitive++;
		}

		// Home wins
		if (game.homeScore > game.awayScore) {
			homeWins++;
		}

		// Use real stats if available, otherwise estimate
		const homeAssists = game.homeStats?.assists ?? estimateAssists(game.homeScore);
		const awayAssists = game.awayStats?.assists ?? estimateAssists(game.awayScore);

		totalAssists += homeAssists + awayAssists;

		// Add to correlation data
		correlationData.push({
			team: game.homeTeam.abbreviation,
			assists: homeAssists,
			totalPoints: game.homeScore,
		});
		correlationData.push({
			team: game.awayTeam.abbreviation,
			assists: awayAssists,
			totalPoints: game.awayScore,
		});

		// Use real 3PT attempts if available, otherwise estimate
		const home3PtAttempts = game.homeStats?.threePointersAttempted ?? 35;
		const away3PtAttempts = game.awayStats?.threePointersAttempted ?? 35;
		total3PtAttempts += home3PtAttempts + away3PtAttempts;
	}

	const gamesCount = completedGames.length;

	return {
		averageScoring: totalPoints / gamesCount,
		averagePace: 100, // Placeholder - would need play-by-play for accurate pace
		averageAssists: totalAssists / (gamesCount * 2), // Per team
		average3PtAttempts: total3PtAttempts / (gamesCount * 2), // Per team
		homeWinPercentage: (homeWins / gamesCount) * 100,
		competitiveBalance: {
			closeGames,
			blowouts,
			competitive,
		},
		totalGames: gamesCount,
		correlationData,
	};
}

/**
 * Estimate team assists based on total points scored.
 * Uses a correlation factor based on league averages.
 *
 * @param points - Team's total points
 * @returns Estimated assists
 */
function estimateAssists(points: number): number {
	// League average: ~25 assists per team per 110 points
	// Correlation: higher scoring teams tend to have more assists
	const baseAssists = 25;
	const pointsAboveAvg = points - 110;
	const assistBonus = pointsAboveAvg * 0.15; // +1.5 assists per 10 points

	return Math.max(15, Math.round(baseAssists + assistBonus));
}
