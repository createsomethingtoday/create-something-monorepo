/**
 * Clutch Performance Calculator
 *
 * Track player and team performance in high-pressure situations
 * (last 2 minutes of close games with ≤5 point margin).
 */

import type { PlayByPlayAction, NBAPlayerBoxScore } from './types';

/**
 * Clutch performance statistics
 */
export interface ClutchStats {
	playerId: string;
	playerName: string;
	// Shooting
	fieldGoalsMade: number;
	fieldGoalsAttempted: number;
	fieldGoalPercentage: number;
	threePointersMade: number;
	threePointersAttempted: number;
	threePointPercentage: number;
	// Playmaking
	assists: number;
	turnovers: number;
	assistToTurnoverRatio: number;
	// Scoring
	pointsScored: number;
	freeThrowsMade: number;
	freeThrowsAttempted: number;
	// Context
	possessions: number;
	minutesPlayed: number;
	plusMinus: number;
	// Composite rating
	iceInVeinsRating: number; // 0-100
}

/**
 * Team clutch performance
 */
export interface TeamClutchStats {
	teamId: string;
	teamName: string;
	wins: number;
	losses: number;
	winPercentage: number;
	avgPointsScored: number;
	avgPointsAllowed: number;
	totalClutchPossessions: number;
}

/**
 * Clutch situation details
 */
export interface ClutchSituation {
	gameId: string;
	period: number;
	clockStart: string;
	clockEnd: string;
	scoreMargin: number;
	isOvertime: boolean;
	actions: PlayByPlayAction[];
}

/**
 * Calculate score margin from home/away scores
 */
function getScoreMargin(scoreHome: number, scoreAway: number): number {
	return Math.abs(scoreHome - scoreAway);
}

/**
 * Check if a moment qualifies as clutch time
 *
 * Clutch = last 2 minutes of game (or OT) with score within threshold
 */
export function isClutchTime(
	period: number,
	clock: string,
	scoreHome: number,
	scoreAway: number,
	threshold: number = 5
): boolean {
	// Parse clock (format: "MM:SS" or "M:SS")
	const parts = clock.split(':');
	const minutes = parseInt(parts[0], 10);
	const seconds = parseInt(parts[1], 10);
	const totalSeconds = minutes * 60 + seconds;

	// Last 2 minutes = 120 seconds
	const isLastTwoMinutes = totalSeconds <= 120;

	// Score within threshold
	const scoreMargin = getScoreMargin(scoreHome, scoreAway);
	const isClose = scoreMargin <= threshold;

	return isLastTwoMinutes && isClose;
}

/**
 * Extract clutch situations from play-by-play data
 */
export function extractClutchSituations(
	gameId: string,
	pbpActions: PlayByPlayAction[],
	threshold: number = 5
): ClutchSituation[] {
	const situations: ClutchSituation[] = [];
	const clutchActions: PlayByPlayAction[] = [];

	let currentPeriod = 0;
	let inClutchTime = false;
	let clutchStart: string | null = null;

	for (const action of pbpActions) {
		// New period
		if (action.period !== currentPeriod) {
			// Save previous clutch situation if any
			if (inClutchTime && clutchActions.length > 0) {
				const lastAction = clutchActions[clutchActions.length - 1];
				situations.push({
					gameId,
					period: currentPeriod,
					clockStart: clutchStart!,
					clockEnd: lastAction.clock,
					scoreMargin: getScoreMargin(lastAction.scoreHome, lastAction.scoreAway),
					isOvertime: currentPeriod > 4,
					actions: [...clutchActions],
				});
				clutchActions.length = 0;
			}

			currentPeriod = action.period;
			inClutchTime = false;
			clutchStart = null;
		}

		const clutch = isClutchTime(
			action.period,
			action.clock,
			action.scoreHome,
			action.scoreAway,
			threshold
		);

		if (clutch && !inClutchTime) {
			// Entering clutch time
			inClutchTime = true;
			clutchStart = action.clock;
		}

		if (clutch) {
			clutchActions.push(action);
		} else if (inClutchTime) {
			// Exited clutch time (score margin too large)
			if (clutchActions.length > 0) {
				const lastAction = clutchActions[clutchActions.length - 1];
				situations.push({
					gameId,
					period: currentPeriod,
					clockStart: clutchStart!,
					clockEnd: lastAction.clock,
					scoreMargin: getScoreMargin(lastAction.scoreHome, lastAction.scoreAway),
					isOvertime: currentPeriod > 4,
					actions: [...clutchActions],
				});
				clutchActions.length = 0;
			}
			inClutchTime = false;
			clutchStart = null;
		}
	}

	// Handle final clutch situation
	if (inClutchTime && clutchActions.length > 0) {
		const lastAction = clutchActions[clutchActions.length - 1];
		situations.push({
			gameId,
			period: currentPeriod,
			clockStart: clutchStart!,
			clockEnd: lastAction.clock,
			scoreMargin: getScoreMargin(lastAction.scoreHome, lastAction.scoreAway),
			isOvertime: currentPeriod > 4,
			actions: clutchActions,
		});
	}

	return situations;
}

/**
 * Calculate clutch stats for a player
 */
