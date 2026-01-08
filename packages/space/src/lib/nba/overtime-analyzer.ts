/**
 * Overtime Performance Tracker
 *
 * Compare regular vs OT performance to identify fatigue patterns and endurance outliers.
 */

import type { PlayByPlayAction, NBAPlayerBoxScore } from './types';

/**
 * Overtime performance differential
 */
export interface OvertimeDifferential {
	playerId: string;
	playerName: string;
	// Regular time stats
	regularFG: number;
	regularFGA: number;
	regularFGPct: number;
	regularPoints: number;
	regularPPP: number; // Points per possession
	// Overtime stats
	overtimeFG: number;
	overtimeFGA: number;
	overtimeFGPct: number;
	overtimePoints: number;
	overtimePPP: number;
	// Differential
	fgPctDiff: number; // Positive = improved in OT
	turnoversRegular: number;
	turnoversOT: number;
	fatigueIndex: number; // 0-100, higher = more fatigued
	enduranceScore: number; // 0-100, higher = better OT performance
	minutesPlayed: number;
}

/**
 * Team overtime performance
 */
export interface TeamOvertimeStats {
	teamId: string;
	teamName: string;
	overtimeWins: number;
	overtimeLosses: number;
	overtimeWinPct: number;
	avgOTPPP: number;
	leagueAvgOTWinPct: number; // For comparison
}

/**
 * Separate play-by-play actions into regular and OT periods
 */
export function separatePeriods(pbpActions: PlayByPlayAction[]): {
	regular: PlayByPlayAction[];
	overtime: PlayByPlayAction[];
} {
	const regular = pbpActions.filter((a) => a.period <= 4);
	const overtime = pbpActions.filter((a) => a.period > 4);
	return { regular, overtime };
}

/**
 * Calculate player stats from PBP actions
 */
function calculatePlayerStats(playerId: string, actions: PlayByPlayAction[]): {
	fg: number;
	fga: number;
	points: number;
	turnovers: number;
	possessions: number;
} {
	const playerActions = actions.filter((a) => a.playerId === playerId);

	let fg = 0;
	let fga = 0;
	let points = 0;
	let turnovers = 0;

	for (const action of playerActions) {
		if (action.actionType === 'shot') {
			fga++;
			if (action.shotResult === 'made') {
				fg++;
				const isThree = action.shotDistance && action.shotDistance >= 23.75;
				points += isThree ? 3 : 2;
			}
		} else if (action.actionType === 'freethrow' && action.shotResult === 'made') {
			points += 1;
		} else if (action.actionType === 'turnover') {
			turnovers++;
		}
	}

	// Estimate possessions (very rough: ~1 possession per 20 seconds of game time)
	const possessions = Math.max(1, Math.floor(playerActions.length / 3));

	return { fg, fga, points, turnovers, possessions };
}

/**
 * Calculate overtime differential for a player
 */
export function calculateOTDifferential(
	playerId: string,
	playerName: string,
	pbpActions: PlayByPlayAction[],
	minutesPlayed: number
): OvertimeDifferential {
	const { regular, overtime } = separatePeriods(pbpActions);

	const regStats = calculatePlayerStats(playerId, regular);
	const otStats = calculatePlayerStats(playerId, overtime);

	const regFGPct = regStats.fga > 0 ? regStats.fg / regStats.fga : 0;
	const otFGPct = otStats.fga > 0 ? otStats.fg / otStats.fga : 0;
	const fgPctDiff = otFGPct - regFGPct;

	const regPPP = regStats.possessions > 0 ? regStats.points / regStats.possessions : 0;
	const otPPP = otStats.possessions > 0 ? otStats.points / otStats.possessions : 0;

	// Fatigue index: measures performance decline
	// Factors: FG% drop, turnover increase, scoring efficiency drop
	const fgDrop = Math.max(0, -fgPctDiff) * 40; // 0-40 pts
	const toIncrease = Math.max(0, (otStats.turnovers - regStats.turnovers) * 10); // 0-30 pts
	const pppDrop = Math.max(0, (regPPP - otPPP) / regPPP) * 30; // 0-30 pts
	const fatigueIndex = Math.min(100, Math.round(fgDrop + toIncrease + pppDrop));

	// Endurance score: opposite of fatigue, bonus for maintaining/improving performance
	const enduranceScore = Math.max(0, 100 - fatigueIndex);

	return {
		playerId,
		playerName,
		regularFG: regStats.fg,
		regularFGA: regStats.fga,
		regularFGPct: regFGPct,
		regularPoints: regStats.points,
		regularPPP: regPPP,
		overtimeFG: otStats.fg,
		overtimeFGA: otStats.fga,
		overtimeFGPct: otFGPct,
		overtimePoints: otStats.points,
		overtimePPP: otPPP,
		fgPctDiff,
		turnoversRegular: regStats.turnovers,
		turnoversOT: otStats.turnovers,
		fatigueIndex,
		enduranceScore,
		minutesPlayed,
	};
}

/**
 * Calculate team overtime performance
 */
export function calculateTeamOvertimeStats(
	teamId: string,
	teamName: string,
	games: Array<{ wentToOT: boolean; won: boolean }>
): TeamOvertimeStats {
	const otGames = games.filter((g) => g.wentToOT);
	const wins = otGames.filter((g) => g.won).length;
	const losses = otGames.length - wins;
	const winPct = otGames.length > 0 ? wins / otGames.length : 0;

	// League average OT win% is ~50% by definition (zero-sum)
	const leagueAvgOTWinPct = 0.5;

	return {
		teamId,
		teamName,
		overtimeWins: wins,
		overtimeLosses: losses,
		overtimeWinPct: winPct,
		avgOTPPP: 1.08, // Placeholder: would need actual OT possession data
		leagueAvgOTWinPct,
	};
}

/**
 * Get fatigue description
 */
export function getFatigueDescription(fatigueIndex: number): string {
	if (fatigueIndex >= 70) return 'Heavily fatigued - significant performance drop';
	if (fatigueIndex >= 50) return 'Moderate fatigue - noticeable decline';
	if (fatigueIndex >= 30) return 'Slight fatigue - minor impact';
	return 'No fatigue - maintained or improved performance';
}

/**
 * Get endurance category
 */
export function getEnduranceCategory(enduranceScore: number): 'elite' | 'good' | 'average' | 'poor' {
	if (enduranceScore >= 70) return 'elite';
	if (enduranceScore >= 55) return 'good';
	if (enduranceScore >= 40) return 'average';
	return 'poor';
}

/**
 * Format OT differential for display
 */
export function formatOTDifferential(diff: OvertimeDifferential): string {
	const fgPctChange = ((diff.fgPctDiff * 100).toFixed(1));
	const direction = diff.fgPctDiff >= 0 ? '+' : '';
	return `${diff.playerName}: ${direction}${fgPctChange}% FG in OT, Endurance: ${diff.enduranceScore}/100`;
}
