import type { KVNamespace } from '@cloudflare/workers-types';

interface KVEntry {
	value: string;
	expiresAt: number | null;
}

type KVListResult = { keys: { name: string }[] };
type KVPutOptions = { expirationTtl?: number };

export interface KVStore {
	get(key: string): Promise<string | null>;
	put(key: string, value: string, options?: KVPutOptions): Promise<void>;
	delete(key: string): Promise<void>;
	list(options?: { prefix?: string }): Promise<KVListResult>;
}

class KVCompat implements KVStore {
	private store: Map<string, KVEntry> = new Map();

	async get(key: string): Promise<string | null> {
		const entry = this.store.get(key);
		if (!entry) return null;

		if (entry.expiresAt && Date.now() > entry.expiresAt) {
			this.store.delete(key);
			return null;
		}

		return entry.value;
	}

	async put(key: string, value: string, options?: KVPutOptions): Promise<void> {
		const expiresAt = options?.expirationTtl ? Date.now() + options.expirationTtl * 1000 : null;
		this.store.set(key, { value, expiresAt });
	}

	async delete(key: string): Promise<void> {
		this.store.delete(key);
	}

	async list(options?: { prefix?: string }): Promise<KVListResult> {
		const keys: { name: string }[] = [];
		const now = Date.now();

		for (const [key, entry] of this.store) {
			if (entry.expiresAt && now > entry.expiresAt) {
				this.store.delete(key);
				continue;
			}

			if (!options?.prefix || key.startsWith(options.prefix)) {
				keys.push({ name: key });
			}
		}

		return { keys };
	}
}

class CloudflareKVStore implements KVStore {
	constructor(private namespace: KVNamespace) {}

	async get(key: string): Promise<string | null> {
		return this.namespace.get(key);
	}

	async put(key: string, value: string, options?: KVPutOptions): Promise<void> {
		await this.namespace.put(key, value, options);
	}

	async delete(key: string): Promise<void> {
		await this.namespace.delete(key);
	}

	async list(options?: { prefix?: string }): Promise<KVListResult> {
		const result = await this.namespace.list({ prefix: options?.prefix });
		return { keys: result.keys.map((key) => ({ name: key.name })) };
	}
}

let _sessionsBinding: KVNamespace | null = null;
let _videoStatsBinding: KVNamespace | null = null;
let _sessionsFallback: KVCompat | null = null;
let _videoStatsFallback: KVCompat | null = null;

export function setCloudflareKVBindings(bindings?: {
	SESSIONS?: KVNamespace;
	VIDEO_STATS?: KVNamespace;
}): void {
	_sessionsBinding = bindings?.SESSIONS ?? null;
	_videoStatsBinding = bindings?.VIDEO_STATS ?? null;
}

export function getSessions(): KVStore {
	if (_sessionsBinding) return new CloudflareKVStore(_sessionsBinding);
	if (!_sessionsFallback) _sessionsFallback = new KVCompat();
	return _sessionsFallback;
}

export function getVideoStats(): KVStore {
	if (_videoStatsBinding) return new CloudflareKVStore(_videoStatsBinding);
	if (!_videoStatsFallback) _videoStatsFallback = new KVCompat();
	return _videoStatsFallback;
}
