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

	private async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
			...((options.headers as Record<string, string>) ?? {})
		};

		if (this.accessToken) {
			headers['Authorization'] = `Bearer ${this.accessToken}`;
		}

		const response = await fetch(`${ARENA_API_BASE}${endpoint}`, {
			...options,
			headers
		});

		if (!response.ok) {
			throw new Error(`Are.na API error: ${response.status} ${response.statusText}`);
		}

		return response.json();
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
