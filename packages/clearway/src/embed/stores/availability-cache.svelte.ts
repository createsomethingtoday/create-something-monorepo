/**
 * Availability Cache Store
 *
 * Multi-day availability caching with TTL and deduplication.
 * Uses Svelte 5 runes for reactive state management.
 */

import { formatDate } from '../utils/date-helpers';

// Re-export types for convenience (matching Widget.svelte internal types)
export interface TimeSlot {
	startTime: string;
	endTime: string;
	status: 'available' | 'reserved' | 'pending' | 'maintenance';
	priceCents: number | null;
}

export interface CourtAvailability {
	id: string;
	name: string;
	type: string;
	surfaceType: string | null;
	slots: TimeSlot[];
}

export interface DayAvailability {
	date: string; // YYYY-MM-DD
	totalSlots: number;
	availableSlots: number;
	courts: CourtAvailability[];
	fetchedAt: number; // timestamp for TTL check
}

export interface FacilityInfo {
	id: string;
	name: string;
	slug: string;
	timezone: string;
}

// Cache TTL: 5 minutes
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Create an availability cache instance for a facility
 */
export function createAvailabilityCache(facilitySlug: string, apiBase: string) {
	// Cache storage: Map<dateKey, DayAvailability>
	let cache = $state<Map<string, DayAvailability>>(new Map());

	// Track pending fetches to prevent duplicates
	let pendingFetches = $state<Set<string>>(new Set());

	// Facility info (populated on first fetch)
	let facility = $state<FacilityInfo | null>(null);

	// Error state
	let lastError = $state<string | null>(null);

	/**
	 * Check if a cache entry is still valid
	 */
	function isCacheValid(entry: DayAvailability): boolean {
		return Date.now() - entry.fetchedAt < CACHE_TTL_MS;
	}

	/**
	 * Get cached availability for a date
	 */
	function get(date: Date): DayAvailability | null {
		const key = formatDate(date);
		const entry = cache.get(key);

		if (entry && isCacheValid(entry)) {
			return entry;
		}

		return null;
	}

	/**
	 * Check if a date is currently being fetched
	 */
	function isPending(date: Date): boolean {
		return pendingFetches.has(formatDate(date));
	}

	/**
	 * Compute slot density from API response
	 */
	function computeDensity(courts: CourtAvailability[]): { totalSlots: number; availableSlots: number } {
		let totalSlots = 0;
		let availableSlots = 0;

		for (const court of courts) {
			for (const slot of court.slots) {
				totalSlots++;
				if (slot.status === 'available') {
					availableSlots++;
				}
			}
		}

		return { totalSlots, availableSlots };
	}

	/**
	 * Fetch availability for a single date
	 */
	async function fetchDate(date: Date): Promise<DayAvailability | null> {
		const key = formatDate(date);

		// Check cache first
		const cached = get(date);
		if (cached) {
			return cached;
		}

		// Check if already fetching
		if (pendingFetches.has(key)) {
			// Wait for existing fetch to complete
			return new Promise((resolve) => {
				const checkInterval = setInterval(() => {
					if (!pendingFetches.has(key)) {
						clearInterval(checkInterval);
						resolve(cache.get(key) || null);
					}
				}, 50);

				// Timeout after 10 seconds
				setTimeout(() => {
					clearInterval(checkInterval);
					resolve(null);
				}, 10000);
			});
		}

		// Mark as pending
		pendingFetches.add(key);
		lastError = null;

		try {
			const params = new URLSearchParams();
			params.set('facility', facilitySlug);
			params.set('date', key);

			const response = await fetch(`${apiBase}/availability?${params.toString()}`);

			if (!response.ok) {
				throw new Error(`Failed to fetch availability: ${response.statusText}`);
			}

			const data = await response.json() as {
				facility?: FacilityInfo;
				courts?: CourtAvailability[];
			};

			// Store facility info
			if (data.facility && !facility) {
				facility = data.facility;
			}

			const courts = data.courts || [];
			const density = computeDensity(courts);

			const entry: DayAvailability = {
				date: key,
				...density,
				courts,
				fetchedAt: Date.now()
			};

			// Update cache
			cache.set(key, entry);

			return entry;
		} catch (err) {
			lastError = err instanceof Error ? err.message : 'Failed to fetch availability';
			return null;
		} finally {
			pendingFetches.delete(key);
		}
	}

	/**
	 * Fetch availability for multiple dates in parallel
	 */
	async function fetchDates(dates: Date[]): Promise<Map<string, DayAvailability>> {
		const results = new Map<string, DayAvailability>();

		// Filter to dates that need fetching
		const toFetch = dates.filter((date) => {
			const key = formatDate(date);
			const cached = cache.get(key);
			return !cached || !isCacheValid(cached);
		});

		if (toFetch.length === 0) {
			// All cached, return from cache
			for (const date of dates) {
				const entry = cache.get(formatDate(date));
				if (entry) {
					results.set(formatDate(date), entry);
				}
			}
			return results;
		}

		// Fetch in parallel
		const fetches = toFetch.map((date) => fetchDate(date));
		const fetchResults = await Promise.allSettled(fetches);

		// Collect results
		for (const date of dates) {
			const entry = cache.get(formatDate(date));
			if (entry) {
				results.set(formatDate(date), entry);
			}
		}

		return results;
	}

	/**
	 * Invalidate a specific date
	 */
	function invalidate(date: Date): void {
		cache.delete(formatDate(date));
	}

	/**
	 * Invalidate all cache entries
	 */
	function invalidateAll(): void {
		cache.clear();
	}

	/**
	 * Get cache statistics
	 */
	function getStats(): { size: number; pending: number } {
		return {
			size: cache.size,
			pending: pendingFetches.size
		};
	}

	return {
		// Getters (reactive via runes)
		get cache() {
			return cache;
		},
		get facility() {
			return facility;
		},
		get lastError() {
			return lastError;
		},
		get isLoading() {
			return pendingFetches.size > 0;
		},

		// Methods
		get,
		isPending,
		fetchDate,
		fetchDates,
		invalidate,
		invalidateAll,
		getStats
	};
}

// Type for the cache instance
export type AvailabilityCache = ReturnType<typeof createAvailabilityCache>;
