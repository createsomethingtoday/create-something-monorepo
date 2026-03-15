/**
 * Cloudflare KV Adapter
 *
 * Wraps native KV binding with our interface.
 * The tool recedes; KV is used transparently.
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
// KV Native Types (from Cloudflare)
// ============================================================================

interface KVNamespace {
	get(key: string, options?: { type?: string; cacheTtl?: number }): Promise<string | null>;
	getWithMetadata<T = string>(
		key: string,
		options?: { type?: string }
	): Promise<{ value: T | null; metadata: Record<string, unknown> | null }>;
	put(
		key: string,
		value: string | ArrayBuffer | ReadableStream,
		options?: { expiration?: number; expirationTtl?: number; metadata?: Record<string, unknown> }
	): Promise<void>;
	delete(key: string): Promise<void>;
	list(options?: { prefix?: string; limit?: number; cursor?: string }): Promise<{
		keys: Array<{ name: string; expiration?: number; metadata?: Record<string, unknown> }>;
		list_complete: boolean;
		cursor?: string;
	}>;
}

// ============================================================================
// Wrapper Implementation
// ============================================================================

/**
 * Wrap Cloudflare KV namespace with our platform-agnostic interface.
 *
 * @param kv - Native Cloudflare KV namespace binding
 * @returns Cache interface that works with getPlatform()
 */
export function wrapKV(kv: KVNamespace): Cache {
	return {
		async get(key: string, options?: CacheGetOptions): Promise<string | null> {
			return kv.get(key, options);
		},

		async getWithMetadata<T>(
			key: string,
			options?: CacheGetOptions
		): Promise<CacheGetWithMetadataResult<T>> {
			return kv.getWithMetadata<T>(key, options);
		},

		async put(
			key: string,
			value: string | ArrayBuffer | ReadableStream,
			options?: CachePutOptions
		): Promise<void> {
			return kv.put(key, value, options);
		},

		async delete(key: string): Promise<void> {
			return kv.delete(key);
		},

		async list(options?: CacheListOptions): Promise<CacheListResult> {
			return kv.list(options);
		}
	};
}

/**
 * Type guard to check if an object is a KV namespace.
 */
export function isKVNamespace(obj: unknown): obj is KVNamespace {
	return (
		obj !== null &&
		typeof obj === 'object' &&
		'get' in obj &&
		'put' in obj &&
		typeof (obj as KVNamespace).get === 'function'
	);
}
