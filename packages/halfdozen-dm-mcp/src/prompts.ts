/**
 * task_workflow prompt — single workspace DM guidance.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { DmConfig } from './config.js';

export function registerTaskWorkflowPrompt(server: McpServer, config: DmConfig): void {
  const { displayName, clientLabel, clientDescription } = config;
  const hasDrive = config.enabledToolsets.includes('drive');
  const driveSection = hasDrive
    ? `
## Drive sync (DM shared account)
- Drive entity: **${config.drive.entityId}** (shared DM account).
- Check connection with **google_drive_connection_status**.
- If disconnected, call **google_drive_get_connect_link** and provide the URL to the user.
- Use **google_drive_list_files** to discover candidate files.
- Sync one file via **google_drive_sync_file_to_notion** or run incremental sync with **google_drive_sync_recent_to_notion**.
- Target data source is server-configured; sync calls fail fast if required schema properties are missing.
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
For very large cleanups, run smaller batches (for example 20-50 pages at a time).${driveSection}`
          }
        }
      ]
    })
  );
}
