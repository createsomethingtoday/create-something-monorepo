/**
 * Blowout and Garbage Time Detector
 *
 * Identify when games become non-competitive and flag inflated stats.
 */

import type { PlayByPlayAction, NBAPlayerBoxScore } from './types';

/**
 * Garbage time detection result
 */
export interface GarbageTimeDetection {
	isBlowout: boolean;
	garbageTimeStart: string | null; // Clock time when garbage time began
	garbageTimePeriod: number | null;
	threshold: number; // Point margin used (default 15)
	finalMargin: number;
	affectedPlayers: string[]; // Player IDs who accumulated stats in garbage time
	inflatedStats: Array<{
		playerId: string;
		playerName: string;
		garbageTimePoints: number;
		garbageTimeMinutes: number;
		reliabilityScore: number; // 0-100, lower = more inflated
	}>;
	competitivenessScore: number; // 0-100, lower = less competitive
}

/**
 * Detect garbage time threshold
 *
 * Algorithm: 15+ point lead with <5 minutes remaining = garbage time
 */
export function detectGarbageTime(
	pbpActions: PlayByPlayAction[],
	threshold: number = 15
): GarbageTimeDetection {
	let garbageTimeStart: string | null = null;
	let garbageTimePeriod: number | null = null;
	let inGarbageTime = false;
	const garbageTimeActions: PlayByPlayAction[] = [];

	// Scan actions in chronological order
	for (const action of pbpActions) {
		const margin = Math.abs(action.scoreHome - action.scoreAway);
		const timeRemaining = getTimeRemaining(action.period, action.clock);

		// Check if we've entered garbage time
		if (!inGarbageTime && margin >= threshold && timeRemaining <= 300) {
			// 300 seconds = 5 minutes
			inGarbageTime = true;
			garbageTimeStart = action.clock;
			garbageTimePeriod = action.period;
		}

		if (inGarbageTime) {
			garbageTimeActions.push(action);
		}
	}

	const isBlowout = garbageTimeStart !== null;
	const finalMargin =
		pbpActions.length > 0
			? Math.abs(
					pbpActions[pbpActions.length - 1].scoreHome - pbpActions[pbpActions.length - 1].scoreAway
			  )
			: 0;

	// Identify players with significant garbage time stats
	const inflatedStats = calculateInflatedStats(garbageTimeActions);
	const affectedPlayers = inflatedStats.map((s) => s.playerId);

	// Competitiveness score: inverse of how early and how large the blowout was
	let competitivenessScore = 100;
	if (isBlowout) {
		const timeRemainingAtBlowout = garbageTimePeriod
			? getTimeRemaining(garbageTimePeriod, garbageTimeStart!)
			: 300;
		const earlinesspenalty = Math.min(40, ((2880 - timeRemainingAtBlowout) / 2880) * 40); // Earlier = worse
		const marginPenalty = Math.min(40, (finalMargin / 40) * 40); // Larger = worse
		competitivenessScore = Math.max(0, 100 - earlinesspenalty - marginPenalty);
	}

	return {
		isBlowout,
		garbageTimeStart,
		garbageTimePeriod,
		threshold,
		finalMargin,
		affectedPlayers,
		inflatedStats,
		competitivenessScore,
	};
}

/**
 * Calculate time remaining in game (in seconds)
 */
function getTimeRemaining(period: number, clock: string): number {
	const parts = clock.split(':');
	const minutes = parseInt(parts[0], 10);
	const seconds = parseInt(parts[1], 10);
	const timeInPeriod = minutes * 60 + seconds;

	// Calculate total time remaining
	// Regulation: 4 periods of 12 minutes = 48 minutes = 2880 seconds
	// Each period = 720 seconds
	const periodsRemaining = Math.max(0, 4 - period);
	const totalRemaining = periodsRemaining * 720 + timeInPeriod;

	return totalRemaining;
}

/**
 * Calculate inflated stats for players in garbage time
 */
function calculateInflatedStats(
	garbageTimeActions: PlayByPlayAction[]
): Array<{
	playerId: string;
	playerName: string;
	garbageTimePoints: number;
	garbageTimeMinutes: number;
	reliabilityScore: number;
}> {
	const playerMap = new Map<
		string,
		{ playerName: string; points: number; actions: number }
	>();

	for (const action of garbageTimeActions) {
		if (!action.playerId) continue;

		const existing = playerMap.get(action.playerId) || {
			playerName: action.playerName,
			points: 0,
			actions: 0,
		};

		// Count points scored
		if (action.actionType === 'shot' && action.shotResult === 'made') {
			const isThree = action.shotDistance && action.shotDistance >= 23.75;
			existing.points += isThree ? 3 : 2;
		} else if (action.actionType === 'freethrow' && action.shotResult === 'made') {
			existing.points += 1;
		}

		existing.actions++;
		playerMap.set(action.playerId, existing);
	}

	const results: Array<{
		playerId: string;
		playerName: string;
		garbageTimePoints: number;
		garbageTimeMinutes: number;
		reliabilityScore: number;
	}> = [];

	for (const [playerId, data] of playerMap.entries()) {
		// Estimate minutes played in garbage time (rough: 1 minute per 4 actions)
		const garbageTimeMinutes = data.actions / 4;

		// Reliability score: 0-100, lower if lots of garbage time stats
		// Players with >5 pts in garbage time get penalized
		const inflationPenalty = Math.min(50, data.points * 5);
		const minutesPenalty = Math.min(30, garbageTimeMinutes * 3);
		const reliabilityScore = Math.max(0, 100 - inflationPenalty - minutesPenalty);

		if (data.points > 0 || garbageTimeMinutes > 1) {
			results.push({
				playerId,
				playerName: data.playerName,
				garbageTimePoints: data.points,
				garbageTimeMinutes,
				reliabilityScore,
			});
		}
	}

	return results.sort((a, b) => b.garbageTimePoints - a.garbageTimePoints);
}

/**
 * Check if a player's stats should be flagged
 */
export function shouldFlagPlayer(playerId: string, detection: GarbageTimeDetection): boolean {
	const playerStat = detection.inflatedStats.find((s) => s.playerId === playerId);
	if (!playerStat) return false;

	// Flag if reliability score is low OR significant garbage time production
	return playerStat.reliabilityScore < 70 || playerStat.garbageTimePoints >= 8;
}

/**
 * Get competitiveness category
 */
export function getCompetitinenessCategory(score: number): string {
	if (score >= 80) return 'highly-competitive';
	if (score >= 60) return 'competitive';
	if (score >= 40) return 'one-sided';
	return 'blowout';
}

/**
 * Format garbage time detection for display
 */
export function formatGarbageTimeDetection(detection: GarbageTimeDetection): string {
	if (!detection.isBlowout) {
		return 'Competitive game - no garbage time detected';
	}

	return `Garbage time started at ${detection.garbageTimeStart} in Q${detection.garbageTimePeriod} (${detection.affectedPlayers.length} players affected)`;
}

/**
 * Get reliability warning text
 */
export function getReliabilityWarning(reliabilityScore: number): string {
	if (reliabilityScore >= 70) return '';
	if (reliabilityScore >= 50) return '⚠️ Some stats from garbage time';
	return '⚠️ Stats heavily inflated by garbage time';
}
