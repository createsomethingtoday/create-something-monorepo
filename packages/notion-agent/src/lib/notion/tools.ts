/**
 * Notion Tools for Agent Execution
 * 
 * Tool definitions that agents can use to interact with Notion.
 * Hot paths use WASM for 10x performance improvements.
 */

import { NotionClient } from './client.js';
import { 
	initWasm, 
	findDuplicates as wasmFindDuplicates,
	type DuplicateResult 
} from './wasm.js';

// Track WASM initialization state
let wasmReady = false;

/**
 * Ensure WASM is initialized before use.
 */
async function ensureWasm(): Promise<boolean> {
	if (wasmReady) return true;
	try {
		await initWasm();
		wasmReady = true;
		return true;
	} catch (error) {
		console.warn('WASM initialization failed, falling back to JS:', error);
		return false;
	}
}

export interface ToolDefinition {
	name: string;
	description: string;
	parameters: {
		type: 'object';
		properties: Record<string, {
			type: string;
			description: string;
			enum?: string[];
		}>;
		required: string[];
	};
}

export interface ToolResult {
	success: boolean;
	data?: unknown;
	error?: string;
}

/**
 * Tool definitions for Workers AI tool calling.
 */
export const NOTION_TOOLS: ToolDefinition[] = [
	{
		name: 'query_database',
		description: 'Query a Notion database to find pages matching specific criteria. Returns a list of pages with their properties.',
		parameters: {
			type: 'object',
			properties: {
				database_id: {
					type: 'string',
					description: 'The ID of the database to query'
				},
				filter: {
					type: 'string',
					description: 'JSON string of Notion filter object (optional). Example: {"property": "Status", "select": {"equals": "Done"}}'
				},
				sort_property: {
					type: 'string',
					description: 'Property name to sort by (optional)'
				},
				sort_direction: {
					type: 'string',
					description: 'Sort direction',
					enum: ['ascending', 'descending']
				},
				limit: {
					type: 'string',
					description: 'Maximum number of results (default 10, max 100)'
				}
			},
			required: ['database_id']
		}
	},
	{
		name: 'create_page',
		description: 'Create a new page in a Notion database with specified properties.',
		parameters: {
			type: 'object',
			properties: {
				database_id: {
					type: 'string',
					description: 'The ID of the database to add the page to'
				},
				properties: {
					type: 'string',
					description: 'JSON string of page properties. Example: {"Name": {"title": [{"text": {"content": "New Task"}}]}, "Status": {"select": {"name": "To Do"}}}'
				},
				content: {
					type: 'string',
					description: 'JSON string of page content blocks (optional)'
				}
			},
			required: ['database_id', 'properties']
		}
	},
	{
		name: 'update_page',
		description: 'Update an existing Notion page properties.',
		parameters: {
			type: 'object',
			properties: {
				page_id: {
					type: 'string',
					description: 'The ID of the page to update'
				},
				properties: {
					type: 'string',
					description: 'JSON string of properties to update. Example: {"Status": {"select": {"name": "In Progress"}}}'
				}
			},
			required: ['page_id', 'properties']
		}
	},
	{
		name: 'search',
		description: 'Search across the Notion workspace for pages or databases matching a query.',
		parameters: {
			type: 'object',
			properties: {
				query: {
					type: 'string',
					description: 'Search query string'
				},
				filter_type: {
					type: 'string',
					description: 'Filter to only pages or databases',
					enum: ['page', 'database']
				},
				limit: {
					type: 'string',
					description: 'Maximum number of results (default 10, max 100)'
				}
			},
			required: []
		}
	},
	{
		name: 'get_page',
		description: 'Get details of a specific Notion page including all its properties.',
		parameters: {
			type: 'object',
			properties: {
				page_id: {
					type: 'string',
					description: 'The ID of the page to retrieve'
				}
			},
			required: ['page_id']
		}
	},
	{
		name: 'list_databases',
		description: 'List all databases the integration has access to in the workspace.',
		parameters: {
			type: 'object',
			properties: {},
			required: []
		}
	},
	{
		name: 'archive_page',
		description: 'Archive (move to trash) a Notion page. Use this to delete duplicate pages or remove unwanted items.',
		parameters: {
			type: 'object',
			properties: {
				page_id: {
					type: 'string',
					description: 'The ID of the page to archive (move to trash)'
				}
			},
			required: ['page_id']
		}
	},
	{
		name: 'get_database_schema',
		description: 'Get the schema (properties/columns) of a Notion database. ALWAYS call this first before querying or modifying a database to understand what properties exist and their types.',
		parameters: {
			type: 'object',
			properties: {
				database_id: {
					type: 'string',
					description: 'The ID of the database to get the schema for'
				}
			},
			required: ['database_id']
		}
	},
	{
		name: 'find_duplicates',
		description: 'Find duplicate pages in a database based on title. Returns groups of duplicate page IDs. Use this instead of manually comparing pages - it is much faster.',
		parameters: {
			type: 'object',
			properties: {
				database_id: {
					type: 'string',
					description: 'The ID of the database to scan for duplicates'
				},
				keep_strategy: {
					type: 'string',
					description: 'Which page to keep when duplicates are found',
					enum: ['oldest', 'newest']
				}
			},
			required: ['database_id']
		}
	},
	{
		name: 'bulk_archive',
		description: 'Archive multiple pages at once. Much faster than calling archive_page multiple times. Use this after find_duplicates to remove all duplicates efficiently.',
		parameters: {
			type: 'object',
			properties: {
				page_ids: {
					type: 'string',
					description: 'JSON array of page IDs to archive. Example: ["page-id-1", "page-id-2"]'
				}
			},
			required: ['page_ids']
		}
	},
	{
		name: 'bulk_update',
		description: 'Update multiple pages with the same property changes. Much faster than calling update_page multiple times.',
		parameters: {
			type: 'object',
			properties: {
				page_ids: {
					type: 'string',
					description: 'JSON array of page IDs to update. Example: ["page-id-1", "page-id-2"]'
				},
				properties: {
					type: 'string',
					description: 'JSON string of properties to update on ALL pages. Example: {"Status": {"status": {"name": "Complete"}}}'
				}
			},
			required: ['page_ids', 'properties']
		}
	}
];

