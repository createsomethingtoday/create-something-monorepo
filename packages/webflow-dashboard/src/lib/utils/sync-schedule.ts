/**
 * Utility functions for calculating Census data sync schedule.
 * Data syncs from Snowflake to Airtable weekly on Mondays at 16:00 UTC (4 PM UTC).
 *
 * Ported from v1: wf-asset-dashboard/utils/syncSchedule.js
 *
 * IMPORTANT: These functions calculate *theoretical* sync times based on the
 * calendar schedule. They do NOT verify whether Census actually ran. If Census
 * fails on a Monday, the dashboard will still report that sync time as "last sync."
 * A future improvement would be to check Airtable record modification timestamps.
 */

export interface SyncMetadata {
	lastSyncTime: string;
	nextSyncTime: string;
	syncSchedule: string;
	dataWindow: string;
	timeUntilNextSync: string;
}

/**
 * Get the most recent Monday 4 PM UTC sync time.
 */
export function getLastSyncTime(): Date {
	const now = new Date();
	const currentDay = now.getUTCDay(); // 0 = Sunday, 1 = Monday, etc.
	const currentHour = now.getUTCHours();

	// Calculate days since last Monday
	let daysSinceMonday = currentDay === 0 ? 6 : currentDay - 1;

	// If it's Monday but before 4 PM UTC, use last week's Monday
	if (currentDay === 1 && currentHour < 16) {
		daysSinceMonday = 7;
	}

	const lastSync = new Date(now);
	lastSync.setUTCDate(now.getUTCDate() - daysSinceMonday);
	lastSync.setUTCHours(16, 0, 0, 0); // 4 PM UTC

	return lastSync;
}

/**
 * Get the next Monday 4 PM UTC sync time.
 */
export function getNextSyncTime(): Date {
	const now = new Date();
	const currentDay = now.getUTCDay();
	const currentHour = now.getUTCHours();

	// Calculate days until next Monday
	let daysUntilMonday: number;

	if (currentDay === 1 && currentHour < 16) {
		// Monday before 4 PM — sync is today
		daysUntilMonday = 0;
	} else if (currentDay === 1 && currentHour >= 16) {
		// Monday after 4 PM — next sync is next Monday
		daysUntilMonday = 7;
	} else if (currentDay === 0) {
		// Sunday — next Monday is tomorrow
		daysUntilMonday = 1;
	} else {
		// Tuesday–Saturday
		daysUntilMonday = 8 - currentDay;
	}

	const nextSync = new Date(now);
	nextSync.setUTCDate(now.getUTCDate() + daysUntilMonday);
	nextSync.setUTCHours(16, 0, 0, 0); // 4 PM UTC

	return nextSync;
}

/**
 * Get a human-readable time until next sync.
 */
export function getTimeUntilNextSync(): string {
	const now = new Date();
	const nextSync = getNextSyncTime();
	const diffMs = nextSync.getTime() - now.getTime();

	const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
	const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

	if (days === 0) {
		if (hours === 0) {
			const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
			return `in ${minutes} minute${minutes !== 1 ? 's' : ''}`;
		}
		return `in ${hours} hour${hours !== 1 ? 's' : ''}`;
	}

	if (days === 1) {
		return 'tomorrow';
	}

	return `in ${days} days`;
}

/**
 * Get sync metadata for API responses.
 * Returns calculated sync times based on the weekly Monday 4 PM UTC schedule.
 */
export function getSyncMetadata(): SyncMetadata {
	const lastSync = getLastSyncTime();
	const nextSync = getNextSyncTime();

	return {
		lastSyncTime: lastSync.toISOString(),
		nextSyncTime: nextSync.toISOString(),
		syncSchedule: 'Weekly on Mondays at 16:00 UTC (4 PM UTC)',
		dataWindow: 'Rolling 30-day window',
		timeUntilNextSync: getTimeUntilNextSync()
	};
}
