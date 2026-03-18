/**
 * task_workflow prompt — single workspace DM guidance.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { DmConfig } from './config.js';
import type { DmComposioRuntimeSummary } from './resources.js';

export function registerTaskWorkflowPrompt(
  server: McpServer,
  config: DmConfig,
  composioRuntime?: DmComposioRuntimeSummary
): void {
  const { displayName, clientLabel, clientDescription } = config;
  const hasComposio = config.enabledToolsets.includes('composio');
  const composioSection = hasComposio
    ? `
## Composio proxy tools (DM namespace)
- Proxy mode: **${config.composio.proxyMode}**
- Default entity ID: **${config.composio.defaultEntityId}**
- Registered toolkits: **${
      composioRuntime && composioRuntime.registeredToolkits.length > 0
        ? composioRuntime.registeredToolkits.join(', ')
        : '(none)'
    }**
- Tool prefix: **${config.composio.toolNamePrefix}**
- Check current toolkit access with **dm_composio_toolkit_inventory**.
- Check account connections with **dm_composio_connection_status**.
- If disconnected, call **dm_composio_get_connect_link** and provide the URL to the user.
- For Gmail triage, prefer **dm_gmail_list_recent_threads** over stitching together raw Gmail list/fetch steps.
- Connection-first rule: before first use of any \`${config.composio.toolNamePrefix}__<toolkit>__*\` tool in a session, call **dm_composio_connection_status** for that toolkit.
- Recovery rule: if any DM Composio tool returns an error, immediately call **dm_composio_connection_status** for that toolkit. If disconnected, call **dm_composio_get_connect_link**, return the URL, and retry only after reconnect.
- Proxied action tools are DM-namespaced as:
  - \`${config.composio.toolNamePrefix}__<toolkit>__<tool>\`
- You may pass \`entity_id\` (or \`__dm_entity_id\`) on composio calls to target a specific entity; otherwise server default/header entity is used.
`
    : '';

  server.prompt(
    'task_workflow',
    `How to use ${displayName} — schema-first Notion workflow for ${clientLabel}`,
    () => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `You are connected to **${displayName}**.

## Workspace
- **client** — ${clientDescription}

All Notion tool calls target this single workspace. Do not pass a workspace field.

## Schema-first (Notion API 2025-09-03)
Before querying, updating, or creating pages in a data source:
1. Call **notion_get_database** with the data_source_id to get property names and types (get data source ID from Notion: Database settings → Manage Data Sources → Copy data source ID).
2. Use only the property names and valid select/status values returned; otherwise updates will fail.

## Common workflow
- Prefer known **data_source_id** values and call **notion_query_database** directly when possible.
- Use **notion_search** only when IDs are unknown.
- Use **notion_create_page** or **notion_update_page** for write operations.

## Batch operations
When updating or archiving many pages, use **notion_bulk_update** or **notion_bulk_archive** instead of calling update/archive repeatedly.
For very large cleanups, run smaller batches (for example 20-50 pages at a time).${composioSection}`
          }
        }
      ]
    })
  );
}
