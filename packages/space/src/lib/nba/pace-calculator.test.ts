/**
 * Pace Calculator Tests
 *
 * Manual test suite (no test framework configured yet).
 * Run with: tsx pace-calculator.test.ts
 */

import {
	calculatePossessions,
	calculatePace,
	aggregateTeamStats,
	calculatePaceFromPBP,
	formatPace,
	formatPPP,
	getPaceComparison,
	type TeamBoxStats,
	type PaceResult,
} from './pace-calculator';
import type { NBAPlayerBoxScore, PlayByPlayAction } from './types';

// Test utilities
let testsPassed = 0;
let testsFailed = 0;

function assertEquals<T>(actual: T, expected: T, message: string): void {
	if (actual === expected) {
		console.log(`✓ ${message}`);
		testsPassed++;
	} else {
		console.error(`✗ ${message}`);
		console.error(`  Expected: ${expected}`);
		console.error(`  Actual: ${actual}`);
		testsFailed++;
	}
}

function assertApprox(actual: number, expected: number, tolerance: number, message: string): void {
	if (Math.abs(actual - expected) <= tolerance) {
		console.log(`✓ ${message}`);
		testsPassed++;
	} else {
		console.error(`✗ ${message}`);
		console.error(`  Expected: ${expected} (±${tolerance})`);
		console.error(`  Actual: ${actual}`);
		testsFailed++;
	}
}

function assertTrue(condition: boolean, message: string): void {
	if (condition) {
		console.log(`✓ ${message}`);
		testsPassed++;
	} else {
		console.error(`✗ ${message}`);
		testsFailed++;
	}
}

// Test data: Typical NBA game stats
const mockHomeStats: TeamBoxStats = {
	teamId: 'home-team',
	fieldGoalsAttempted: 85,
	freeThrowsAttempted: 20,
	offensiveRebounds: 10,
	turnovers: 12,
	points: 110,
};

const mockAwayStats: TeamBoxStats = {
	teamId: 'away-team',
	fieldGoalsAttempted: 82,
	freeThrowsAttempted: 18,
	offensiveRebounds: 8,
	turnovers: 14,
	points: 105,
};

// Test 1: calculatePossessions
console.log('\n=== Test 1: calculatePossessions ===');
{
	const homePossessions = calculatePossessions(mockHomeStats);
	// Formula: 85 + 0.44*20 - 10 + 12 = 85 + 8.8 - 10 + 12 = 95.8
	assertApprox(homePossessions, 95.8, 0.1, 'Home team possessions calculated correctly');

	const awayPossessions = calculatePossessions(mockAwayStats);
	// Formula: 82 + 0.44*18 - 8 + 14 = 82 + 7.92 - 8 + 14 = 95.92
	assertApprox(awayPossessions, 95.92, 0.1, 'Away team possessions calculated correctly');
}

// Test 2: calculatePace (regulation game)
console.log('\n=== Test 2: calculatePace (regulation) ===');
{
	const result = calculatePace(mockHomeStats, mockAwayStats, 4);

	// Average possessions: (95.8 + 95.92) / 2 = 95.86
	assertApprox(result.possessions, 95.86, 0.1, 'Average possessions calculated correctly');

	// Pace per 48 minutes: (95.86 / 48) * 48 = 95.86
	// Since it's a regulation game (4 periods * 12 min = 48 min), pace = possessions
	assertApprox(result.pacePerGame, 95.86, 0.1, 'Pace per game calculated correctly');

	// PPP: (110 + 105) / (95.86 * 2) = 215 / 191.72 = 1.12
	assertApprox(result.pointsPerPossession, 1.12, 0.01, 'Points per possession calculated correctly');

	assertEquals(result.paceCategory, 'average', 'Pace category is average (95-105)');

	assertTrue(result.leagueAvgPace === 99.5, 'League average pace constant is correct');
}

