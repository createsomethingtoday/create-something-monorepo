/**
 * Are.na API Client
 *
 * Fetches from Are.na public API with optional KV caching.
 * No auth required for read operations.
 */

import type {
	ArenaChannel,
	ArenaChannelContentsResponse,
	ArenaBlock,
	ArenaSearchResponse
} from './types';

const ARENA_API_BASE = 'https://api.are.na/v2';
const DEFAULT_CACHE_TTL = 21600; // 6 hours in seconds
const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);
const MAX_RETRY_ATTEMPTS = 2;
const RETRY_BASE_DELAY_MS = 400;
const REQUEST_TIMEOUT_MS = 15000;

export interface ArenaClientOptions {
	cache?: KVNamespace;
	cacheTtl?: number;
	accessToken?: string;
}

export class ArenaClient {
	private cache?: KVNamespace;
	private cacheTtl: number;
	private accessToken?: string;

	constructor(options: ArenaClientOptions = {}) {
		this.cache = options.cache;
		this.cacheTtl = options.cacheTtl ?? DEFAULT_CACHE_TTL;
		this.accessToken = options.accessToken;
	}

	private getMethod(options: RequestInit): string {
		return (options.method ?? 'GET').toUpperCase();
	}

	private isRetryableMethod(method: string): boolean {
		return method === 'GET' || method === 'HEAD';
	}

	private isNetworkError(error: unknown): boolean {
		return (
			error instanceof TypeError ||
			(error instanceof DOMException && error.name === 'AbortError')
		);
	}

	private async sleep(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	private async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
			...((options.headers as Record<string, string>) ?? {})
		};

		if (this.accessToken) {
			headers['Authorization'] = `Bearer ${this.accessToken}`;
		}

		const method = this.getMethod(options);
		const canRetry = this.isRetryableMethod(method);
		let lastError: Error | undefined;

		for (let attempt = 0; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
			const controller = options.signal ? null : new AbortController();
			const timeoutId: ReturnType<typeof setTimeout> | undefined = controller
				? setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
				: undefined;

			try {
				const response = await fetch(`${ARENA_API_BASE}${endpoint}`, {
					...options,
					headers,
					signal: options.signal ?? controller?.signal
				});

				if (timeoutId) {
					clearTimeout(timeoutId);
				}

				if (response.ok) {
					return response.json();
				}

				const shouldRetry =
					canRetry && RETRYABLE_STATUS.has(response.status) && attempt < MAX_RETRY_ATTEMPTS;
				if (shouldRetry) {
					const retryDelay = RETRY_BASE_DELAY_MS * (attempt + 1);
					await this.sleep(retryDelay);
					continue;
				}

				lastError = new Error(`Are.na API error: ${response.status} ${response.statusText}`);
				break;
			} catch (error) {
				if (timeoutId) {
					clearTimeout(timeoutId);
				}

				const shouldRetry = canRetry && this.isNetworkError(error) && attempt < MAX_RETRY_ATTEMPTS;
				if (shouldRetry) {
					const retryDelay = RETRY_BASE_DELAY_MS * (attempt + 1);
					await this.sleep(retryDelay);
					continue;
				}

				lastError = error instanceof Error ? error : new Error(String(error));
				break;
			}
		}

