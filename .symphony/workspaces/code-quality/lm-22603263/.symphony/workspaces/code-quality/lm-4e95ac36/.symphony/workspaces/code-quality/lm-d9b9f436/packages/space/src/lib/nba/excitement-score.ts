/**
 * Game Excitement Score Algorithm
 *
 * Auto-detect "Game of the Night" using composite scoring algorithm.
 * Combines competitiveness, star performances, and special circumstances.
 */

import type { NBAGameSummary, NBAPlayerBoxScore } from './types';

/**
 * Excitement score breakdown
 */
export interface ExcitementScore {
	total: number; // 0-100
	components: {
		competitiveness: number; // Close final margin
		leadChanges: number; // Back-and-forth action
		overtime: number; // Extra periods
		starPower: number; // Individual performances
		scoring: number; // Total points excitement
		comebacks: number; // Dramatic rallies
	};
	explanation: string;
}

/**
 * Calculate game excitement score
 *
 * @param game - Game data with final score
 * @param boxScores - Player box scores
 * @param leadChanges - Number of lead changes (from PBP if available)
 * @returns Excitement score 0-100 with component breakdown
 */
export function calculateExcitementScore(
	game: NBAGameSummary,
	boxScores: NBAPlayerBoxScore[],
	leadChanges: number = 0
): ExcitementScore {
	const homeScore = game.homeTeam.score;
	const awayScore = game.awayTeam.score;
	const finalMargin = Math.abs(homeScore - awayScore);
	const totalPoints = homeScore + awayScore;
	const wentToOT = game.period > 4;

	// Component 1: Competitiveness (0-30 points)
	// Closer game = higher score
	let competitiveness = 0;
	if (finalMargin === 0) competitiveness = 30; // Tie (shouldn't happen but handle it)
	else if (finalMargin <= 2) competitiveness = 30;
	else if (finalMargin <= 5) competitiveness = 25;
	else if (finalMargin <= 10) competitiveness = 15;
	else if (finalMargin <= 15) competitiveness = 8;
	else competitiveness = 2;

	// Component 2: Lead changes (0-20 points)
	// More lead changes = more exciting
	let leadChangeScore = 0;
	if (leadChanges >= 15) leadChangeScore = 20;
	else if (leadChanges >= 10) leadChangeScore = 15;
	else if (leadChanges >= 6) leadChangeScore = 10;
	else if (leadChanges >= 3) leadChangeScore = 5;
	// If no PBP data, estimate from final margin
	else if (leadChanges === 0 && finalMargin <= 5) leadChangeScore = 8;

	// Component 3: Overtime bonus (0-20 points)
	const overtimeScore = wentToOT ? 20 : 0;

	// Component 4: Star power (0-15 points)
	// 40+ pt game = +15, 30+ pt game = +10
	let starPowerScore = 0;
	for (const player of boxScores) {
		const pts = player.statistics.points;
		if (pts >= 40) {
			starPowerScore = Math.max(starPowerScore, 15);
			break;
		} else if (pts >= 35) {
			starPowerScore = Math.max(starPowerScore, 12);
		} else if (pts >= 30) {
			starPowerScore = Math.max(starPowerScore, 10);
		}
	}

	// Component 5: Total scoring (0-10 points)
	// High-scoring games are exciting
	let scoringScore = 0;
	if (totalPoints >= 260) scoringScore = 10;
	else if (totalPoints >= 240) scoringScore = 8;
	else if (totalPoints >= 220) scoringScore = 5;
	else if (totalPoints >= 200) scoringScore = 3;

	// Component 6: Comebacks (0-5 points per comeback, max 15)
	// Estimate comebacks from final margin and lead changes
	let comebackScore = 0;
	if (leadChanges >= 10) comebackScore = 15; // Multiple comebacks
	else if (leadChanges >= 6) comebackScore = 10; // A few comebacks
	else if (leadChanges >= 3) comebackScore = 5; // At least one comeback

	// Calculate total (max 100)
	const total = Math.min(
		100,
		competitiveness + leadChangeScore + overtimeScore + starPowerScore + scoringScore + comebackScore
	);

	// Generate explanation
	const explanation = generateExplanation({
		total,
		competitiveness,
		leadChangeScore,
		overtimeScore,
		starPowerScore,
		scoringScore,
		comebackScore,
		finalMargin,
		wentToOT,
		totalPoints,
		leadChanges,
	});

	return {
		total,
		components: {
			competitiveness,
			leadChanges: leadChangeScore,
			overtime: overtimeScore,
			starPower: starPowerScore,
			scoring: scoringScore,
			comebacks: comebackScore,
		},
		explanation,
	};
}

/**
 * Generate human-readable explanation of excitement score
 */
function generateExplanation(data: {
	total: number;
	competitiveness: number;
	leadChangeScore: number;
	overtimeScore: number;
	starPowerScore: number;
	scoringScore: number;
	comebackScore: number;
	finalMargin: number;
	wentToOT: boolean;
	totalPoints: number;
	leadChanges: number;
}): string {
	const parts: string[] = [];

	// Overall rating
	if (data.total >= 85) parts.push('🔥 INSTANT CLASSIC');
	else if (data.total >= 70) parts.push('⭐ Game of the Night candidate');
	else if (data.total >= 55) parts.push('Solid entertainment');
	else if (data.total >= 40) parts.push('Decent game');
	else parts.push('One-sided affair');

	// Key factors
	if (data.wentToOT) parts.push('Went to overtime');
	if (data.finalMargin <= 3) parts.push(`Nail-biter (${data.finalMargin} pt margin)`);
	if (data.leadChanges >= 10) parts.push(`${data.leadChanges} lead changes`);
	if (data.totalPoints >= 240) parts.push(`High-scoring (${data.totalPoints} total pts)`);
	if (data.starPowerScore >= 12) parts.push('Signature star performance');

	return parts.join(' • ');
}

/**
 * Get excitement rating category
 */
export function getExcitementCategory(score: number): string {
	if (score >= 85) return 'instant-classic';
	if (score >= 70) return 'game-of-night';
	if (score >= 55) return 'entertaining';
	if (score >= 40) return 'decent';
	return 'one-sided';
}

/**
 * Format excitement score for display
 */
export function formatExcitementScore(score: ExcitementScore): string {
	return `${score.total}/100 - ${score.explanation}`;
}

/**
 * Find game of the night from a list of games
 */
export function findGameOfNight(
	games: Array<{
		game: NBAGameSummary;
		boxScores: NBAPlayerBoxScore[];
		leadChanges?: number;
	}>
): { game: NBAGameSummary; score: ExcitementScore } | null {
	if (games.length === 0) return null;

	let bestGame: { game: NBAGameSummary; score: ExcitementScore } | null = null;

	for (const { game, boxScores, leadChanges } of games) {
		const score = calculateExcitementScore(game, boxScores, leadChanges || 0);

		if (!bestGame || score.total > bestGame.score.total) {
			bestGame = { game, score };
		}
	}

	return bestGame;
}
