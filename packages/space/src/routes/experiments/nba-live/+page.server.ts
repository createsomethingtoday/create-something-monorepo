/**
 * NBA Live Analytics Experiment - Server Load
 *
 * Fetches games for a specific date (defaults to today).
 * Part of the meta-experiment testing spec-driven development.
 */

import type { PageServerLoad } from './$types';
import { fetchLiveGames, fetchGamePBP } from '$lib/nba/api';
import { calculateFGDifferential } from '$lib/nba/calculations';
import type { Game } from '$lib/nba/types';

interface GameWithVolume extends Game {
	volumeMetric?: {
		awayMadeFG: number;
		homeMadeFG: number;
		differential: number;
	};
}

/**
 * Format date as YYYY-MM-DD in Pacific Time (NBA's timezone)
 */
function formatDate(date: Date): string {
	// NBA API uses Pacific Time for game dates
	// Convert to Pacific Time before formatting
	const pacificDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
	return pacificDate.toISOString().split('T')[0];
}

/**
 * Enrich games with volume metrics (made FG differential)
 * Only fetches play-by-play for live or final games
 */
async function enrichGamesWithVolumeMetrics(games: Game[]): Promise<GameWithVolume[]> {
	const enrichedGames = await Promise.all(
		games.map(async (game) => {
			// Only fetch play-by-play for live or final games
			if (game.status !== 'live' && game.status !== 'final') {
				return game;
			}

			try {
				const pbpResult = await fetchGamePBP(game.id);

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
	// Get date from query parameter
	const dateParam = url.searchParams.get('date');

	// If user specified a date, fetch that date's games
	if (dateParam) {
		const result = await fetchLiveGames(dateParam);

		if (!result.success) {
			const is404Error = result.error.message.includes('HTTP 404');
			const isNoDataError = is404Error || result.error.message.includes('No data available');

			return {
				games: [] as GameWithVolume[],
				error: isNoDataError ? null : result.error.message,
				noGamesScheduled: isNoDataError,
				cached: false,
				timestamp: new Date().toISOString(),
				currentDate: dateParam,
			};
		}

		// Validate that returned games match the requested date
		const games = result.data;
		if (games.length > 0 && result.gameDate && result.gameDate !== dateParam) {
			return {
				games: [] as GameWithVolume[],
				error: null,
				noGamesScheduled: true,
				cached: false,
				timestamp: new Date().toISOString(),
				currentDate: dateParam,
			};
		}

		// Enrich with volume metrics
		const enrichedGames = await enrichGamesWithVolumeMetrics(result.data);

		return {
			games: enrichedGames,
			error: null,
			noGamesScheduled: false,
			cached: result.cached,
			timestamp: result.timestamp,
			currentDate: dateParam,
		};
	}

	// Landing page (no date param): Smart date selection
	// Try today first, fall back to yesterday if today has no games
	const today = formatDate(new Date());
	const todayResult = await fetchLiveGames(today);

	// If today has games, use today
	if (todayResult.success && todayResult.data.length > 0) {
		const enrichedGames = await enrichGamesWithVolumeMetrics(todayResult.data);

		return {
			games: enrichedGames,
			error: null,
			noGamesScheduled: false,
			cached: todayResult.cached,
			timestamp: todayResult.timestamp,
			currentDate: todayResult.gameDate || today,
		};
	}

	// Today has no games - try yesterday
	const yesterday = new Date();
	yesterday.setDate(yesterday.getDate() - 1);
	const yesterdayDate = formatDate(yesterday);
	const yesterdayResult = await fetchLiveGames(yesterdayDate);

	if (yesterdayResult.success && yesterdayResult.data.length > 0) {
		const enrichedGames = await enrichGamesWithVolumeMetrics(yesterdayResult.data);

		return {
			games: enrichedGames,
			error: null,
			noGamesScheduled: false,
			cached: yesterdayResult.cached,
			timestamp: yesterdayResult.timestamp,
			currentDate: yesterdayResult.gameDate || yesterdayDate,
		};
	}

	// Neither today nor yesterday has games - show empty state for today
	const is404Error = todayResult.success === false && todayResult.error.message.includes('HTTP 404');
	const isNoDataError = is404Error || (todayResult.success === false && todayResult.error.message.includes('No data available'));

	return {
		games: [] as GameWithVolume[],
		error: isNoDataError ? null : (todayResult.success ? null : todayResult.error.message),
		noGamesScheduled: isNoDataError,
		cached: false,
		timestamp: new Date().toISOString(),
		currentDate: today,
	};
};
