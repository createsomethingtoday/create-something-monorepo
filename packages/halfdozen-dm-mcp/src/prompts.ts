/**
 * task_workflow prompt — single workspace DM guidance.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { DmConfig } from './config.js';

export function registerTaskWorkflowPrompt(server: McpServer, config: DmConfig): void {
  const { displayName, clientLabel, clientDescription } = config;
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
- Use **notion_search** or **notion_query_database** to locate records.
- Use **notion_create_page** or **notion_update_page** for write operations.

## Batch operations
When updating or archiving many pages, use **notion_bulk_update** or **notion_bulk_archive** instead of calling update/archive repeatedly.`,
          },
        },
      ],
    }),
  );
}