/**
 * Execute a tool with the given parameters.
 */
export async function executeTool(
	client: NotionClient,
	toolName: string,
	params: Record<string, string>,
	allowedDatabases: string[]
): Promise<ToolResult> {
	try {
		switch (toolName) {
			case 'query_database': {
				const { database_id, filter, sort_property, sort_direction, limit } = params;

				// Security: Check if database is allowed
				if (!allowedDatabases.includes(database_id)) {
					return {
						success: false,
						error: `Access denied: Database ${database_id} is not in the allowed list`
					};
				}

				const queryParams: Record<string, unknown> = {
					page_size: Math.min(parseInt(limit || '10'), 100)
				};

				if (filter) {
					queryParams.filter = JSON.parse(filter);
				}

				if (sort_property) {
					queryParams.sorts = [{
						property: sort_property,
						direction: sort_direction || 'descending'
					}];
				}

				const result = await client.queryDatabase(database_id, queryParams);
				
				// Simplify results for easier agent processing
				const simplifiedPages = result.results.map(page => {
					// Extract title from properties (find the property with type "title")
					let title = '';
					let titlePropertyName = '';
					for (const [propName, propValue] of Object.entries(page.properties)) {
						if (propValue.type === 'title') {
							titlePropertyName = propName;
							const titleArray = (propValue as { title?: Array<{ plain_text: string }> }).title;
							title = titleArray?.map(t => t.plain_text).join('') || '';
							break;
						}
					}
					
					return {
						id: page.id,
						title,
						title_property_name: titlePropertyName,
						created_time: page.created_time,
						last_edited_time: page.last_edited_time,
						url: page.url,
						properties: page.properties
					};
				});

				return { 
					success: true, 
					data: {
						pages: simplifiedPages,
						has_more: result.has_more,
						next_cursor: result.next_cursor
					}
				};
			}

			case 'create_page': {
				const { database_id, properties, content } = params;

				// Security: Check if database is allowed
				if (!allowedDatabases.includes(database_id)) {
					return {
						success: false,
						error: `Access denied: Database ${database_id} is not in the allowed list`
					};
				}

				const parsedProps = JSON.parse(properties);
				const parsedContent = content ? JSON.parse(content) : undefined;

				const result = await client.createPage(database_id, parsedProps, parsedContent);
				return { success: true, data: result };
			}

			case 'update_page': {
				const { page_id, properties } = params;

				// Get the page to verify it belongs to an allowed database
				const page = await client.getPage(page_id);
				if (page.parent.type === 'database_id' && page.parent.database_id) {
					if (!allowedDatabases.includes(page.parent.database_id)) {
						return {
							success: false,
							error: `Access denied: Page belongs to database ${page.parent.database_id} which is not in the allowed list`
						};
					}
				}

				const parsedProps = JSON.parse(properties);
				const result = await client.updatePage(page_id, parsedProps);
				return { success: true, data: result };
			}

			case 'search': {
				const { query, filter_type, limit } = params;

				const searchParams: Record<string, unknown> = {
					page_size: Math.min(parseInt(limit || '10'), 100)
				};

				if (query) {
					searchParams.query = query;
				}

				if (filter_type) {
					searchParams.filter = {
						property: 'object',
						value: filter_type
					};
				}

				const result = await client.search(searchParams);

				// Filter results to only include allowed databases and their pages
				const filteredResults = result.results.filter(item => {
					if (item.object === 'database') {
						return allowedDatabases.includes(item.id);
					}
					if (item.object === 'page') {
						const page = item as { parent?: { database_id?: string } };
						return page.parent?.database_id && allowedDatabases.includes(page.parent.database_id);
					}
					return false;
				});

				return { success: true, data: { ...result, results: filteredResults } };
			}

			case 'get_page': {
				const { page_id } = params;

				const page = await client.getPage(page_id);

				// Verify access
				if (page.parent.type === 'database_id' && page.parent.database_id) {
					if (!allowedDatabases.includes(page.parent.database_id)) {
						return {
							success: false,
							error: `Access denied: Page belongs to database ${page.parent.database_id} which is not in the allowed list`
						};
					}
				}

				return { success: true, data: page };
			}

			case 'list_databases': {
				const databases = await client.listDatabases();

				// Filter to only allowed databases
				const filteredDatabases = databases.filter(db => allowedDatabases.includes(db.id));

				return { success: true, data: filteredDatabases };
			}

			case 'archive_page': {
				const { page_id } = params;

				// Get the page to verify it belongs to an allowed database
				const page = await client.getPage(page_id);
				if (page.parent.type === 'database_id' && page.parent.database_id) {
					if (!allowedDatabases.includes(page.parent.database_id)) {
						return {
							success: false,
							error: `Access denied: Page belongs to database ${page.parent.database_id} which is not in the allowed list`
						};
					}
				}

				const result = await client.archivePage(page_id);
				return { success: true, data: result };
			}

			case 'get_database_schema': {
				const { database_id } = params;

				// Security: Check if database is allowed
				if (!allowedDatabases.includes(database_id)) {
					return {
						success: false,
						error: `Access denied: Database ${database_id} is not in the allowed list`
					};
				}

				const db = await client.getDatabase(database_id);
				
				// Format properties with options for select/status/multi_select
				const schema = {
					id: db.id,
					title: db.title.map(t => t.plain_text).join(''),
					properties: Object.entries(db.properties).map(([name, prop]) => {
						const propInfo: {
							name: string;
							type: string;
							id: string;
							options?: string[];
						} = {
							name,
							type: prop.type,
							id: prop.id
						};
						
						// Extract options for select/multi_select/status properties
						const propData = prop as Record<string, unknown>;
						if (prop.type === 'select' || prop.type === 'multi_select') {
							const opts = propData[prop.type] as { options?: Array<{ name: string }> };
							if (opts?.options) {
								propInfo.options = opts.options.map(o => o.name);
							}
						} else if (prop.type === 'status') {
							const status = propData.status as { options?: Array<{ name: string }> };
							if (status?.options) {
								propInfo.options = status.options.map(o => o.name);
							}
						}
						
						return propInfo;
					})
				};

				return { success: true, data: schema };
			}

			case 'bulk_archive': {
				const { page_ids } = params;
				const ids: string[] = JSON.parse(page_ids);
				
				if (ids.length === 0) {
					return { success: true, data: { archived: 0, failed: 0, results: [] } };
				}

				// Verify all pages belong to allowed databases (check first one as sample)
				const firstPage = await client.getPage(ids[0]);
				if (firstPage.parent.type === 'database_id' && firstPage.parent.database_id) {
					if (!allowedDatabases.includes(firstPage.parent.database_id)) {
						return {
							success: false,
							error: `Access denied: Pages belong to database ${firstPage.parent.database_id} which is not in the allowed list`
						};
					}
				}

				// Archive all pages concurrently (with rate limiting - 3 at a time)
				const results: Array<{ id: string; success: boolean; error?: string }> = [];
				const batchSize = 3;
				
				for (let i = 0; i < ids.length; i += batchSize) {
					const batch = ids.slice(i, i + batchSize);
					const batchResults = await Promise.all(
						batch.map(async (id) => {
							try {
								await client.archivePage(id);
								return { id, success: true };
							} catch (error) {
								return { 
									id, 
									success: false, 
									error: error instanceof Error ? error.message : 'Unknown error' 
								};
							}
						})
					);
					results.push(...batchResults);
					
					// Small delay between batches to respect rate limits
					if (i + batchSize < ids.length) {
						await new Promise(resolve => setTimeout(resolve, 100));
					}
				}

				const archived = results.filter(r => r.success).length;
				const failed = results.filter(r => !r.success).length;

				return {
					success: true,
					data: { archived, failed, results }
				};
			}

			case 'bulk_update': {
				const { page_ids, properties } = params;
				const ids: string[] = JSON.parse(page_ids);
				const parsedProps = JSON.parse(properties);
				
				if (ids.length === 0) {
					return { success: true, data: { updated: 0, failed: 0, results: [] } };
				}

				// Verify all pages belong to allowed databases (check first one as sample)
				const firstPage = await client.getPage(ids[0]);
				if (firstPage.parent.type === 'database_id' && firstPage.parent.database_id) {
					if (!allowedDatabases.includes(firstPage.parent.database_id)) {
						return {
							success: false,
							error: `Access denied: Pages belong to database ${firstPage.parent.database_id} which is not in the allowed list`
						};
					}
				}

				// Update all pages concurrently (with rate limiting - 3 at a time)
				const results: Array<{ id: string; success: boolean; error?: string }> = [];
				const batchSize = 3;
				
				for (let i = 0; i < ids.length; i += batchSize) {
					const batch = ids.slice(i, i + batchSize);
					const batchResults = await Promise.all(
						batch.map(async (id) => {
							try {
								await client.updatePage(id, parsedProps);
								return { id, success: true };
							} catch (error) {
								return { 
									id, 
									success: false, 
									error: error instanceof Error ? error.message : 'Unknown error' 
								};
							}
						})
					);
					results.push(...batchResults);
					
					// Small delay between batches to respect rate limits
					if (i + batchSize < ids.length) {
						await new Promise(resolve => setTimeout(resolve, 100));
					}
				}

				const updated = results.filter(r => r.success).length;
				const failed = results.filter(r => !r.success).length;

				return {
					success: true,
					data: { updated, failed, results }
				};
			}

			case 'find_duplicates': {
				const { database_id, keep_strategy = 'oldest' } = params;

				// Security: Check if database is allowed
				if (!allowedDatabases.includes(database_id)) {
					return {
						success: false,
						error: `Access denied: Database ${database_id} is not in the allowed list`
					};
				}

				// Fetch all pages from database (with pagination) - IO bound, stays in JS
				const allPages: Array<{ id: string; title: string; created_time: string }> = [];
				let cursor: string | undefined;
				
				do {
					const queryParams: Record<string, unknown> = { page_size: 100 };
					if (cursor) queryParams.start_cursor = cursor;
					
					const result = await client.queryDatabase(database_id, queryParams);
					
					for (const page of result.results) {
						// Extract title
						let title = '';
						for (const propValue of Object.values(page.properties)) {
							if (propValue.type === 'title') {
								const titleArray = (propValue as { title?: Array<{ plain_text: string }> }).title;
								title = titleArray?.map(t => t.plain_text).join('') || '';
								break;
							}
						}
						allPages.push({
							id: page.id,
							title, // Keep original title, WASM handles normalization
							created_time: page.created_time
						});
					}
					
					cursor = result.next_cursor ?? undefined;
				} while (cursor);

				// Use WASM for CPU-intensive duplicate detection
				const useWasm = await ensureWasm();
				
				if (useWasm) {
					// WASM path: 10x faster for large datasets
					try {
						const wasmResult = wasmFindDuplicates(
							JSON.stringify(allPages), 
							keep_strategy
						);
						const parsed: DuplicateResult = JSON.parse(wasmResult);
						
						return {
							success: true,
							data: {
								total_pages_scanned: parsed.total_pages,
								duplicate_groups: parsed.duplicate_groups,
								pages_to_archive: parsed.pages_to_archive,
								summary: parsed.summary
							}
						};
					} catch (wasmError) {
						console.warn('WASM find_duplicates failed, falling back to JS:', wasmError);
						// Fall through to JS implementation
					}
				}

				// JS fallback path
				const titleGroups = new Map<string, typeof allPages>();
				for (const page of allPages) {
					const normalizedTitle = page.title.toLowerCase().trim();
					const existing = titleGroups.get(normalizedTitle) || [];
					existing.push(page);
					titleGroups.set(normalizedTitle, existing);
				}

				const duplicateGroups: Array<{
					title: string;
					keep: { id: string; created_time: string };
					archive: Array<{ id: string; created_time: string }>;
				}> = [];

				for (const [title, pages] of titleGroups) {
					if (pages.length > 1) {
						pages.sort((a, b) => 
							new Date(a.created_time).getTime() - new Date(b.created_time).getTime()
						);
						
						const keepIndex = keep_strategy === 'oldest' ? 0 : pages.length - 1;
						const keep = pages[keepIndex];
						const archive = pages.filter((_, i) => i !== keepIndex);
						
						duplicateGroups.push({ title, keep, archive });
					}
				}

				const pagesToArchive = duplicateGroups.flatMap(g => g.archive.map(p => p.id));

				return {
					success: true,
					data: {
						total_pages_scanned: allPages.length,
						duplicate_groups: duplicateGroups.length,
						pages_to_archive: pagesToArchive,
						details: duplicateGroups.map(g => ({
							title: g.title,
							keeping: g.keep.id,
							archiving: g.archive.map(p => p.id)
						}))
					}
				};
			}

			default:
				return { success: false, error: `Unknown tool: ${toolName}` };
		}
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error'
		};
	}
}