// Test 3: calculatePace (overtime game)
console.log('\n=== Test 3: calculatePace (overtime) ===');
{
	const otHomeStats: TeamBoxStats = {
		...mockHomeStats,
		fieldGoalsAttempted: 95,
		points: 120,
	};
	const otAwayStats: TeamBoxStats = {
		...mockAwayStats,
		fieldGoalsAttempted: 92,
		points: 118,
	};

	const result = calculatePace(otHomeStats, otAwayStats, 5);

	// Home possessions: 95 + 8.8 - 10 + 12 = 105.8
	// Away possessions: 92 + 7.92 - 8 + 14 = 105.92
	// Average: 105.86
	assertApprox(result.possessions, 105.86, 0.1, 'OT possessions calculated correctly');

	// Pace: (105.86 / 60) * 48 = 84.69
	// 5 periods * 12 min = 60 min total
	assertApprox(result.pacePerGame, 84.69, 0.5, 'OT pace per game calculated correctly (normalized to 48 min)');

	assertEquals(result.paceCategory, 'slow', 'OT pace category is slow (<95)');
}

// Test 4: Pace categories
console.log('\n=== Test 4: Pace categories ===');
{
	// Fast pace (>105)
	const fastStats: TeamBoxStats = {
		teamId: 'fast-team',
		fieldGoalsAttempted: 100,
		freeThrowsAttempted: 25,
		offensiveRebounds: 8,
		turnovers: 15,
		points: 125,
	};
	const fastResult = calculatePace(fastStats, fastStats, 4);
	assertTrue(fastResult.pacePerGame > 105, 'Fast pace generates high pace number');
	assertEquals(fastResult.paceCategory, 'fast', 'Fast pace categorized correctly');

	// Slow pace (<95)
	const slowStats: TeamBoxStats = {
		teamId: 'slow-team',
		fieldGoalsAttempted: 75,
		freeThrowsAttempted: 15,
		offensiveRebounds: 12,
		turnovers: 10,
		points: 95,
	};
	const slowResult = calculatePace(slowStats, slowStats, 4);
	assertTrue(slowResult.pacePerGame < 95, 'Slow pace generates low pace number');
	assertEquals(slowResult.paceCategory, 'slow', 'Slow pace categorized correctly');
}

// Test 5: aggregateTeamStats
console.log('\n=== Test 5: aggregateTeamStats ===');
{
	const mockPlayers: NBAPlayerBoxScore[] = [
		{
			personId: 1,
			firstName: 'Player',
			familyName: 'One',
			jerseyNum: '1',
			position: 'G',
			statistics: {
				minutes: '35:00',
				points: 25,
				assists: 8,
				reboundsTotal: 4,
				steals: 2,
				blocks: 0,
				turnovers: 3,
				fieldGoalsMade: 10,
				fieldGoalsAttempted: 20,
				threePointersMade: 3,
				threePointersAttempted: 8,
				freeThrowsMade: 2,
				freeThrowsAttempted: 2,
				plusMinusPoints: 5,
			},
		},
		{
			personId: 2,
			firstName: 'Player',
			familyName: 'Two',
			jerseyNum: '2',
			position: 'F',
			statistics: {
				minutes: '32:00',
				points: 18,
				assists: 3,
				reboundsTotal: 8,
				steals: 1,
				blocks: 2,
				turnovers: 2,
				fieldGoalsMade: 7,
				fieldGoalsAttempted: 15,
				threePointersMade: 2,
				threePointersAttempted: 5,
				freeThrowsMade: 2,
				freeThrowsAttempted: 3,
				plusMinusPoints: 3,
			},
		},
	];

	const teamStats = aggregateTeamStats(mockPlayers, 'test-team');

	assertEquals(teamStats.teamId, 'test-team', 'Team ID set correctly');
	assertEquals(teamStats.fieldGoalsAttempted, 35, 'FGA aggregated correctly');
	assertEquals(teamStats.freeThrowsAttempted, 5, 'FTA aggregated correctly');
	// ORB: (4 + 8) * 0.25 = 3
	assertEquals(teamStats.offensiveRebounds, 3, 'ORB estimated correctly');
	assertEquals(teamStats.turnovers, 5, 'Turnovers aggregated correctly');
	assertEquals(teamStats.points, 43, 'Points aggregated correctly');
}

