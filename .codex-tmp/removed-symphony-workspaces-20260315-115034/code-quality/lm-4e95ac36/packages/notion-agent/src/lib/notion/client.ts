/**
 * Notion API Client
 * 
 * Wrapper for Notion API operations used by agents.
 */

import type { NotionDatabase } from '../db/types.js';

const NOTION_API_BASE = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

export interface NotionClientConfig {
	accessToken: string;
}

export interface NotionPage {
	id: string;
	object: 'page';
	created_time: string;
	last_edited_time: string;
	archived: boolean;
	url: string;
	parent: {
		type: 'database_id' | 'page_id' | 'workspace';
		database_id?: string;
		page_id?: string;
	};
	properties: Record<string, NotionPropertyValue>;
}

export interface NotionPropertyValue {
	id: string;
	type: string;
	[key: string]: unknown;
}

export interface QueryDatabaseParams {
	filter?: Record<string, unknown>;
	sorts?: Array<{
		property?: string;
		timestamp?: 'created_time' | 'last_edited_time';
		direction: 'ascending' | 'descending';
	}>;
	page_size?: number;
	start_cursor?: string;
}

export interface QueryDatabaseResponse {
	object: 'list';
	results: NotionPage[];
	next_cursor: string | null;
	has_more: boolean;
}

export interface SearchParams {
	query?: string;
	filter?: {
		property: 'object';
		value: 'page' | 'database';
	};
	sort?: {
		direction: 'ascending' | 'descending';
		timestamp: 'last_edited_time';
	};
	page_size?: number;
	start_cursor?: string;
}

export interface SearchResponse {
	object: 'list';
	results: Array<NotionPage | NotionDatabaseObject>;
	next_cursor: string | null;
	has_more: boolean;
}

export interface NotionDatabaseObject {
	id: string;
	object: 'database';
	title: Array<{ plain_text: string }>;
	description: Array<{ plain_text: string }>;
	icon: { type: string; emoji?: string; external?: { url: string } } | null;
	url: string;
	properties: Record<string, { id: string; type: string; name: string }>;
}

/**
 * Notion API Client
 */
export class NotionClient {
	private accessToken: string;

	constructor(config: NotionClientConfig) {
		this.accessToken = config.accessToken;
	}

	private async request<T>(
		endpoint: string,
		options: RequestInit = {}
	): Promise<T> {
		const response = await fetch(`${NOTION_API_BASE}${endpoint}`, {
			...options,
			headers: {
				'Authorization': `Bearer ${this.accessToken}`,
				'Notion-Version': NOTION_VERSION,
				'Content-Type': 'application/json',
				...options.headers
			}
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`Notion API error: ${response.status} ${error}`);
		}

		return response.json();
	}

	/**
	 * List all databases the integration has access to.
	 */
	async listDatabases(): Promise<NotionDatabase[]> {
		const response = await this.search({
			filter: { property: 'object', value: 'database' },
			page_size: 100
		});

		return response.results
			.filter((r): r is NotionDatabaseObject => r.object === 'database')
			.map(db => ({
				id: db.id,
				title: db.title.map(t => t.plain_text).join(''),
				description: db.description.map(d => d.plain_text).join('') || null,
				icon: db.icon?.emoji || db.icon?.external?.url || null,
				url: db.url
			}));
	}

	/**
	 * Query a database with optional filters and sorts.
	 */
	async queryDatabase(
		databaseId: string,
		params: QueryDatabaseParams = {}
	): Promise<QueryDatabaseResponse> {
		return this.request<QueryDatabaseResponse>(
			`/databases/${databaseId}/query`,
			{
				method: 'POST',
				body: JSON.stringify(params)
			}
		);
	}

	/**
	 * Get a single page by ID.
	 */
	async getPage(pageId: string): Promise<NotionPage> {
		return this.request<NotionPage>(`/pages/${pageId}`);
	}

	/**
	 * Create a new page in a database.
	 */
	async createPage(
		databaseId: string,
		properties: Record<string, unknown>,
		content?: Array<Record<string, unknown>>
	): Promise<NotionPage> {
		const body: Record<string, unknown> = {
			parent: { database_id: databaseId },
			properties
		};

		if (content) {
			body.children = content;
		}

		return this.request<NotionPage>('/pages', {
			method: 'POST',
			body: JSON.stringify(body)
		});
	}

	/**
	 * Update an existing page's properties.
	 */
	async updatePage(
		pageId: string,
		properties: Record<string, unknown>
	): Promise<NotionPage> {
		return this.request<NotionPage>(`/pages/${pageId}`, {
			method: 'PATCH',
			body: JSON.stringify({ properties })
		});
	}

	/**
	 * Archive (delete) a page.
	 */
	async archivePage(pageId: string): Promise<NotionPage> {
		return this.request<NotionPage>(`/pages/${pageId}`, {
			method: 'PATCH',
			body: JSON.stringify({ archived: true })
		});
	}

	/**
	 * Search across the workspace.
	 */
	async search(params: SearchParams = {}): Promise<SearchResponse> {
		return this.request<SearchResponse>('/search', {
			method: 'POST',
			body: JSON.stringify(params)
		});
	}

	/**
	 * Get block children (page content).
	 */
	async getBlockChildren(
		blockId: string,
		startCursor?: string
	): Promise<{ results: unknown[]; next_cursor: string | null; has_more: boolean }> {
		const params = startCursor ? `?start_cursor=${startCursor}` : '';
		return this.request(`/blocks/${blockId}/children${params}`);
	}

	/**
	 * Append blocks to a page.
	 */
	async appendBlocks(
		pageId: string,
		children: Array<Record<string, unknown>>
	): Promise<{ results: unknown[] }> {
		return this.request(`/blocks/${pageId}/children`, {
			method: 'PATCH',
			body: JSON.stringify({ children })
		});
	}

	/**
	 * Get database schema.
	 */
	async getDatabase(databaseId: string): Promise<NotionDatabaseObject> {
		return this.request<NotionDatabaseObject>(`/databases/${databaseId}`);
	}
}

/**
 * Create a Notion client with the given access token.
 */
export function createNotionClient(accessToken: string): NotionClient {
	return new NotionClient({ accessToken });
}
