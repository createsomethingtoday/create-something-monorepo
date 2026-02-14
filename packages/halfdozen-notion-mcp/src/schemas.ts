/**
 * Zod schemas for Notion Half Dozen X CREATE SOMETHING tools.
 * All tools require workspace: 'halfdozen' | 'client'.
 */

import { z } from 'zod';

export const workspaceSchema = z.enum(['halfdozen', 'client']).describe(
  "Pass 'halfdozen' or 'client'. See notion://workspaces resource for which workspace is which."
);

// Shared for tools that need only workspace + one or two params
export const notionSearchSchema = z.object({
  workspace: workspaceSchema,
  query: z.string().optional().describe('Search query string'),
  filter_type: z.enum(['page', 'data_source']).optional().describe('Filter to only pages or data sources (Notion API 2025-09-03)'),
  page_size: z.number().min(1).max(100).default(10).describe('Maximum results (default 10)'),
});

export const notionListDatabasesSchema = z.object({
  workspace: workspaceSchema,
  page_size: z.number().min(1).max(100).default(100).describe('Maximum results per page (default 100)'),
  start_cursor: z.string().optional().describe('Pagination cursor from previous response'),
});

export const notionGetDatabaseSchema = z.object({
  workspace: workspaceSchema,
  data_source_id: z.string().describe('Data source ID (Notion API 2025-09-03). In Notion: Database settings → Manage Data Sources → Copy data source ID. Call this first before query/update/create to get schema.'),
});

export const notionQueryDatabaseSchema = z.object({
  workspace: workspaceSchema,
  data_source_id: z.string().describe('Data source ID to query (Notion API 2025-09-03). From Database settings → Manage Data Sources → Copy data source ID.'),
  filter: z.string().optional().describe('JSON string of Notion filter object'),
  sort_property: z.string().optional().describe('Property name to sort by'),
  sort_direction: z.enum(['ascending', 'descending']).optional().default('descending'),
  page_size: z.number().min(1).max(100).default(10),
  start_cursor: z.string().optional(),
});

export const notionGetPageSchema = z.object({
  workspace: workspaceSchema,
  page_id: z.string().describe('The ID of the page to retrieve'),
});

export const notionListBlockChildrenSchema = z.object({
  workspace: workspaceSchema,
  block_id: z.string().describe('The ID of the block (or page) whose children to list'),
  page_size: z.number().min(1).max(100).default(100).describe('Maximum child blocks to return (default 100)'),
  start_cursor: z.string().optional().describe('Pagination cursor from previous response'),
});

export const notionCreatePageSchema = z.object({
  workspace: workspaceSchema,
  data_source_id: z.string().describe('Data source ID to add the page to (Notion API 2025-09-03). From Database settings → Manage Data Sources → Copy data source ID.'),
  properties: z.record(z.unknown()).describe('Notion property values (e.g. title, select, date)'),
  content: z.array(z.record(z.unknown())).optional().describe('Optional block children (paragraph, heading, etc.)'),
});

export const notionUpdatePageSchema = z.object({
  workspace: workspaceSchema,
  page_id: z.string().describe('The ID of the page to update'),
  properties: z.record(z.unknown()).describe('Properties to update (partial)'),
});

export const notionAppendBlocksSchema = z.object({
  workspace: workspaceSchema,
  page_id: z.string().describe('The ID of the page to append blocks to'),
  children: z.array(z.record(z.unknown())).describe('Notion block objects (paragraph, heading, bulleted_list_item, etc.)'),
});

export const notionArchivePageSchema = z.object({
  workspace: workspaceSchema,
  page_id: z.string().describe('The ID of the page to archive (move to trash)'),
});

export const notionBulkUpdateSchema = z.object({
  workspace: workspaceSchema,
  page_ids: z.array(z.string()).min(1).max(100).describe('Page IDs to update'),
  properties: z.record(z.unknown()).describe('Properties to set on all pages'),
});

export const notionBulkArchiveSchema = z.object({
  workspace: workspaceSchema,
  page_ids: z.array(z.string()).min(1).max(100).describe('Page IDs to archive'),
});

export const notionArchiveBlockSchema = z.object({
  workspace: workspaceSchema,
  block_id: z.string().describe('The ID of the block to archive (move to trash). Returned from notion_append_blocks or from block children.'),
});

export const notionCreateDatabaseSchema = z.object({
  workspace: workspaceSchema,
  parent_page_id: z.string().describe('The page ID to create the database under (as a child).'),
  title: z.string().describe('Database title (plain text).'),
  properties: z.record(z.unknown()).describe('Property schema for the initial data source. E.g. { "Name": { "title": {} }, "Status": { "select": { "options": [{ "name": "To Do" }, { "name": "Done" }] } } }'),
  is_inline: z.boolean().optional().default(false).describe('If true, database renders inline in the parent page (like an embedded table). Default false.'),
});

export const notionUpdateDatabaseSchema = z.object({
  workspace: workspaceSchema,
  database_id: z.string().describe('The database ID to update.'),
  title: z.string().optional().describe('New database title (plain text). Omit to leave unchanged.'),
  description: z.string().optional().describe('New database description (plain text). Omit to leave unchanged.'),
  data_source_id: z.string().optional().describe('Data source ID for property updates. Omit to auto-resolve from the first data source in the database.'),
  properties: z.record(z.unknown()).optional().describe('Updated property schema for the data source. E.g. { "Status": { "select": { "options": [{ "name": "To Do" }, { "name": "Done" }] } } }. Pass null for a property name to delete it. Returns updated schema.'),
});
