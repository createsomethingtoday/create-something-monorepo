/**
 * NBA Live Analytics Experiment - Server Load
 *
 * Fetches games for a specific date (defaults to today).
 * Part of the meta-experiment testing spec-driven development.
 */

import type { PageServerLoad } from './$types';
import { fetchLiveGames } from '$lib/nba/api';
import type { Game } from '$lib/nba/types';

export const load: PageServerLoad = async () => {
	const result = await fetchLiveGames();

	if (!result.success) {
		return {
			games: [] as Game[],
			error: result.error.message,
			cached: false,
			timestamp: new Date().toISOString(),
		};
	}

	return {
		games: result.data,
		error: null,
		cached: result.cached,
		timestamp: result.timestamp,
	};
};
