/**
 * Zod schemas for Notion Half Dozen X CREATE SOMETHING tools.
 * All tools require workspace: 'halfdozen' | 'client'.
 */

import { z } from 'zod';

export const workspaceSchema = z.enum(['halfdozen', 'client']).describe(
  "Use 'halfdozen' for internal Half Dozen data (Meeting Capture, meeting transcripts). Use 'client' for the client's Notion database you're doing work for."
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
