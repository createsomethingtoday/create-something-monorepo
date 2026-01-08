/**
 * Pace and Tempo Analyzer
 *
 * Calculate possessions per game and pace factor from play-by-play and box score data.
 * Uses the standard NBA pace formula.
 */

import type { PlayByPlayAction, NBAPlayerBoxScore } from './types';

// League average constants (2024-25 season estimates)
const LEAGUE_AVG_PACE = 99.5; // Possessions per 48 minutes
const LEAGUE_AVG_PPP = 1.12; // Points per possession

/**
 * Team box score stats aggregated from player box scores
 */
export interface TeamBoxStats {
	teamId: string;
	fieldGoalsAttempted: number;
	freeThrowsAttempted: number;
	offensiveRebounds: number;
	turnovers: number;
	points: number;
}

/**
 * Pace calculation result
 */
export interface PaceResult {
	possessions: number;
	pacePerGame: number; // Possessions per 48 minutes
	pointsPerPossession: number;
	// Context
	leagueAvgPace: number;
	paceCategory: 'fast' | 'average' | 'slow';
	// Component breakdown for explainability
	components: {
		fieldGoalsAttempted: number;
		freeThrowsAttempted: number;
		offensiveRebounds: number;
		turnovers: number;
	};
}

/**
 * Calculate possessions using standard NBA formula
 *
 * Formula: Possessions = FGA + 0.44 × FTA - ORB + TOV
 *
 * Where:
 * - FGA: Field goal attempts
 * - FTA: Free throw attempts
 * - ORB: Offensive rebounds (possessions extended)
 * - TOV: Turnovers (possessions ended)
 *
 * The 0.44 coefficient on FTA accounts for the fact that not all free throws
 * end a possession (e.g., and-1 situations, technical fouls).
 */
export function calculatePossessions(stats: TeamBoxStats): number {
	return (
		stats.fieldGoalsAttempted +
		0.44 * stats.freeThrowsAttempted -
		stats.offensiveRebounds +
		stats.turnovers
	);
}

/**
 * Calculate pace from team box score stats
 *
 * @param homeStats - Home team box score stats
 * @param awayStats - Away team box score stats
 * @param periodsPlayed - Number of periods (4 for regulation, 5+ for OT)
 * @returns Pace calculation result
 */
export function calculatePace(
	homeStats: TeamBoxStats,
	awayStats: TeamBoxStats,
	periodsPlayed: number = 4
): PaceResult {
	// Calculate possessions for each team
	const homePossessions = calculatePossessions(homeStats);
	const awayPossessions = calculatePossessions(awayStats);

	// Average possessions (game possessions)
	const possessions = (homePossessions + awayPossessions) / 2;

	// Calculate pace per 48 minutes
	// Each period is 12 minutes, so periodsPlayed * 12 = total minutes
	const totalMinutes = periodsPlayed * 12;
	const pacePerGame = (possessions / totalMinutes) * 48;

	// Calculate points per possession (offensive efficiency)
	const totalPoints = homeStats.points + awayStats.points;
	const pointsPerPossession = possessions > 0 ? totalPoints / (possessions * 2) : 0;

	// Categorize pace
	let paceCategory: PaceResult['paceCategory'];
	if (pacePerGame > 105) {
		paceCategory = 'fast';
	} else if (pacePerGame < 95) {
		paceCategory = 'slow';
	} else {
		paceCategory = 'average';
	}

	return {
		possessions,
		pacePerGame,
		pointsPerPossession,
		leagueAvgPace: LEAGUE_AVG_PACE,
		paceCategory,
		components: {
			fieldGoalsAttempted: (homeStats.fieldGoalsAttempted + awayStats.fieldGoalsAttempted) / 2,
			freeThrowsAttempted: (homeStats.freeThrowsAttempted + awayStats.freeThrowsAttempted) / 2,
			offensiveRebounds: (homeStats.offensiveRebounds + awayStats.offensiveRebounds) / 2,
			turnovers: (homeStats.turnovers + awayStats.turnovers) / 2,
		},
	};
}

