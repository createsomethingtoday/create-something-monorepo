/**
 * Workspace and tools resources.
 * Workspace labels come from config; tools list is canonical for this MCP.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { WorkspaceConfig } from './config.js';

/** Canonical list of all Notion tools this MCP exposes. Use for root response and notion://tools resource. */
export const NOTION_TOOLS = [
  { name: 'notion_search', description: 'Search workspace for pages or data sources' },
  { name: 'notion_list_databases', description: 'List all data sources the integration can access' },
  { name: 'notion_get_database', description: 'Get data source schema (property names and types)' },
  { name: 'notion_query_database', description: 'Query a data source with filter/sort' },
  { name: 'notion_get_page', description: 'Get a page by ID' },
  { name: 'notion_create_page', description: 'Create a new page in a data source' },
  { name: 'notion_update_page', description: "Update a page's properties" },
  { name: 'notion_append_blocks', description: 'Append blocks to a page' },
  { name: 'notion_archive_page', description: 'Archive (trash) a page' },
  { name: 'notion_archive_block', description: 'Archive a block (revert appends)' },
  { name: 'notion_bulk_update', description: 'Update multiple pages with same properties' },
  { name: 'notion_bulk_archive', description: 'Archive multiple pages' },
] as const;

export function registerToolsResource(server: McpServer): void {
  server.resource(
    'tools',
    'notion://tools',
    {
      description: 'All Notion tools exposed by this MCP. Use these tool names when the client supports tools/list.',
      mimeType: 'application/json',
    },
    async () => ({
      contents: [
        {
          uri: 'notion://tools',
          mimeType: 'application/json',
          text: JSON.stringify(
            {
              tools: NOTION_TOOLS,
              hint: 'This MCP exposes 12 tools. If your client only shows one, reconnect MCP or use a client that lists all tools (e.g. Cursor).',
            },
            null,
            2
          ),
        },
      ],
    })
  );
}

export function registerWorkspacesResource(server: McpServer, config: WorkspaceConfig): void {
  const { halfdozen, client } = config;
  server.resource(
    'workspaces',
    'notion://workspaces',
    {
      description: `The two Notion workspaces: ${halfdozen.label} and ${client.label}. Use workspace "halfdozen" or "client" on every Notion tool call.`,
      mimeType: 'application/json',
    },
    async () => ({
      contents: [
        {
          uri: 'notion://workspaces',
          mimeType: 'application/json',
          text: JSON.stringify(
            {
              workspaces: [
                { id: 'halfdozen', label: halfdozen.label, description: halfdozen.description },
                { id: 'client', label: client.label, description: client.description },
              ],
              hint: 'Pass workspace: "halfdozen" or workspace: "client" on every Notion tool call.',
            },
            null,
            2
          ),
        },
      ],
    })
  );
}