export function calculateClutchStats(
	playerId: string,
	playerName: string,
	clutchActions: PlayByPlayAction[]
): ClutchStats {
	const playerActions = clutchActions.filter((a) => a.playerId === playerId);

	let fgm = 0;
	let fga = 0;
	let fg3m = 0;
	let fg3a = 0;
	let ftm = 0;
	let fta = 0;
	let assists = 0;
	let turnovers = 0;
	let points = 0;
	let plusMinus = 0;

	for (const action of playerActions) {
		if (action.actionType === 'shot') {
			fga++;
			const made = action.shotResult === 'made';
			if (made) {
				fgm++;
				// Infer points from shot distance
				const isThree = action.shotDistance && action.shotDistance >= 23.75;
				points += isThree ? 3 : 2;
			}
			if (action.shotDistance && action.shotDistance >= 23.75) {
				fg3a++;
				if (made) fg3m++;
			}
		} else if (action.actionType === 'freethrow') {
			fta++;
			if (action.shotResult === 'made') {
				ftm++;
				points += 1;
			}
		} else if (action.actionType === 'turnover') {
			turnovers++;
		}
	}

	// Plus/minus: track score differential while player is in clutch time
	// Compare first and last action's team score
	if (playerActions.length > 0) {
		const firstAction = playerActions[0];
		const lastAction = playerActions[playerActions.length - 1];
		const teamScoreChange =
			(lastAction.scoreHome + lastAction.scoreAway) - (firstAction.scoreHome + firstAction.scoreAway);
		plusMinus = teamScoreChange; // Simplified
	}

	const fgPct = fga > 0 ? fgm / fga : 0;
	const fg3Pct = fg3a > 0 ? fg3m / fg3a : 0;
	const astToRatio = turnovers > 0 ? assists / turnovers : assists;
	const possessions = Math.floor(playerActions.length / 3); // Rough estimate

	// Ice in veins rating (0-100)
	// Weighted: FG% (30%), Scoring (25%), Assists (20%), +/- (15%), A:TO (10%)
	const fgScore = fgPct * 30;
	const scoringScore = Math.min(points / 10, 1) * 25;
	const assistScore = Math.min(assists / 3, 1) * 20;
	const plusMinusScore = Math.max(0, Math.min((plusMinus + 10) / 20, 1)) * 15;
	const astToScore = Math.min(astToRatio / 3, 1) * 10;

	const iceInVeinsRating = Math.round(
		fgScore + scoringScore + assistScore + plusMinusScore + astToScore
	);

	return {
		playerId,
		playerName,
		fieldGoalsMade: fgm,
		fieldGoalsAttempted: fga,
		fieldGoalPercentage: fgPct,
		threePointersMade: fg3m,
		threePointersAttempted: fg3a,
		threePointPercentage: fg3Pct,
		assists,
		turnovers,
		assistToTurnoverRatio: astToRatio,
		pointsScored: points,
		freeThrowsMade: ftm,
		freeThrowsAttempted: fta,
		possessions,
		minutesPlayed: possessions / 2, // Very rough estimate
		plusMinus,
		iceInVeinsRating,
	};
}

/**
 * Calculate team clutch performance
 */
export function calculateTeamClutchStats(
	teamId: string,
	teamName: string,
	situations: ClutchSituation[]
): TeamClutchStats {
	let wins = 0;
	let losses = 0;
	let totalPointsScored = 0;
	let totalPointsAllowed = 0;
	let totalPossessions = 0;

	for (const situation of situations) {
		const teamActions = situation.actions.filter((a) => a.teamId === teamId);
		const oppActions = situation.actions.filter((a) => a.teamId !== teamId && a.teamId);

		// Count points from shot actions
		const teamPoints = teamActions.reduce((sum, a) => {
			if (a.actionType === 'shot' && a.shotResult === 'made') {
				const isThree = a.shotDistance && a.shotDistance >= 23.75;
				return sum + (isThree ? 3 : 2);
			} else if (a.actionType === 'freethrow' && a.shotResult === 'made') {
				return sum + 1;
			}
			return sum;
		}, 0);

		const oppPoints = oppActions.reduce((sum, a) => {
			if (a.actionType === 'shot' && a.shotResult === 'made') {
				const isThree = a.shotDistance && a.shotDistance >= 23.75;
				return sum + (isThree ? 3 : 2);
			} else if (a.actionType === 'freethrow' && a.shotResult === 'made') {
				return sum + 1;
			}
			return sum;
		}, 0);

		totalPointsScored += teamPoints;
		totalPointsAllowed += oppPoints;
		totalPossessions += Math.floor(situation.actions.length / 4);

		// Determine win/loss from final scores in the situation
		const lastAction = situation.actions[situation.actions.length - 1];
		const finalHomeScore = lastAction.scoreHome;
		const finalAwayScore = lastAction.scoreAway;

		// Assume teamId format matches (simplified)
		if (finalHomeScore > finalAwayScore) wins++;
		else if (finalAwayScore > finalHomeScore) losses++;
	}

	const games = wins + losses;
	const winPct = games > 0 ? wins / games : 0;
	const avgScored = games > 0 ? totalPointsScored / games : 0;
	const avgAllowed = games > 0 ? totalPointsAllowed / games : 0;

	return {
		teamId,
		teamName,
		wins,
		losses,
		winPercentage: winPct,
		avgPointsScored: avgScored,
		avgPointsAllowed: avgAllowed,
		totalClutchPossessions: totalPossessions,
	};
}

/**
 * Get clutch performance comparison text
 */
export function getClutchPerformanceText(rating: number): string {
	if (rating >= 80) return 'Ice in their veins - elite closer';
	if (rating >= 65) return 'Clutch performer - rises to the moment';
	if (rating >= 50) return 'Solid in pressure situations';
	if (rating >= 35) return 'Struggles in clutch time';
	return 'Avoids the ball in crunch time';
}

/**
 * Format clutch stats for display
 */
export function formatClutchStats(stats: ClutchStats): string {
	return `${stats.playerName}: ${stats.pointsScored} PTS, ${stats.assists} AST, ${(stats.fieldGoalPercentage * 100).toFixed(1)}% FG, Ice Rating: ${stats.iceInVeinsRating}`;
}
