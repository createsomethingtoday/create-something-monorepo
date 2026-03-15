/**
 * File-based Cache Adapter
 *
 * Local cache implementation using filesystem.
 * Matches KV interface for local development and Mac Mini deployment.
 *
 * Note: This is a server-only module. Do not import in client code.
 * The tool recedes; file cache works transparently like KV.
 */

import type {
	Cache,
	CacheGetOptions,
	CachePutOptions,
	CacheListOptions,
	CacheListResult,
	CacheGetWithMetadataResult
} from '../types.js';

// ============================================================================
// Cache Entry Type
// ============================================================================

interface CacheEntry {
	value: string;
	metadata?: Record<string, unknown>;
	expiration?: number; // Unix timestamp
	createdAt: number;
}

// ============================================================================
// File Cache Implementation
// ============================================================================

/**
 * Create a file-based cache matching the KV interface.
 *
 * @param cachePath - Directory to store cache files
 * @returns Cache interface compatible with getPlatform()
 */
export async function createFileCache(cachePath: string): Promise<Cache> {
	const fs = await import('fs/promises');
	const path = await import('path');
	const crypto = await import('crypto');

	// Ensure cache directory exists
	await fs.mkdir(cachePath, { recursive: true });

	/**
	 * Convert key to safe filename using hash.
	 */
	function keyToPath(key: string): string {
		// Use hash for safe, consistent filenames
		const hash = crypto.createHash('sha256').update(key).digest('hex').slice(0, 16);
		// Also encode the key in base64url for reversibility
		const safeKey = Buffer.from(key).toString('base64url');
		return path.join(cachePath, `${hash}_${safeKey.slice(0, 100)}.json`);
	}

	/**
	 * Read cache entry from disk, checking expiration.
	 */
	async function readEntry(key: string): Promise<CacheEntry | null> {
		try {
			const filePath = keyToPath(key);
			const content = await fs.readFile(filePath, 'utf-8');
			const entry: CacheEntry = JSON.parse(content);

			// Check expiration
			if (entry.expiration && Date.now() / 1000 > entry.expiration) {
				// Expired - delete and return null
				await fs.unlink(filePath).catch(() => {});
				return null;
			}

			return entry;
		} catch {
			return null;
		}
	}

	return {
		async get(key: string, options?: CacheGetOptions): Promise<string | null> {
			const entry = await readEntry(key);
			if (!entry) return null;

			if (options?.type === 'json') {
				try {
					return JSON.parse(entry.value);
				} catch {
					return null;
				}
			}

			return entry.value;
		},

		async getWithMetadata<T>(
			key: string,
			options?: CacheGetOptions
		): Promise<CacheGetWithMetadataResult<T>> {
			const entry = await readEntry(key);
			if (!entry) {
				return { value: null, metadata: null };
			}

			let value: T | null = entry.value as unknown as T;
			if (options?.type === 'json') {
				try {
					value = JSON.parse(entry.value) as T;
				} catch {
					value = null;
				}
			}

			return {
				value,
				metadata: entry.metadata ?? null
			};
		},

		async put(
			key: string,
			value: string | ArrayBuffer | ReadableStream,
			options?: CachePutOptions
		): Promise<void> {
			const filePath = keyToPath(key);

			let stringValue: string;
			if (typeof value === 'string') {
				stringValue = value;
			} else if (value instanceof ArrayBuffer) {
				stringValue = Buffer.from(value).toString('base64');
			} else {
				// ReadableStream - not fully supported in file cache
				throw new Error('ReadableStream not supported in file cache. Use string or ArrayBuffer.');
			}

			const entry: CacheEntry = {
				value: stringValue,
				metadata: options?.metadata,
				createdAt: Date.now()
			};

			// Set expiration
			if (options?.expiration) {
				entry.expiration = options.expiration;
			} else if (options?.expirationTtl) {
				entry.expiration = Math.floor(Date.now() / 1000) + options.expirationTtl;
			}

			await fs.writeFile(filePath, JSON.stringify(entry), 'utf-8');
		},

		async delete(key: string): Promise<void> {
			try {
				await fs.unlink(keyToPath(key));
			} catch {
				// Key doesn't exist, that's fine
			}
		},

		async list(options?: CacheListOptions): Promise<CacheListResult> {
			const files = await fs.readdir(cachePath);
			const keys: CacheListResult['keys'] = [];

			for (const file of files) {
				if (!file.endsWith('.json')) continue;

				try {
					const content = await fs.readFile(path.join(cachePath, file), 'utf-8');
					const entry: CacheEntry = JSON.parse(content);

					// Extract key from filename (after hash, base64url encoded)
					const parts = file.replace('.json', '').split('_');
					if (parts.length < 2) continue;
					const encodedKey = parts.slice(1).join('_');
					const key = Buffer.from(encodedKey, 'base64url').toString('utf-8');

					// Check prefix filter
					if (options?.prefix && !key.startsWith(options.prefix)) {
						continue;
					}

					// Check expiration
					if (entry.expiration && Date.now() / 1000 > entry.expiration) {
						await fs.unlink(path.join(cachePath, file)).catch(() => {});
						continue;
					}

					keys.push({
						name: key,
						expiration: entry.expiration,
						metadata: entry.metadata
					});

					if (options?.limit && keys.length >= options.limit) {
						break;
					}
				} catch {
					// Skip invalid entries
				}
			}

			return {
				keys,
				list_complete: true // File cache doesn't paginate
			};
		}
	};
}
