/**
 * Cache Invalidation Utilities
 *
 * Manages cache invalidation for admin stats and other cached endpoints.
 * Call these functions when data changes to ensure cache freshness.
 */

import type { Cache } from '@create-something/components/platform';

/**
 * Admin stats cache key
 */
export const ADMIN_STATS_CACHE_KEY = 'admin:stats';

/**
 * Invalidate admin stats cache
 *
 * Call this when:
 * - Papers are published/unpublished
 * - Contact submissions are created
 * - Newsletter subscribers are added/removed
 * - Experiment executions are recorded
 */
export async function invalidateAdminStats(cache: Cache): Promise<void> {
	try {
		await cache.delete(ADMIN_STATS_CACHE_KEY);
	} catch (e) {
		console.error('Failed to invalidate admin stats cache:', e);
		// Don't throw - cache invalidation failure shouldn't break mutations
	}
}

/**
 * Invalidate multiple cache keys at once
 */
export async function invalidateMultiple(cache: Cache, keys: string[]): Promise<void> {
	try {
		await Promise.all(keys.map((key) => cache.delete(key)));
	} catch (e) {
		console.error('Failed to invalidate cache keys:', e);
	}
}
