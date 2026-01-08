/**
 * Video Stats Store
 *
 * Manages live view counts for videos.
 * Polls the API to show real-time updates.
 */
import { writable } from 'svelte/store';
import { browser } from '$app/environment';

interface VideoStats {
	views: Record<string, number>;
	isLive: boolean;
	lastUpdated: number;
}

const initialState: VideoStats = {
	views: {},
	isLive: false,
	lastUpdated: 0
};

function createVideoStatsStore() {
	const { subscribe, set, update } = writable<VideoStats>(initialState);
	let pollInterval: ReturnType<typeof setInterval> | null = null;

	async function fetchStats() {
		if (!browser) return;

		try {
			const response = await fetch('/api/videos/stats');
			if (response.ok) {
				const data = await response.json();
				update((state) => ({
					...state,
					views: data.stats,
					isLive: data.live,
					lastUpdated: Date.now()
				}));
			}
		} catch (error) {
			console.error('Failed to fetch video stats:', error);
		}
	}

	async function incrementView(videoId: string) {
		if (!browser) return;

		try {
			const response = await fetch(`/api/videos/${videoId}/view`, {
				method: 'POST'
			});

			if (response.ok) {
				const data = await response.json();
				update((state) => ({
					...state,
					views: {
						...state.views,
						[videoId]: data.views
					},
					isLive: data.live,
					lastUpdated: Date.now()
				}));
			}
		} catch (error) {
			console.error('Failed to increment view:', error);
		}
	}

	function startPolling(intervalMs = 10000) {
		if (pollInterval) return;

		// Initial fetch
		fetchStats();

		// Poll for updates
		pollInterval = setInterval(fetchStats, intervalMs);
	}

	function stopPolling() {
		if (pollInterval) {
			clearInterval(pollInterval);
			pollInterval = null;
		}
	}

	return {
		subscribe,
		fetchStats,
		incrementView,
		startPolling,
		stopPolling
	};
}

export const videoStats = createVideoStatsStore();