// Test 6: calculatePaceFromPBP
console.log('\n=== Test 6: calculatePaceFromPBP ===');
{
	const mockActions: PlayByPlayAction[] = [
		// Simulate ~96 possession-ending actions (48 per team)
		...Array.from({ length: 48 }, (_, i) => ({
			actionId: `home-${i}`,
			gameId: 'test-game',
			period: Math.floor(i / 12) + 1,
			clock: '10:00',
			teamId: 'home',
			playerId: 'player1',
			playerName: 'Player 1',
			actionType: 'shot' as const,
			description: 'Shot attempt',
			scoreHome: 50,
			scoreAway: 48,
		})),
		...Array.from({ length: 48 }, (_, i) => ({
			actionId: `away-${i}`,
			gameId: 'test-game',
			period: Math.floor(i / 12) + 1,
			clock: '10:00',
			teamId: 'away',
			playerId: 'player2',
			playerName: 'Player 2',
			actionType: 'shot' as const,
			description: 'Shot attempt',
			scoreHome: 50,
			scoreAway: 48,
		})),
	];

	const result = calculatePaceFromPBP(mockActions, 4);

	// 96 possession enders / 2 = 48 possessions
	assertEquals(result.possessions, 48, 'Possessions counted from PBP correctly');

	// Pace: (48 / 48) * 48 = 48
	assertEquals(result.pacePerGame, 48, 'Pace per game calculated from PBP correctly');

	assertTrue(result.paceCategory === 'slow', 'PBP pace category is slow');
}

// Test 7: Incomplete data handling
console.log('\n=== Test 7: Incomplete data handling ===');
{
	const incompleteStats: TeamBoxStats = {
		teamId: 'incomplete',
		fieldGoalsAttempted: 0,
		freeThrowsAttempted: 0,
		offensiveRebounds: 0,
		turnovers: 0,
		points: 0,
	};

	const result = calculatePace(incompleteStats, incompleteStats, 4);

	assertEquals(result.possessions, 0, 'Handles zero stats gracefully');
	assertEquals(result.pacePerGame, 0, 'Pace is zero with no stats');
	assertEquals(result.pointsPerPossession, 0, 'PPP is zero with no possessions');
	assertEquals(result.paceCategory, 'slow', 'Zero pace categorized as slow');
}

// Test 8: Format functions
console.log('\n=== Test 8: Format functions ===');
{
	assertEquals(formatPace(99.5), '99.5', 'formatPace works correctly');
	assertEquals(formatPPP(1.123), '1.12', 'formatPPP works correctly');
	assertEquals(
		getPaceComparison(105, 99.5),
		'5.5 possessions faster than league average',
		'Pace comparison (faster) formatted correctly'
	);
	assertEquals(
		getPaceComparison(95, 99.5),
		'4.5 possessions slower than league average',
		'Pace comparison (slower) formatted correctly'
	);
	assertEquals(
		getPaceComparison(99, 99.5),
		'league average',
		'Pace comparison (average) formatted correctly'
	);
}

// Test 9: Reasonable value validation
console.log('\n=== Test 9: Reasonable value validation ===');
{
	const result = calculatePace(mockHomeStats, mockAwayStats, 4);

	assertTrue(
		result.pacePerGame >= 90 && result.pacePerGame <= 110,
		'Pace value is within typical NBA range (90-110)'
	);

	assertTrue(
		result.pointsPerPossession >= 1.0 && result.pointsPerPossession <= 1.3,
		'PPP is within typical NBA range (1.0-1.3)'
	);

	assertTrue(result.possessions > 0, 'Possessions is positive');
}

// Test 10: Component breakdown
console.log('\n=== Test 10: Component breakdown ===');
{
	const result = calculatePace(mockHomeStats, mockAwayStats, 4);

	assertTrue(result.components !== undefined, 'Components object exists');
	assertTrue(
		result.components.fieldGoalsAttempted > 0,
		'FGA component is tracked'
	);
	assertTrue(
		result.components.freeThrowsAttempted > 0,
		'FTA component is tracked'
	);
	assertTrue(
		result.components.offensiveRebounds > 0,
		'ORB component is tracked'
	);
	assertTrue(result.components.turnovers > 0, 'TOV component is tracked');
}

// Summary
console.log('\n=== Test Summary ===');
console.log(`Passed: ${testsPassed}`);
console.log(`Failed: ${testsFailed}`);

if (testsFailed === 0) {
	console.log('\n✓ All tests passed!');
	process.exit(0);
} else {
	console.log(`\n✗ ${testsFailed} test(s) failed`);
	process.exit(1);
}
