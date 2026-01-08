import { fetchGamesWithStats } from '$lib/nba/api';
import type { OvertimeDifferential } from '$lib/nba/overtime-analyzer';
import type { PageServerLoad } from './$types';
import type { Game } from '$lib/nba/types';

/**
 * Detect if a game went to overtime by checking the quarter number
 * NBA regulation = 4 quarters, overtime = period > 4
 */
function wentToOvertime(game: Game): boolean {
	return game.quarter > 4;
}

/**
 * Calculate simplified fatigue index from team performance in OT games
 * Without PBP data separating REG vs OT, we use total game stats as proxy
 * Higher turnovers + lower FG% = higher fatigue
 */
function calculateGameFatigueIndex(game: Game): number {
	if (!game.homeStats || !game.awayStats) return 0;

	// Average both teams' performance
	const avgFGPct = (
		(game.homeStats.fieldGoalsMade + game.awayStats.fieldGoalsMade) /
		Math.max(1, game.homeStats.fieldGoalsAttempted + game.awayStats.fieldGoalsAttempted)
	) * 100;

	const avgTurnovers = (game.homeStats.turnovers + game.awayStats.turnovers) / 2;

	// Simple fatigue metric: lower FG% and higher turnovers = fatigue
	// Scale: 0-100 (higher = more fatigued)
	const fgFatigue = Math.max(0, 50 - avgFGPct); // If FG% < 50%, fatigue increases
	const toFatigue = Math.min(30, avgTurnovers * 2); // Cap at 30 points

	return Math.min(100, Math.round(fgFatigue + toFatigue));
}

/**
 * Create OvertimeDifferential from game data
 * Note: Without PBP data, we show overall game stats
 * Full REG vs OT breakdown requires period-separated data
 */
function createOvertimeDifferentialFromGame(game: Game): OvertimeDifferential {
	const fatigueIndex = calculateGameFatigueIndex(game);
	const enduranceScore = Math.max(0, 100 - fatigueIndex);

	// Use game ID as identifier, include both teams
	const gameInfo = `${game.awayTeam.abbreviation} @ ${game.homeTeam.abbreviation}`;

	// For display purposes, create a synthetic differential
	// showing this was an OT game with its characteristics
	return {
		playerId: game.id,
		playerName: gameInfo,
		// Placeholder values - would be calculated from REG period with PBP
		regularFG: 0,
		regularFGA: 0,
		regularFGPct: 0,
		regularPoints: 0,
		regularPPP: 0,
		// Placeholder values - would be calculated from OT period with PBP
		overtimeFG: 0,
		overtimeFGA: 0,
		overtimeFGPct: 0,
		overtimePoints: 0,
		overtimePPP: 0,
		fgPctDiff: 0,
		turnoversRegular: 0,
		turnoversOT: 0,
		fatigueIndex,
		enduranceScore,
		minutesPlayed: game.quarter * 12, // Rough estimate including OT
		// Add game context as metadata
		gameId: game.id,
		homeTeam: game.homeTeam.abbreviation,
		awayTeam: game.awayTeam.abbreviation,
		homeScore: game.homeScore,
		awayScore: game.awayScore,
		periods: game.quarter
	} as OvertimeDifferential & {
		gameId: string;
		homeTeam: string;
		awayTeam: string;
		homeScore: number;
		awayScore: number;
		periods: number;
	};
}

export const load: PageServerLoad = async ({ url, depends }) => {
	depends('overtime:data');

	const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];

	// Fetch games with stats
	const result = await fetchGamesWithStats(date);

	// Check if any games are live
	const hasLiveGames = result.success
		? result.data.some((g) => g.status === 'live')
		: false;

	const overtimeGames: Array<OvertimeDifferential & { gameId?: string; homeTeam?: string; awayTeam?: string; homeScore?: number; awayScore?: number; periods?: number }> = [];

	if (result.success) {
		// Filter for games that went to overtime
		const otGames = result.data.filter(wentToOvertime);

		// Create differential objects for each OT game
		overtimeGames.push(...otGames.map(createOvertimeDifferentialFromGame));
	}

	// Note about data limitations
	const dataNote = overtimeGames.length > 0
		? `Showing ${overtimeGames.length} overtime game${overtimeGames.length === 1 ? '' : 's'}. Full regulation vs. overtime stat breakdown requires play-by-play data (coming soon). Currently displaying overall game performance metrics.`
		: null;

	return {
		date,
		overtimeGames,
		hasLiveGames,
		dataNote
	};
};
