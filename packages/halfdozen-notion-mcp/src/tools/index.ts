/**
 * Register all Notion tools on the MCP server.
 * Tool descriptions include workspace guidance and schema-first hint where relevant.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { NotionClients } from '../lib/notion.js';
import {
  notionSearchSchema,
  notionListDatabasesSchema,
  notionGetDatabaseSchema,
  notionQueryDatabaseSchema,
  notionGetPageSchema,
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

const WORKSPACE_HINT = "Pass workspace: 'halfdozen' or 'client'. See notion://workspaces resource for which workspace is which.";

export function registerNotionTools(server: McpServer, clients: NotionClients): void {
  server.tool(
    'notion_search',
    `Search the Notion workspace for pages or data sources (Notion API 2025-09-03). filter_type: 'page' or 'data_source'. ${WORKSPACE_HINT}`,
    notionSearchSchema.shape,
    (params) => handleNotionSearch(clients, params as Parameters<typeof handleNotionSearch>[1])
  );

  server.tool(
    'notion_list_databases',
    `List all data sources the integration can access (Notion API 2025-09-03). Returns data_sources with id, title, url. ${WORKSPACE_HINT}`,
    notionListDatabasesSchema.shape,
    (params) => handleNotionListDatabases(clients, params as { workspace: 'halfdozen' | 'client' })
  );

  server.tool(
    'notion_get_database',
    `Get data source schema (property names and types). Notion API 2025-09-03. Call this first before query/update/create. Use data_source_id from Notion: Database settings → Manage Data Sources → Copy data source ID. ${WORKSPACE_HINT}`,
    notionGetDatabaseSchema.shape,
    (params) => handleNotionGetDatabase(clients, params as { workspace: 'halfdozen' | 'client'; data_source_id: string })
  );

  server.tool(
    'notion_query_database',
    `Query a data source with optional filter and sort (Notion API 2025-09-03). Call notion_get_database first to get property names and valid values. ${WORKSPACE_HINT}`,
    notionQueryDatabaseSchema.shape,
    (params) => handleNotionQueryDatabase(clients, params as Parameters<typeof handleNotionQueryDatabase>[1])
  );

  server.tool(
    'notion_get_page',
    `Get a page by ID (properties and metadata). ${WORKSPACE_HINT}`,
    notionGetPageSchema.shape,
    (params) => handleNotionGetPage(clients, params as { workspace: 'halfdozen' | 'client'; page_id: string })
  );

  server.tool(
    'notion_create_page',
    `Create a new page in a data source (Notion API 2025-09-03). Use data_source_id. Call notion_get_database first to get property names and types. ${WORKSPACE_HINT}`,
    notionCreatePageSchema.shape,
    (params) => handleNotionCreatePage(clients, params as Parameters<typeof handleNotionCreatePage>[1])
  );

  server.tool(
    'notion_update_page',
    `Update a page's properties. Call notion_get_database first to use correct property names and select/status values. ${WORKSPACE_HINT}`,
    notionUpdatePageSchema.shape,
    (params) => handleNotionUpdatePage(clients, params as Parameters<typeof handleNotionUpdatePage>[1])
  );

  server.tool(
    'notion_append_blocks',
    `Append blocks (paragraph, heading, list, etc.) to a page. ${WORKSPACE_HINT}`,
    notionAppendBlocksSchema.shape,
    (params) => handleNotionAppendBlocks(clients, params as Parameters<typeof handleNotionAppendBlocks>[1])
  );

  server.tool(
    'notion_archive_page',
    `Archive (move to trash) a page. ${WORKSPACE_HINT}`,
    notionArchivePageSchema.shape,
    (params) => handleNotionArchivePage(clients, params as { workspace: 'halfdozen' | 'client'; page_id: string })
  );

  server.tool(
    'notion_archive_block',
    `Archive a block (move to trash). Use to revert appended content; block_id comes from notion_append_blocks results or block children. ${WORKSPACE_HINT}`,
    notionArchiveBlockSchema.shape,
    (params) => handleNotionArchiveBlock(clients, params as { workspace: 'halfdozen' | 'client'; block_id: string })
  );

  server.tool(
    'notion_bulk_update',
    `Update multiple pages with the same property changes. Fewer round-trips than calling notion_update_page repeatedly. ${WORKSPACE_HINT}`,
    notionBulkUpdateSchema.shape,
    (params) => handleNotionBulkUpdate(clients, params as Parameters<typeof handleNotionBulkUpdate>[1])
  );

  server.tool(
    'notion_bulk_archive',
    `Archive multiple pages in one go (e.g. after finding duplicates or cleaning up). ${WORKSPACE_HINT}`,
    notionBulkArchiveSchema.shape,
    (params) => handleNotionBulkArchive(clients, params as { workspace: 'halfdozen' | 'client'; page_ids: string[] })
  );

  server.tool(
    'notion_create_database',
    `Create a new database (with initial data source and property schema) as a child of a page. Returns database_id, data_source_id, and the actual schema. Note: "status" type properties are auto-converted to "select" (Notion API limitation). ${WORKSPACE_HINT}`,
    notionCreateDatabaseSchema.shape,
    (params) => handleNotionCreateDatabase(clients, params as Parameters<typeof handleNotionCreateDatabase>[1])
  );

  server.tool(
    'notion_update_database',
    `Update a database's title/description and/or modify its property schema (add, rename, or delete columns). data_source_id is auto-resolved if omitted. "status" type auto-converts to "select". Returns updated schema. ${WORKSPACE_HINT}`,
    notionUpdateDatabaseSchema.shape,
    (params) => handleNotionUpdateDatabase(clients, params as Parameters<typeof handleNotionUpdateDatabase>[1])
  );
}
