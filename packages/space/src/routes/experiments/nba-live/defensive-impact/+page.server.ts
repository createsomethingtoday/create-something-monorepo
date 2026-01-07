/**
 * Defensive Impact Page - Server Load
 *
 * Analyzes defensive matchups compared to expected performance.
 * Note: Real matchup data requires tracking data (Second Spectrum).
 * This version uses shot data as a proxy for defensive impact.
 */

import type { PageServerLoad } from './$types';
import { fetchGamePBP, fetchGameBoxScore, fetchPlayerBaselines, fetchLiveGames, extractShots } from '$lib/nba/api';
import { calculateTeamExpectedPoints } from '$lib/nba/calculations';
import type { Player, Shot, PlayerBaseline, Game } from '$lib/nba/types';

interface TeamDefensiveStats {
	shotsAllowed: number;
	pointsAllowed: number;
	expectedPointsAllowed: number;
	deltaVsExpected: number;
	shotsByZone: Record<string, { attempts: number; made: number; pct: number }>;
}

export const load: PageServerLoad = async ({ url }) => {
	const gameId = url.searchParams.get('gameId');
	const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];

	if (!gameId) {
		return {
			error: 'No game selected',
			gameId: null,
			date,
			game: null as Game | null,
			defensive: {
				home: null as TeamDefensiveStats | null,
				away: null as TeamDefensiveStats | null,
			},
			players: {
				home: [] as Player[],
				away: [] as Player[],
			},
			shots: [] as Shot[],
			cached: false,
			timestamp: new Date().toISOString(),
		};
	}

	// Fetch game info to check status
	const gamesResult = await fetchLiveGames(date);
	const game = gamesResult.success
		? gamesResult.data.find((g) => g.id === gameId)
		: null;

	// If game is scheduled, show a waiting state
	if (game && game.status === 'scheduled') {
		return {
			error: null,
			gameId,
			date,
			game,
			scheduled: true,
			defensive: { home: null, away: null },
			players: { home: [], away: [] },
			shots: [],
			cached: false,
			timestamp: new Date().toISOString(),
		};
	}

	// Fetch all data in parallel
	const [pbpResult, boxscoreResult, baselinesResult] = await Promise.all([
		fetchGamePBP(gameId),
		fetchGameBoxScore(gameId),
		fetchPlayerBaselines(),
	]);

	if (!pbpResult.success) {
		return {
			error: pbpResult.error.message,
			gameId,
			date,
			game,
			defensive: { home: null, away: null },
			players: { home: [], away: [] },
			shots: [],
			cached: false,
			timestamp: new Date().toISOString(),
		};
	}

	if (!boxscoreResult.success) {
		return {
			error: boxscoreResult.error.message,
			gameId,
			date,
			game,
			defensive: { home: null, away: null },
			players: { home: [], away: [] },
			shots: [],
			cached: false,
			timestamp: new Date().toISOString(),
		};
	}

	const actions = pbpResult.data;
	const players = boxscoreResult.data;
	const shots = extractShots(actions, gameId);

	// Build baseline map
	const baselines = new Map<string, PlayerBaseline>();
	if (baselinesResult.success) {
		for (const baseline of baselinesResult.data) {
			baselines.set(baseline.playerId, baseline);
		}
	}

	// Get team IDs
	const homeTeamId = players.home[0]?.teamId || '';
	const awayTeamId = players.away[0]?.teamId || '';

	// Calculate defensive stats for each team
	// Home team defends away team's shots, and vice versa
	const awayShots = shots.filter((s) => s.teamId === awayTeamId);
	const homeShots = shots.filter((s) => s.teamId === homeTeamId);

	function calculateDefensiveStats(opponentShots: Shot[]): TeamDefensiveStats {
		const expectedResult = calculateTeamExpectedPoints(opponentShots, baselines);

		// Group shots by zone
		const shotsByZone: Record<string, { attempts: number; made: number; pct: number }> = {};
		for (const shot of opponentShots) {
			if (!shotsByZone[shot.shotZone]) {
				shotsByZone[shot.shotZone] = { attempts: 0, made: 0, pct: 0 };
			}
			shotsByZone[shot.shotZone].attempts++;
			if (shot.made) {
				shotsByZone[shot.shotZone].made++;
			}
		}

		// Calculate percentages
		for (const zone of Object.keys(shotsByZone)) {
			const { attempts, made } = shotsByZone[zone];
			shotsByZone[zone].pct = attempts > 0 ? made / attempts : 0;
		}

		return {
			shotsAllowed: opponentShots.length,
			pointsAllowed: expectedResult.totalActual,
			expectedPointsAllowed: expectedResult.totalExpected,
			deltaVsExpected: expectedResult.delta,
			shotsByZone,
		};
	}

	return {
		error: null,
		gameId,
		date,
		game,
		scheduled: false,
		defensive: {
			home: calculateDefensiveStats(awayShots), // Home defense vs away offense
			away: calculateDefensiveStats(homeShots), // Away defense vs home offense
		},
		players,
		shots,
		cached: pbpResult.cached,
		timestamp: pbpResult.timestamp,
	};
};