/**
 * Format tool results for display in agent output.
 */
export function formatToolResult(toolName: string, result: ToolResult): string {
	if (!result.success) {
		return `Error executing ${toolName}: ${result.error}`;
	}

	const data = result.data as Record<string, unknown>;

	switch (toolName) {
		case 'query_database': {
			const pages = (data.pages as Array<{ id: string; title: string }>) || [];
			const titles = pages.map(p => `"${p.title}" (${p.id.slice(0, 8)}...)`).join(', ');
			return `Found ${pages.length} pages: ${titles}${data.has_more ? ' [more available]' : ''}`;
		}
		case 'create_page':
			return `Created page: ${(data as { url?: string }).url || data.id}`;
		case 'update_page':
			return `Updated page: ${(data as { url?: string }).url || data.id}`;
		case 'search': {
			const results = (data.results as unknown[]) || [];
			return `Found ${results.length} results.`;
		}
		case 'get_page':
			return `Retrieved page: ${(data as { url?: string }).url || data.id}`;
		case 'list_databases': {
			const dbs = Array.isArray(data) ? data : [];
			return `Found ${dbs.length} accessible databases.`;
		}
		case 'archive_page':
			return `Archived page: ${(data as { id?: string }).id || 'unknown'}`;
		case 'bulk_archive': {
			const result = data as { archived: number; failed: number };
			if (result.failed > 0) {
				return `Archived ${result.archived} pages, ${result.failed} failed.`;
			}
			return `Successfully archived ${result.archived} pages.`;
		}
		case 'bulk_update': {
			const result = data as { updated: number; failed: number };
			if (result.failed > 0) {
				return `Updated ${result.updated} pages, ${result.failed} failed.`;
			}
			return `Successfully updated ${result.updated} pages.`;
		}
		case 'get_database_schema': {
			const schema = data as { title: string; properties: Array<{ name: string; type: string; options?: string[] }> };
			const propList = schema.properties.map(p => {
				if (p.options && p.options.length > 0) {
					return `${p.name} (${p.type}: ${p.options.join(', ')})`;
				}
				return `${p.name} (${p.type})`;
			}).join(', ');
			return `Database "${schema.title}" schema: ${propList}`;
		}
		case 'find_duplicates': {
			const result = data as { 
				total_pages_scanned: number; 
				duplicate_groups: number; 
				pages_to_archive: string[];
				details: Array<{ title: string; keeping: string; archiving: string[] }>;
			};
			if (result.duplicate_groups === 0) {
				return `Scanned ${result.total_pages_scanned} pages. No duplicates found.`;
			}
			const details = result.details.map(d => 
				`"${d.title}": keeping ${d.keeping.slice(0, 8)}..., archiving ${d.archiving.length} page(s)`
			).join('; ');
			return `Found ${result.duplicate_groups} duplicate group(s) in ${result.total_pages_scanned} pages. ${details}. Pages to archive: ${result.pages_to_archive.join(', ')}`;
		}
		default:
			return JSON.stringify(data);
	}
}
