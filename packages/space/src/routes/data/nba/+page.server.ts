/**
 * NBA Live Analytics Experiment - Server Load
 *
 * Fetches games for a specific date (defaults to today).
 * Part of the meta-experiment testing spec-driven development.
 */

import type { PageServerLoad } from './$types';
import { fetchLiveGames, fetchGamePBP, fetchRecentHistory } from '$lib/nba/api';
import { calculateFGDifferential } from '$lib/nba/calculations';
import type { Game } from '$lib/nba/types';
import { deriveScoreboardView, formatNbaDate } from '$lib/nba/scoreboard-state';
import { env } from '$env/dynamic/private';

interface GameWithVolume extends Game {
	volumeMetric?: {
		awayMadeFG: number;
		homeMadeFG: number;
		differential: number;
	};
}

/**
 * Enrich games with volume metrics (made FG differential)
 * Only fetches play-by-play for live or final games
 */
async function enrichGamesWithVolumeMetrics(
	games: Game[],
	proxyUrl?: string
): Promise<GameWithVolume[]> {
	const enrichedGames = await Promise.all(
		games.map(async (game) => {
			if (game.analyticsAvailable === false) {
				return game;
			}

			// Only fetch play-by-play for live or final games
			if (game.status !== 'live' && game.status !== 'final') {
				return game;
			}

			try {
				const pbpResult = await fetchGamePBP(game.id, proxyUrl);

				if (!pbpResult.success || !pbpResult.data || pbpResult.data.length === 0) {
					return game;
				}

				const fgDiff = calculateFGDifferential(pbpResult.data);

				if (!fgDiff) {
					return game;
				}

				return {
					...game,
					volumeMetric: {
						awayMadeFG: fgDiff.awayTeam.madeFG,
						homeMadeFG: fgDiff.homeTeam.madeFG,
						differential: fgDiff.differential,
					},
				} as GameWithVolume;
			} catch (error) {
				console.error('[enrichGamesWithVolumeMetrics] Failed for game', game.id, error);
				return game;
			}
		})
	);

	return enrichedGames;
}

export const load: PageServerLoad = async ({ url }) => {
	const nbaToday = formatNbaDate(new Date());
	const currentDate = url.searchParams.get('date') || nbaToday;
	const proxyUrl = env.NBA_PROXY_URL;
	const [result, recentHistoryResult] = await Promise.all([
		fetchLiveGames(currentDate, proxyUrl),
		fetchRecentHistory(nbaToday, 3, proxyUrl),
	]);
	const recentHistory = recentHistoryResult.success ? recentHistoryResult.data : null;

	if (!result.success) {
		const view = deriveScoreboardView({
			games: [],
			error: result.error.message,
			stale: false,
			currentDate,
			nbaToday,
		});
		return {
			games: [] as GameWithVolume[],
			error: result.error.message,
			correlationId: result.error.correlationId,
			cached: false,
			degraded: true,
			stale: false,
			provider: null,
			timestamp: null,
			currentDate,
			nbaToday,
			scoreboardState: view.state,
			dateRelation: view.dateRelation,
			recentHistory,
		};
	}

	if (result.gameDate && result.gameDate !== currentDate) {
		const view = deriveScoreboardView({
			games: [],
			error: 'The scoreboard returned a different game date.',
			stale: false,
			currentDate,
			nbaToday,
		});
		return {
			games: [] as GameWithVolume[],
			error: 'The scoreboard returned a different game date.',
			correlationId: null,
			cached: false,
			degraded: true,
			stale: false,
			provider: result.metadata?.source ?? 'nba',
			timestamp: result.metadata?.fetchedAt ?? result.timestamp,
			currentDate,
			nbaToday,
			scoreboardState: view.state,
			dateRelation: view.dateRelation,
			recentHistory,
		};
	}

	const games = await enrichGamesWithVolumeMetrics(result.data, proxyUrl);
	const stale = result.metadata?.stale ?? false;
	const view = deriveScoreboardView({ games, error: null, stale, currentDate, nbaToday });

	return {
		games,
		error: null,
		correlationId: null,
		cached: result.cached,
		degraded: result.metadata?.degraded ?? false,
		stale,
		provider: result.metadata?.source ?? 'nba',
		timestamp: result.metadata?.fetchedAt ?? result.timestamp,
		currentDate,
		nbaToday,
		scoreboardState: view.state,
		dateRelation: view.dateRelation,
		recentHistory,
	};
};
