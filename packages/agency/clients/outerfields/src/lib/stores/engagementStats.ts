/**
 * Engagement Stats Store
 *
 * Manages live "Most Replayed" data for videos.
 * Tracks playback events and fetches aggregated engagement.
 */
import { writable } from 'svelte/store';
import { browser } from '$app/environment';

const BUCKET_COUNT = 20;

interface EngagementStats {
	/** Normalized engagement data per video (0-1 values) */
	data: Record<string, number[]>;
	/** Whether connected to live KV data */
	isLive: boolean;
	/** Last update timestamp */
	lastUpdated: number;
}

const initialState: EngagementStats = {
	data: {},
	isLive: false,
	lastUpdated: 0
};

function createEngagementStore() {
	const { subscribe, set, update } = writable<EngagementStats>(initialState);

	// Track the last bucket we sent to avoid duplicates
	let lastSentBucket: Record<string, number> = {};
	// Debounce timer for batching events
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;
	// Pending events to send
	let pendingEvents: { videoId: string; bucket: number; type: 'watch' | 'replay' }[] = [];

	/**
	 * Fetch engagement data for a specific video
	 */
	async function fetchEngagement(videoId: string): Promise<number[]> {
		if (!browser) return [];

		try {
			const response = await fetch(`/api/videos/${videoId}/engagement`);
			if (response.ok) {
				const data = await response.json();
				update((state) => ({
					...state,
					data: {
						...state.data,
						[videoId]: data.buckets
					},
					isLive: data.live,
					lastUpdated: Date.now()
				}));
				return data.buckets;
			}
		} catch (error) {
			console.error('Failed to fetch engagement:', error);
		}
		return [];
	}

	/**
	 * Send batched engagement events
	 */
	async function flushEvents() {
		if (pendingEvents.length === 0) return;

		const events = [...pendingEvents];
		pendingEvents = [];

		// Send events in parallel
		await Promise.all(
			events.map(async (event) => {
				try {
					const response = await fetch(`/api/videos/${event.videoId}/engagement`, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ bucket: event.bucket, type: event.type })
					});

					if (response.ok) {
						const data = await response.json();
						update((state) => ({
							...state,
							data: {
								...state.data,
								[event.videoId]: data.buckets
							},
							isLive: data.live,
							lastUpdated: Date.now()
						}));
					}
				} catch (error) {
					console.error('Failed to track engagement:', error);
				}
			})
		);
	}

	/**
	 * Track a watch event at a specific time
	 *
	 * @param videoId - The video being watched
	 * @param currentTime - Current playback position in seconds
	 * @param duration - Total video duration in seconds
	 */
	function trackWatch(videoId: string, currentTime: number, duration: number) {
		if (!browser || duration <= 0) return;

		const bucket = Math.min(Math.floor((currentTime / duration) * BUCKET_COUNT), BUCKET_COUNT - 1);

		// Avoid duplicate events for the same bucket
		if (lastSentBucket[videoId] === bucket) return;
		lastSentBucket[videoId] = bucket;

		pendingEvents.push({ videoId, bucket, type: 'watch' });

		// Debounce: send events every 2 seconds
		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(flushEvents, 2000);
	}

	/**
	 * Track a replay event (user seeked backwards)
	 *
	 * @param videoId - The video being watched
	 * @param seekToTime - Time position seeked to
	 * @param duration - Total video duration
	 */
	function trackReplay(videoId: string, seekToTime: number, duration: number) {
		if (!browser || duration <= 0) return;

		const bucket = Math.min(Math.floor((seekToTime / duration) * BUCKET_COUNT), BUCKET_COUNT - 1);

		pendingEvents.push({ videoId, bucket, type: 'replay' });

		// Send replay events immediately (they're more significant)
		flushEvents();
	}

	/**
	 * Reset tracking for a new video
	 */
	function resetTracking(videoId: string) {
		delete lastSentBucket[videoId];
	}

	/**
	 * Get engagement data for a video (from store)
	 */
	function getEngagement(videoId: string): number[] {
		let result: number[] = [];
		subscribe((state) => {
			result = state.data[videoId] || [];
		})();
		return result;
	}

	return {
		subscribe,
		fetchEngagement,
		trackWatch,
		trackReplay,
		resetTracking,
		getEngagement,
		flushEvents
	};
}

export const engagementStats = createEngagementStore();