		throw (
			lastError ?? new Error(`Are.na API request failed for ${method} ${ARENA_API_BASE}${endpoint}`)
		);
	}

	private async cachedFetch<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
		if (this.cache) {
			const cached = await this.cache.get(key, { type: 'json' });
			if (cached) {
				return cached as T;
			}
		}

		const data = await fetcher();

		if (this.cache) {
			await this.cache.put(key, JSON.stringify(data), {
				expirationTtl: this.cacheTtl
			});
		}

		return data;
	}

	/**
	 * Get channel metadata and first 20 blocks
	 */
	async getChannel(slug: string): Promise<ArenaChannel> {
		return this.cachedFetch(`arena:channel:${slug}`, () =>
			this.fetch<ArenaChannel>(`/channels/${slug}`)
		);
	}

	/**
	 * Get channel contents with pagination
	 */
	async getChannelContents(
		slug: string,
		page = 1,
		per = 50
	): Promise<ArenaChannelContentsResponse> {
		return this.cachedFetch(`arena:contents:${slug}:${page}:${per}`, () =>
			this.fetch<ArenaChannelContentsResponse>(`/channels/${slug}/contents?page=${page}&per=${per}`)
		);
	}

	/**
	 * Get all blocks from a channel (handles pagination)
	 */
	async getAllChannelBlocks(slug: string): Promise<ArenaBlock[]> {
		const cacheKey = `arena:all-blocks:${slug}`;

		if (this.cache) {
			const cached = await this.cache.get(cacheKey, { type: 'json' });
			if (cached) {
				return cached as ArenaBlock[];
			}
		}

		const blocks: ArenaBlock[] = [];
		let page = 1;
		let hasMore = true;

		while (hasMore) {
			const response = await this.fetch<ArenaChannelContentsResponse>(
				`/channels/${slug}/contents?page=${page}&per=100`
			);

			blocks.push(...response.contents);

			hasMore = page < response.total_pages;
			page++;
		}

		if (this.cache) {
			await this.cache.put(cacheKey, JSON.stringify(blocks), {
				expirationTtl: this.cacheTtl
			});
		}

		return blocks;
	}

	/**
	 * Get a single block by ID
	 */
	async getBlock(id: number): Promise<ArenaBlock> {
		return this.cachedFetch(`arena:block:${id}`, () => this.fetch<ArenaBlock>(`/blocks/${id}`));
	}

	/**
	 * Search channels by query
	 */
	async searchChannels(query: string, page = 1, per = 10): Promise<ArenaSearchResponse> {
		const encoded = encodeURIComponent(query);
		return this.fetch<ArenaSearchResponse>(
			`/search/channels?q=${encoded}&page=${page}&per=${per}`
		);
	}

	/**
	 * Search blocks by query
	 */
	async searchBlocks(query: string, page = 1, per = 20): Promise<ArenaSearchResponse> {
		const encoded = encodeURIComponent(query);
		return this.fetch<ArenaSearchResponse>(`/search/blocks?q=${encoded}&page=${page}&per=${per}`);
	}

	/**
	 * Create a new block and add it to a channel
	 * Requires authentication (accessToken must be set)
	 */
	async createBlock(
		channelSlug: string,
		block: {
			source?: string; // URL for image/link/embed blocks
			content?: string; // Text content (markdown)
			title?: string;
			description?: string;
		}
	): Promise<ArenaBlock> {
		if (!this.accessToken) {
			throw new Error('Authentication required: accessToken must be set to create blocks');
		}

		if (!block.source && !block.content) {
			throw new Error('Either source (URL) or content (text) is required');
		}

		if (block.source && block.content) {
			throw new Error('Cannot specify both source and content - choose one');
		}

		const body: Record<string, string> = {};
		if (block.source) body.source = block.source;
		if (block.content) body.content = block.content;
		if (block.title) body.title = block.title;
		if (block.description) body.description = block.description;

		const createdBlock = await this.fetch<ArenaBlock>(`/channels/${channelSlug}/blocks`, {
			method: 'POST',
			body: JSON.stringify(body)
		});

		// Invalidate channel cache since we added a block
		await this.invalidateChannel(channelSlug);

		return createdBlock;
	}

	/**
	 * Update channel settings (title, status, description)
	 * Requires authentication
	 * Status: 'public' (open for collaboration), 'closed', 'private'
	 */
	async updateChannel(
		slug: string,
		updates: {
			title?: string;
			status?: 'public' | 'closed' | 'private';
			description?: string;
		}
	): Promise<ArenaChannel> {
		if (!this.accessToken) {
			throw new Error('Authentication required: accessToken must be set to update channels');
		}

		const updatedChannel = await this.fetch<ArenaChannel>(`/channels/${slug}`, {
			method: 'PUT',
			body: JSON.stringify(updates)
		});

		await this.invalidateChannel(slug);
		return updatedChannel;
	}

	/**
	 * Connect an existing block to a channel
	 * Requires authentication
	 */
	async connectBlock(channelSlug: string, blockId: number): Promise<ArenaBlock> {
		if (!this.accessToken) {
			throw new Error('Authentication required: accessToken must be set to connect blocks');
		}

		const connected = await this.fetch<ArenaBlock>(`/channels/${channelSlug}/connections`, {
			method: 'POST',
			body: JSON.stringify({
				connectable_id: blockId,
				connectable_type: 'Block'
			})
		});

		await this.invalidateChannel(channelSlug);
		return connected;
	}

	/**
	 * Invalidate cache for a specific channel
	 */
	async invalidateChannel(slug: string): Promise<void> {
		if (!this.cache) return;

		await Promise.all([
			this.cache.delete(`arena:channel:${slug}`),
			this.cache.delete(`arena:all-blocks:${slug}`)
		]);

		// Also clear paginated content (first 10 pages)
		for (let i = 1; i <= 10; i++) {
			await this.cache.delete(`arena:contents:${slug}:${i}:50`);
			await this.cache.delete(`arena:contents:${slug}:${i}:100`);
		}
	}
}

/**
 * Create a client instance for use in SvelteKit load functions
 */
export function createArenaClient(platform?: App.Platform): ArenaClient {
	return new ArenaClient({
		cache: platform?.env?.CACHE,
		accessToken: platform?.env?.ARENA_API_TOKEN
	});
}

/**
 * Create a client with token from KV (for OAuth flow)
 * Falls back to env var if KV token not found
 */
export async function createArenaClientWithKVToken(platform?: App.Platform): Promise<ArenaClient> {
	let accessToken = platform?.env?.ARENA_API_TOKEN;

	// Check KV for OAuth-obtained token if env var not set
	if (!accessToken && platform?.env?.CACHE) {
		const kvToken = await platform.env.CACHE.get('arena:access_token');
		if (kvToken) {
			accessToken = kvToken;
		}
	}

	return new ArenaClient({
		cache: platform?.env?.CACHE,
		accessToken
	});
}
