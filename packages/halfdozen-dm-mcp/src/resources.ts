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

/** Canonical list of DM Composio management tools. */
export const DM_COMPOSIO_MANAGEMENT_TOOLS = [
  { name: 'dm_composio_toolkit_inventory', description: 'List DM Composio toolkit/tool inventory for the current entity' },
  { name: 'dm_composio_connection_status', description: 'Check Composio connection status for toolkit(s)' },
  { name: 'dm_composio_get_connect_link', description: 'Get a one-time Composio OAuth link for a toolkit' },
] as const;

export interface DmComposioProxyToolSummary {
  name: string;
  description: string;
  toolkit: string;
}

export interface DmComposioRuntimeSummary {
  registeredToolkits: string[];
  proxiedToolCount: number;
  warnings: string[];
}

export function getToolsForConfig(
  config: DmConfig,
  composioTools: DmComposioProxyToolSummary[] = []
): Array<{ name: string; description: string }> {
  const enabled = new Set(config.enabledToolsets);
  const tools: Array<{ name: string; description: string }> = [];
  if (enabled.has('notion')) tools.push(...DM_NOTION_TOOLS);
  if (enabled.has('composio')) {
    tools.push(...DM_COMPOSIO_MANAGEMENT_TOOLS);
    tools.push(...composioTools.map((tool) => ({ name: tool.name, description: tool.description })));
  }
  return tools;
}

export function registerToolsResource(
  server: McpServer,
  config: DmConfig,
  composioTools: DmComposioProxyToolSummary[] = []
): void {
  const tools = getToolsForConfig(config, composioTools);
  const MAX_LISTED_TOOLS = 500;
  const listedTools = tools.slice(0, MAX_LISTED_TOOLS);
  const truncated = tools.length > listedTools.length;

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
              tools: listedTools,
              truncated,
              total_tools: tools.length,
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

export function registerToolsetsResource(
  server: McpServer,
  config: DmConfig,
  composioRuntime?: DmComposioRuntimeSummary
): void {
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
              composio: {
                proxy_mode: config.composio.proxyMode,
                default_entity_id: config.composio.defaultEntityId,
                allowed_toolkits: config.composio.allowedToolkits,
                allowed_toolkits_by_entity: config.composio.allowedToolkitsByEntity,
                tool_name_prefix: config.composio.toolNamePrefix,
                registered_toolkits: composioRuntime?.registeredToolkits ?? [],
                proxied_tool_count: composioRuntime?.proxiedToolCount ?? 0,
                warnings: composioRuntime?.warnings ?? [],
              },
              hint: 'DM targets a single Notion workspace and DM-namespaced Composio proxy tools.',
            },
            null,
            2
          ),
        },
      ],
    })
  );
}
