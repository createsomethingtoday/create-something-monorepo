/**
 * Environment Detection
 *
 * Determines whether we're running on Cloudflare or locally.
 * The tool recedes; detection happens transparently.
 *
 * Detection order:
 * 1. Explicit LOCAL_MODE=true environment variable
 * 2. Missing platform.env (no Cloudflare bindings)
 * 3. Otherwise → Cloudflare mode
 */

import type { PlatformMode, PlatformConfig } from './types.js';

/**
 * Detect current platform mode from SvelteKit platform object.
 *
 * @param platform - SvelteKit platform object (from PageServerLoad or RequestHandler)
 * @returns 'cloudflare' if D1 bindings present, 'local' otherwise
 */
export function detectMode(platform?: { env?: Record<string, unknown> }): PlatformMode {
	// Explicit override via environment variable
	if (typeof process !== 'undefined' && process.env?.LOCAL_MODE === 'true') {
		return 'local';
	}

	// Check for Cloudflare platform bindings
	if (platform?.env && typeof platform.env === 'object') {
		// Has DB binding? Probably Cloudflare
		if ('DB' in platform.env && platform.env.DB !== null && platform.env.DB !== undefined) {
			return 'cloudflare';
		}
	}

	// Default to local when no platform present (Node.js, local dev)
	return 'local';
}

/**
 * Get platform configuration from environment.
 *
 * @returns Configuration for local or Cloudflare mode
 */
export function getConfig(): PlatformConfig {
	const mode = detectMode();

	if (mode === 'local') {
		return {
			mode: 'local',
			database: {
				// Default to .wrangler D1 local state or custom path
				path:
					(typeof process !== 'undefined' && process.env?.LOCAL_DB_PATH) ||
					'.wrangler/state/v3/d1/miniflare-D1DatabaseObject'
			},
			cache: {
				// Default to .cache directory
				path: (typeof process !== 'undefined' && process.env?.LOCAL_CACHE_PATH) || '.cache/kv',
				ttl: 3600 // 1 hour default
			}
		};
	}

	return { mode: 'cloudflare' };
}

/**
 * Check if running in local mode.
 *
 * @returns true if local mode, false if Cloudflare
 */
export function isLocalMode(): boolean {
	return detectMode() === 'local';
}

/**
 * Check if running in Cloudflare mode.
 *
 * @returns true if Cloudflare, false if local
 */
export function isCloudflareMode(): boolean {
	return detectMode() === 'cloudflare';
}
