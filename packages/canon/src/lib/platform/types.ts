/**
 * Platform Portability Types
 *
 * Abstracts Cloudflare D1/KV behind platform-agnostic interfaces.
 * Same API whether running on Cloudflare or local SQLite.
 *
 * Philosophy: The infrastructure disappears; only the work remains.
 */

// ============================================================================
// Environment Detection
// ============================================================================

export type PlatformMode = 'cloudflare' | 'local';

export interface PlatformConfig {
	mode: PlatformMode;
	database?: {
		path?: string; // For local: path to SQLite file
	};
	cache?: {
		path?: string; // For local: path to cache directory
		ttl?: number; // Default TTL in seconds
	};
}

// ============================================================================
// Database Interface (abstracts D1)
// ============================================================================

/**
 * Prepared statement interface matching D1's API.
 * Enables method chaining: db.prepare(sql).bind(...).all()
 */
export interface PreparedStatement {
	bind(...values: unknown[]): PreparedStatement;
	all<T = unknown>(): Promise<QueryResult<T>>;
	first<T = unknown>(columnName?: string): Promise<T | null>;
	run(): Promise<RunResult>;
}

/**
 * Query result containing rows and metadata.
 */
export interface QueryResult<T> {
	results: T[];
	success: boolean;
	meta: {
		duration?: number;
		changes?: number;
		last_row_id?: number;
	};
}

/**
 * Result from mutation operations (INSERT, UPDATE, DELETE).
 */
export interface RunResult {
	success: boolean;
	meta: {
		changes: number;
		last_row_id: number;
		duration?: number;
	};
}

/**
 * Database interface matching D1's API.
 * Implementations: Cloudflare D1, local SQLite (better-sqlite3)
 */
export interface Database {
	prepare(query: string): PreparedStatement;
	batch(statements: PreparedStatement[]): Promise<QueryResult<unknown>[]>;
	exec(query: string): Promise<void>;
	dump?(): Promise<ArrayBuffer>;
}

// ============================================================================
// Cache Interface (abstracts KV)
// ============================================================================

export interface CacheGetOptions {
	type?: 'text' | 'json' | 'arrayBuffer' | 'stream';
	cacheTtl?: number;
}

export interface CachePutOptions {
	expiration?: number; // Unix timestamp
	expirationTtl?: number; // Seconds from now
	metadata?: Record<string, unknown>;
}

export interface CacheListOptions {
	prefix?: string;
	limit?: number;
	cursor?: string;
}

export interface CacheListResult {
	keys: Array<{
		name: string;
		expiration?: number;
		metadata?: Record<string, unknown>;
	}>;
	list_complete: boolean;
	cursor?: string;
}

export interface CacheGetWithMetadataResult<T> {
	value: T | null;
	metadata: Record<string, unknown> | null;
}

/**
 * Cache interface matching Cloudflare KV's API.
 * Implementations: Cloudflare KV, local file-based cache
 */
export interface Cache {
	get(key: string, options?: CacheGetOptions): Promise<string | null>;
	get<T>(key: string, options: CacheGetOptions & { type: 'json' }): Promise<T | null>;
	getWithMetadata<T = string>(
		key: string,
		options?: CacheGetOptions
	): Promise<CacheGetWithMetadataResult<T>>;
	put(
		key: string,
		value: string | ArrayBuffer | ReadableStream,
		options?: CachePutOptions
	): Promise<void>;
	delete(key: string): Promise<void>;
	list(options?: CacheListOptions): Promise<CacheListResult>;
}

// ============================================================================
// Platform Context (passed to route handlers)
// ============================================================================

/**
 * Platform environment bindings.
 * Available in SvelteKit via `platform.env`
 */
export interface PlatformEnv {
	DB: Database;
	CACHE: Cache;
	SESSIONS?: Cache;
	// Additional bindings can be added per-property
	[key: string]: unknown;
}

/**
 * Platform object matching SvelteKit's platform type.
 */
export interface Platform {
	env: PlatformEnv;
}
