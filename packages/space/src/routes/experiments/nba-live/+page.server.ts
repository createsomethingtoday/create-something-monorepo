/**
 * NBA Live Analytics Experiment - Server Load
 *
 * Fetches games for a specific date (defaults to today).
 * Part of the meta-experiment testing spec-driven development.
 */

import type { PageServerLoad } from './$types';
import { fetchLiveGames } from '$lib/nba/api';
import type { Game } from '$lib/nba/types';

export const load: PageServerLoad = async ({ url }) => {
	// Get date from URL query param (YYYY-MM-DD format)
	// Defaults to today if not provided
	const dateParam = url.searchParams.get('date');

	// Validate date format (basic check)
	let date: string | undefined = undefined;
	if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
		date = dateParam;
	}

	const result = await fetchLiveGames(date);

	// Get current date for display (either param or today)
	const currentDate = date || new Date().toISOString().split('T')[0];

	if (!result.success) {
		return {
			games: [] as Game[],
			error: result.error.message,
			cached: false,
			timestamp: new Date().toISOString(),
			currentDate,
		};
	}

	return {
		games: result.data,
		error: null,
		cached: result.cached,
		timestamp: result.timestamp,
		currentDate,
	};
};
