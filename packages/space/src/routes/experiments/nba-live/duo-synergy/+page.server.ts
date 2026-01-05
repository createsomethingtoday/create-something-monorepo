/**
 * Duo Synergy Page - Server Load
 *
 * Fetches play-by-play data and calculates two-man efficiency.
 */

import type { PageServerLoad } from './$types';
import { fetchGamePBP, fetchGameBoxScore } from '$lib/nba/api';
import { calculateDuoEfficiency, getTopDuos } from '$lib/nba/calculations';
import type { DuoStats, Player } from '$lib/nba/types';

export const load: PageServerLoad = async ({ url }) => {
	const gameId = url.searchParams.get('gameId');
	const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];

	if (!gameId) {
		return {
			error: 'No game selected',
			gameId: null,
			date,
			duos: {
				home: [] as DuoStats[],
				away: [] as DuoStats[],
			},
			players: {
				home: [] as Player[],
				away: [] as Player[],
			},
			cached: false,
			timestamp: new Date().toISOString(),
		};
	}

	// Fetch play-by-play and boxscore in parallel
	const [pbpResult, boxscoreResult] = await Promise.all([
		fetchGamePBP(gameId),
		fetchGameBoxScore(gameId),
	]);

	if (!pbpResult.success) {
		return {
			error: pbpResult.error.message,
			gameId,
			date,
			duos: { home: [], away: [] },
			players: { home: [], away: [] },
			cached: false,
			timestamp: new Date().toISOString(),
		};
	}

	if (!boxscoreResult.success) {
		return {
			error: boxscoreResult.error.message,
			gameId,
			date,
			duos: { home: [], away: [] },
			players: { home: [], away: [] },
			cached: false,
			timestamp: new Date().toISOString(),
		};
	}

	const actions = pbpResult.data;
	const players = boxscoreResult.data;

	// Get team IDs from boxscore
	const homeTeamId = players.home[0]?.teamId || '';
	const awayTeamId = players.away[0]?.teamId || '';

	// Calculate duo efficiency for each team
	const homeDuoMap = calculateDuoEfficiency(actions, homeTeamId, gameId);
	const awayDuoMap = calculateDuoEfficiency(actions, awayTeamId, gameId);

	// Get top 5 duos for each team
	const homeDuos = getTopDuos(homeDuoMap, 5);
	const awayDuos = getTopDuos(awayDuoMap, 5);

	return {
		error: null,
		gameId,
		date,
		duos: {
			home: homeDuos,
			away: awayDuos,
		},
		players,
		cached: pbpResult.cached,
		timestamp: pbpResult.timestamp,
	};
};
