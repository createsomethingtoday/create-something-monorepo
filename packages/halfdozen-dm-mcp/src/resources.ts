/**
 * Toolset and tool resources for the DM MCP.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { DmConfig } from './config.js';

/** Canonical list of all Notion tools this MCP exposes. */
export const DM_NOTION_TOOLS = [
  { name: 'notion_search', description: 'Search workspace for pages or data sources' },
  { name: 'notion_list_databases', description: 'List all data sources the integration can access' },
  { name: 'notion_get_database', description: 'Get data source schema (property names and types)' },
  { name: 'notion_query_database', description: 'Query a data source with filter/sort' },
  { name: 'notion_get_page', description: 'Get a page by ID' },
  { name: 'notion_list_block_children', description: 'List child blocks for a page or block' },
  { name: 'notion_create_page', description: 'Create a new page in a data source' },
  { name: 'notion_update_page', description: "Update a page's properties" },
  { name: 'notion_append_blocks', description: 'Append blocks to a page' },
  { name: 'notion_archive_page', description: 'Archive (trash) a page' },
  { name: 'notion_archive_block', description: 'Archive a block (revert appends)' },
  { name: 'notion_bulk_update', description: 'Update multiple pages with same properties' },
  { name: 'notion_bulk_archive', description: 'Archive multiple pages' },
  { name: 'notion_create_database', description: 'Create a new database under a page with property schema' },
  { name: 'notion_update_database', description: 'Update database title/description and data source properties' },
] as const;

/** Canonical list of DM Drive sync tools. */
export const DM_DRIVE_TOOLS = [
  { name: 'google_drive_connection_status', description: 'Check DM shared Google Drive connection state' },
  { name: 'google_drive_get_connect_link', description: 'Get a DM Drive OAuth connect link' },
  { name: 'google_drive_list_files', description: 'List/search files from DM Google Drive account' },
  { name: 'google_drive_sync_file_to_notion', description: 'Sync one Drive file to the DM Notion sync source' },
  { name: 'google_drive_sync_recent_to_notion', description: 'Incrementally sync recently modified Drive files' },
] as const;

export function getToolsForConfig(config: DmConfig): Array<{ name: string; description: string }> {
  const enabled = new Set(config.enabledToolsets);
  const tools: Array<{ name: string; description: string }> = [];
  if (enabled.has('notion')) tools.push(...DM_NOTION_TOOLS);
  if (enabled.has('drive')) tools.push(...DM_DRIVE_TOOLS);
  return tools;
}

export function registerToolsResource(server: McpServer, config: DmConfig): void {
  const tools = getToolsForConfig(config);
  server.resource(
    'tools',
    'dm://tools',
    {
      description: 'All DM MCP tools exposed by this server.',
      mimeType: 'application/json',
    },
    async () => ({
      contents: [
        {
          uri: 'dm://tools',
          mimeType: 'application/json',
          text: JSON.stringify(
            {
              toolsets: config.enabledToolsets,
              tools,
              hint: `This MCP currently exposes ${tools.length} tools across ${config.enabledToolsets.length} toolset(s).`,
            },
            null,
            2
          ),
        },
      ],
    })
  );
}

export function registerToolsetsResource(server: McpServer, config: DmConfig): void {
  server.resource(
    'toolsets',
    'dm://toolsets',
    {
      description: 'Enabled DM toolsets and current workspace target.',
      mimeType: 'application/json',
    },
    async () => ({
      contents: [
        {
          uri: 'dm://toolsets',
          mimeType: 'application/json',
          text: JSON.stringify(
            {
              toolsets: config.enabledToolsets,
              workspace: {
                id: 'client',
                label: config.clientLabel,
                description: config.clientDescription,
              },
              drive: {
                entity_id: config.drive.entityId,
                target_data_source_configured: Boolean(config.drive.targetDataSourceId),
                cron_enabled: config.drive.enableCron,
                cron_batch_size: config.drive.cronBatchSize,
                cron_initial_lookback_days: config.drive.cronInitialLookbackDays,
              },
              hint: 'DM targets a single workspace with optional Drive sync automation.',
            },
            null,
            2
          ),
        },
      ],
    })
  );
}
