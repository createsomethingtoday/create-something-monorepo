/**
 * Platform Portability Layer
 *
 * Abstracts Cloudflare D1/KV behind platform-agnostic interfaces.
 * Zero changes to route handlers - swap happens transparently.
 *
 * Philosophy: The tool recedes; only the work remains.
 *
 * @example
 * ```typescript
 * import { getPlatform } from '@create-something/canon/platform';
 *
 * export const load: PageServerLoad = async ({ platform }) => {
 *   const { DB, CACHE } = await getPlatform(platform);
 *   const result = await DB.prepare('SELECT * FROM users').all();
 *   return { users: result.results };
 * };
 * ```
 */

// Re-export types
export * from './types.js';

// Re-export detection utilities
export { detectMode, isLocalMode, isCloudflareMode, getConfig } from './detect.js';

// Re-export adapters
export { wrapD1, isD1Database } from './database/cloudflare.js';
export { createLocalDatabase, findLocalD1Path } from './database/sqlite.js';
export { wrapKV, isKVNamespace } from './cache/cloudflare.js';
export { createFileCache } from './cache/file.js';

import type { PlatformEnv, PlatformConfig, Database, Cache } from './types.js';
import { detectMode, getConfig } from './detect.js';
import { wrapD1, isD1Database } from './database/cloudflare.js';
import { createLocalDatabase, findLocalD1Path } from './database/sqlite.js';
import { wrapKV, isKVNamespace } from './cache/cloudflare.js';
import { createFileCache } from './cache/file.js';

// ============================================================================
// Singleton Cache for Local Mode
// ============================================================================

// Cached local instances (singleton pattern for local mode)
let localDb: Database | null = null;
let localCache: Cache | null = null;
let localSessions: Cache | null = null;

// ============================================================================
// Main Factory Function
// ============================================================================

/**
 * Get platform with abstracted database and cache.
 *
 * Automatically detects whether running on Cloudflare or locally,
 * and returns the appropriate implementations.
 *
 * @param platform - SvelteKit platform object (from PageServerLoad or RequestHandler)
 * @param config - Optional configuration override
 * @returns Platform environment with DB and CACHE bindings
 *
 * @example
 * ```typescript
 * // In +page.server.ts or +server.ts
 * export const load: PageServerLoad = async ({ platform }) => {
 *   const { DB, CACHE } = await getPlatform(platform);
 *
 *   // Works identically on Cloudflare or local Mac Mini
 *   const result = await DB.prepare('SELECT * FROM papers').all();
 *   return { papers: result.results };
 * };
 * ```
 */
export async function getPlatform(
	platform?: { env?: Record<string, unknown> },
	config?: Partial<PlatformConfig>
): Promise<PlatformEnv> {
	const mode = detectMode(platform);
	const fullConfig = { ...getConfig(), ...config };

	// ============================================================================
	// Cloudflare Mode: Wrap native bindings
	// ============================================================================

	if (mode === 'cloudflare' && platform?.env) {
		const env: PlatformEnv = {} as PlatformEnv;

		// Wrap DB if present
		if (platform.env.DB && isD1Database(platform.env.DB)) {
			env.DB = wrapD1(platform.env.DB as Parameters<typeof wrapD1>[0]);
		}

		// Wrap CACHE/KV if present
		if (platform.env.CACHE && isKVNamespace(platform.env.CACHE)) {
			env.CACHE = wrapKV(platform.env.CACHE as Parameters<typeof wrapKV>[0]);
		} else if (platform.env.KV && isKVNamespace(platform.env.KV)) {
			// Some properties use KV instead of CACHE
			env.CACHE = wrapKV(platform.env.KV as Parameters<typeof wrapKV>[0]);
		}

		// Wrap SESSIONS if present
		if (platform.env.SESSIONS && isKVNamespace(platform.env.SESSIONS)) {
			env.SESSIONS = wrapKV(platform.env.SESSIONS as Parameters<typeof wrapKV>[0]);
		}

		// Pass through other bindings
		for (const [key, value] of Object.entries(platform.env)) {
			if (!(key in env)) {
				env[key] = value;
			}
		}

		return env;
	}

	// ============================================================================
	// Local Mode: Create local instances (singleton)
	// ============================================================================

	// Create database if not cached
	if (!localDb) {
		const dbBasePath =
			fullConfig.database?.path || '.wrangler/state/v3/d1/miniflare-D1DatabaseObject';
		try {
			const dbPath = await findLocalD1Path(dbBasePath);
			localDb = await createLocalDatabase(dbPath);
		} catch (error) {
			console.warn(
				`[Platform] Could not find local D1 database: ${error instanceof Error ? error.message : error}`
			);
			console.warn('[Platform] Database operations will fail. Run wrangler d1 migrations first.');
			// Create a stub that throws helpful errors
			localDb = createDatabaseStub();
		}
	}

	// Create cache if not cached
	if (!localCache) {
		const cachePath = fullConfig.cache?.path || '.cache/kv';
		localCache = await createFileCache(cachePath);
	}

	// Create sessions cache if not cached
	if (!localSessions) {
		const sessionsPath = fullConfig.cache?.path
			? `${fullConfig.cache.path}/sessions`
			: '.cache/sessions';
		localSessions = await createFileCache(sessionsPath);
	}

	return {
		DB: localDb,
		CACHE: localCache,
		SESSIONS: localSessions
	};
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Get database only (convenience function).
 *
 * @param platform - SvelteKit platform object
 * @returns Database interface
 */
export async function getDatabase(platform?: { env?: Record<string, unknown> }): Promise<Database> {
	const env = await getPlatform(platform);
	return env.DB;
}

/**
 * Get cache only (convenience function).
 *
 * @param platform - SvelteKit platform object
 * @returns Cache interface
 */
export async function getCache(platform?: { env?: Record<string, unknown> }): Promise<Cache> {
	const env = await getPlatform(platform);
	return env.CACHE;
}

/**
 * Reset local instances (for testing).
 * Clears the singleton cache so new instances will be created.
 */
export function resetLocalInstances(): void {
	localDb = null;
	localCache = null;
	localSessions = null;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Create a stub database that throws helpful errors.
 * Used when local D1 database is not found.
 */
function createDatabaseStub(): Database {
	const error = () => {
		throw new Error(
			'No local D1 database found. Run: wrangler d1 migrations apply <DB_NAME> --local'
		);
	};

	return {
		prepare: () => ({
			bind: function () {
				return this;
			},
			all: error,
			first: error,
			run: error
		}),
		batch: error,
		exec: error
	};
}