/**
 * Extract team box stats from player box scores
 *
 * Aggregates individual player stats into team totals.
 * Handles incomplete data gracefully (missing values treated as 0).
 */
export function aggregateTeamStats(
	players: NBAPlayerBoxScore[],
	teamId: string
): TeamBoxStats {
	let fieldGoalsAttempted = 0;
	let freeThrowsAttempted = 0;
	let offensiveRebounds = 0;
	let turnovers = 0;
	let points = 0;

	for (const player of players) {
		if (!player.statistics) continue;

		fieldGoalsAttempted += player.statistics.fieldGoalsAttempted || 0;
		freeThrowsAttempted += player.statistics.freeThrowsAttempted || 0;
		// Note: NBA box scores typically only have total rebounds, not offensive rebounds
		// We'll estimate ORB as 25% of total rebounds (league average split)
		const totalRebounds = player.statistics.reboundsTotal || 0;
		offensiveRebounds += totalRebounds * 0.25;
		turnovers += player.statistics.turnovers || 0;
		points += player.statistics.points || 0;
	}

	return {
		teamId,
		fieldGoalsAttempted,
		freeThrowsAttempted,
		offensiveRebounds: Math.round(offensiveRebounds), // Round to whole number
		turnovers,
		points,
	};
}

/**
 * Calculate pace from play-by-play actions (alternative method)
 *
 * This is a fallback method when box scores aren't available.
 * Counts possessions directly from PBP actions.
 *
 * @param actions - Play-by-play actions
 * @param periodsPlayed - Number of periods
 * @returns Pace result (simplified, without component breakdown)
 */
export function calculatePaceFromPBP(
	actions: PlayByPlayAction[],
	periodsPlayed: number = 4
): Pick<PaceResult, 'possessions' | 'pacePerGame' | 'pointsPerPossession' | 'leagueAvgPace' | 'paceCategory'> {
	// Count possession-ending events
	const possessionEnders = actions.filter((a) =>
		['shot', 'turnover', 'freethrow'].includes(a.actionType)
	);

	// Estimate possessions (rough approximation)
	// Each team gets roughly equal possessions
	const possessions = possessionEnders.length / 2;

	// Calculate pace per 48 minutes
	const totalMinutes = periodsPlayed * 12;
	const pacePerGame = (possessions / totalMinutes) * 48;

	// Get final score from last action
	const lastAction = actions[actions.length - 1];
	const totalPoints = lastAction ? lastAction.scoreHome + lastAction.scoreAway : 0;
	const pointsPerPossession = possessions > 0 ? totalPoints / (possessions * 2) : 0;

	// Categorize pace
	let paceCategory: PaceResult['paceCategory'];
	if (pacePerGame > 105) {
		paceCategory = 'fast';
	} else if (pacePerGame < 95) {
		paceCategory = 'slow';
	} else {
		paceCategory = 'average';
	}

	return {
		possessions,
		pacePerGame,
		pointsPerPossession,
		leagueAvgPace: LEAGUE_AVG_PACE,
		paceCategory,
	};
}

/**
 * Format pace for display
 */
export function formatPace(pace: number): string {
	return pace.toFixed(1);
}

/**
 * Format points per possession for display
 */
export function formatPPP(ppp: number): string {
	return ppp.toFixed(2);
}

/**
 * Get pace comparison text
 */
export function getPaceComparison(pacePerGame: number, leagueAvg: number): string {
	const diff = pacePerGame - leagueAvg;
	const absDiff = Math.abs(diff);

	if (absDiff < 2) {
		return 'league average';
	}

	const direction = diff > 0 ? 'faster' : 'slower';
	return `${absDiff.toFixed(1)} possessions ${direction} than league average`;
}
