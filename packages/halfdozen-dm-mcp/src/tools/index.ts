/**
 * Register all Notion tools on the MCP server.
 * Tool descriptions use single-workspace DM guidance.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Client } from '@notionhq/client';
import {
  notionSearchSchema,
  notionListDatabasesSchema,
  notionGetDatabaseSchema,
  notionQueryDatabaseSchema,
  notionGetPageSchema,
  notionListBlockChildrenSchema,
  notionCreatePageSchema,
  notionUpdatePageSchema,
  notionAppendBlocksSchema,
  notionArchivePageSchema,
  notionArchiveBlockSchema,
  notionBulkUpdateSchema,
  notionBulkArchiveSchema,
  notionCreateDatabaseSchema,
  notionUpdateDatabaseSchema,
} from '../schemas.js';
import {
  handleNotionSearch,
  handleNotionListDatabases,
  handleNotionGetDatabase,
  handleNotionQueryDatabase,
  handleNotionGetPage,
  handleNotionListBlockChildren,
  handleNotionCreatePage,
  handleNotionUpdatePage,
  handleNotionAppendBlocks,
  handleNotionArchivePage,
  handleNotionArchiveBlock,
  handleNotionBulkUpdate,
  handleNotionBulkArchive,
  handleNotionCreateDatabase,
  handleNotionUpdateDatabase,
} from './handlers.js';

const DM_HINT = 'All calls target the DM client workspace configured on this server.';

export function registerNotionTools(server: McpServer, notionClient: Client): void {
  server.tool(
    'notion_search',
    `Search the Notion workspace for pages or data sources (Notion API 2025-09-03). filter_type: 'page' or 'data_source'. ${DM_HINT}`,
    notionSearchSchema.shape,
    (params) => handleNotionSearch(notionClient, params as Parameters<typeof handleNotionSearch>[1])
  );

  server.tool(
    'notion_list_databases',
    `List data sources the integration can access (Notion API 2025-09-03). Supports pagination via page_size/start_cursor and returns has_more/next_cursor. Default page_size is 25 for faster responses. ${DM_HINT}`,
    notionListDatabasesSchema.shape,
    (params) =>
      handleNotionListDatabases(
        notionClient,
        params as Parameters<typeof handleNotionListDatabases>[1]
      )
  );

  server.tool(
    'notion_get_database',
    `Get data source schema (property names and types). Notion API 2025-09-03. Call this first before query/update/create. Use data_source_id from Notion: Database settings → Manage Data Sources → Copy data source ID. ${DM_HINT}`,
    notionGetDatabaseSchema.shape,
    (params) => handleNotionGetDatabase(notionClient, params as { data_source_id: string })
  );

  server.tool(
    'notion_query_database',
    `Query a data source with optional filter and sort (Notion API 2025-09-03). Call notion_get_database first to get property names and valid values. ${DM_HINT}`,
    notionQueryDatabaseSchema.shape,
    (params) =>
      handleNotionQueryDatabase(
        notionClient,
        params as Parameters<typeof handleNotionQueryDatabase>[1]
      )
  );

  server.tool(
    'notion_get_page',
    `Get a page by ID (properties and metadata). ${DM_HINT}`,
    notionGetPageSchema.shape,
    (params) => handleNotionGetPage(notionClient, params as { page_id: string })
  );

  server.tool(
    'notion_list_block_children',
    `List child blocks for a page/block (read page body content). Supports pagination via page_size/start_cursor. ${DM_HINT}`,
    notionListBlockChildrenSchema.shape,
    (params) =>
      handleNotionListBlockChildren(
        notionClient,
        params as Parameters<typeof handleNotionListBlockChildren>[1]
      )
  );

  server.tool(
    'notion_create_page',
    `Create a new page in a data source (Notion API 2025-09-03). Use data_source_id. Call notion_get_database first to get property names and types. ${DM_HINT}`,
    notionCreatePageSchema.shape,
    (params) =>
      handleNotionCreatePage(notionClient, params as Parameters<typeof handleNotionCreatePage>[1])
  );

  server.tool(
    'notion_update_page',
    `Update a page's properties. Call notion_get_database first to use correct property names and select/status values. ${DM_HINT}`,
    notionUpdatePageSchema.shape,
    (params) =>
      handleNotionUpdatePage(notionClient, params as Parameters<typeof handleNotionUpdatePage>[1])
  );

  server.tool(
    'notion_append_blocks',
    `Append blocks (paragraph, heading, list, etc.) to a page. ${DM_HINT}`,
    notionAppendBlocksSchema.shape,
    (params) =>
      handleNotionAppendBlocks(
        notionClient,
        params as Parameters<typeof handleNotionAppendBlocks>[1]
      )
  );

  server.tool(
    'notion_archive_page',
    `Archive (move to trash) a page. ${DM_HINT}`,
    notionArchivePageSchema.shape,
    (params) => handleNotionArchivePage(notionClient, params as { page_id: string })
  );

  server.tool(
    'notion_archive_block',
    `Archive a block (move to trash). Use to revert appended content; block_id comes from notion_append_blocks results or block children. ${DM_HINT}`,
    notionArchiveBlockSchema.shape,
    (params) => handleNotionArchiveBlock(notionClient, params as { block_id: string })
  );

  server.tool(
    'notion_bulk_update',
    `Update multiple pages with the same property changes. Fewer round-trips than calling notion_update_page repeatedly. ${DM_HINT}`,
    notionBulkUpdateSchema.shape,
    (params) =>
      handleNotionBulkUpdate(notionClient, params as Parameters<typeof handleNotionBulkUpdate>[1])
  );

  server.tool(
    'notion_bulk_archive',
    `Archive multiple pages in one go (e.g. after finding duplicates or cleaning up). ${DM_HINT}`,
    notionBulkArchiveSchema.shape,
    (params) => handleNotionBulkArchive(notionClient, params as { page_ids: string[] })
  );

  server.tool(
    'notion_create_database',
    `Create a new database (with initial data source and property schema) as a child of a page. Returns database_id, data_source_id, and the actual schema. Note: "status" type properties are auto-converted to "select" (Notion API limitation). ${DM_HINT}`,
    notionCreateDatabaseSchema.shape,
    (params) =>
      handleNotionCreateDatabase(
        notionClient,
        params as Parameters<typeof handleNotionCreateDatabase>[1]
      )
  );

  server.tool(
    'notion_update_database',
    `Update a database's title/description and/or modify its property schema (add, rename, or delete columns). data_source_id is auto-resolved if omitted. "status" type auto-converts to "select". Returns updated schema. ${DM_HINT}`,
    notionUpdateDatabaseSchema.shape,
    (params) =>
      handleNotionUpdateDatabase(
        notionClient,
        params as Parameters<typeof handleNotionUpdateDatabase>[1]
      )
  );
}

