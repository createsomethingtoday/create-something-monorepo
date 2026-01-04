/**
 * NBA Polling Module
 *
 * Provides reactive polling for live game data with proper cleanup.
 * Uses Svelte stores for state management.
 */

import { writable, derived, type Readable, type Writable } from 'svelte/store';
import type { Game, PlayByPlayAction, PollingState, NBAApiResult } from './types';
import { fetchLiveGames, fetchGamePBP } from './api';

// Default polling interval (30 seconds)
const DEFAULT_POLL_INTERVAL = 30000;

/**
 * Create a polling store for any async data
 */
export function createPollingStore<T>(
	fetcher: () => Promise<NBAApiResult<T>>,
	interval: number = DEFAULT_POLL_INTERVAL
): {
	data: Readable<T | null>;
	state: Readable<PollingState>;
	start: () => void;
	stop: () => void;
	refresh: () => Promise<void>;
} {
	const data: Writable<T | null> = writable(null);
	const state: Writable<PollingState> = writable({
		isPolling: false,
		lastUpdate: null,
		error: null,
		intervalMs: interval,
	});

	let pollTimer: ReturnType<typeof setInterval> | null = null;

	async function doFetch(): Promise<void> {
		const result = await fetcher();

		if (result.success) {
			data.set(result.data);
			state.update((s) => ({
				...s,
				lastUpdate: result.timestamp,
				error: null,
			}));
		} else {
			state.update((s) => ({
				...s,
				error: result.error.message,
			}));
		}
	}

	function start(): void {
		if (pollTimer) return; // Already polling

		state.update((s) => ({ ...s, isPolling: true }));

		// Initial fetch
		doFetch();

		// Set up interval
		pollTimer = setInterval(doFetch, interval);
	}

	function stop(): void {
		if (pollTimer) {
			clearInterval(pollTimer);
			pollTimer = null;
		}
		state.update((s) => ({ ...s, isPolling: false }));
	}

	async function refresh(): Promise<void> {
		await doFetch();
	}

	return {
		data: { subscribe: data.subscribe },
		state: { subscribe: state.subscribe },
		start,
		stop,
		refresh,
	};
}

/**
 * Create a store for live games (scoreboard)
 */
export function createLiveGamesStore(interval: number = DEFAULT_POLL_INTERVAL) {
	return createPollingStore<Game[]>(fetchLiveGames, interval);
}

/**
 * Create a store for a specific game's play-by-play
 */
export function createGamePBPStore(gameId: string, interval: number = DEFAULT_POLL_INTERVAL) {
	return createPollingStore<PlayByPlayAction[]>(() => fetchGamePBP(gameId), interval);
}

/**
 * Derived store: filter games by status
 */
export function filterGamesByStatus(
	gamesStore: Readable<Game[] | null>,
	status: Game['status']
): Readable<Game[]> {
	return derived(gamesStore, ($games) => {
		if (!$games) return [];
		return $games.filter((g) => g.status === status);
	});
}

/**
 * Derived store: live games only
 */
export function liveGamesOnly(gamesStore: Readable<Game[] | null>): Readable<Game[]> {
	return filterGamesByStatus(gamesStore, 'live');
}

/**
 * Svelte action for auto-cleanup polling
 *
 * Usage:
 * <div use:poll={gamesStore}>
 *   <!-- content -->
 * </div>
 */
export function poll(
	_node: HTMLElement,
	store: { start: () => void; stop: () => void }
): { destroy: () => void } {
	store.start();

	return {
		destroy() {
			store.stop();
		},
	};
}

/**
 * Hook for component lifecycle polling
 * Returns cleanup function for onDestroy
 */
export function usePolling(stores: { start: () => void; stop: () => void }[]): () => void {
	// Start all stores
	stores.forEach((s) => s.start());

	// Return cleanup function
	return () => {
		stores.forEach((s) => s.stop());
	};
}

/**
 * Create a combined polling context for a game
 * Polls both scoreboard and PBP together
 */
export function createGameContext(gameId: string, interval: number = DEFAULT_POLL_INTERVAL) {
	const pbpStore = createGamePBPStore(gameId, interval);

	// Derived stores from PBP
	const shots = derived(pbpStore.data, ($actions) => {
		if (!$actions) return [];
		return $actions.filter((a) => a.actionType === 'shot');
	});

	const assists = derived(pbpStore.data, ($actions) => {
		if (!$actions) return [];
		return $actions.filter((a) => a.assistPlayerId);
	});

	const turnovers = derived(pbpStore.data, ($actions) => {
		if (!$actions) return [];
		return $actions.filter((a) => a.actionType === 'turnover');
	});

	return {
		pbp: pbpStore,
		shots,
		assists,
		turnovers,
		start: () => pbpStore.start(),
		stop: () => pbpStore.stop(),
	};
}
