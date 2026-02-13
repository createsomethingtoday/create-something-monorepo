/**
 * task_workflow prompt — when to use which workspace, schema-first, common workflow.
 * Uses config so each deployment can name workspaces correctly.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { WorkspaceConfig } from './config.js';

export function registerTaskWorkflowPrompt(server: McpServer, config: WorkspaceConfig): void {
  const { halfdozen, client, displayName } = config;
  server.prompt(
    'task_workflow',
    `How to use ${displayName} — workspaces, schema-first, and common workflow`,
    () => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `You are connected to **${displayName}**. One operator can make changes in either of two workspaces using the same full set of Notion tools.

## Workspaces
- **halfdozen** — ${halfdozen.description}
- **client** — ${client.description}

Every tool call must include \`workspace: "halfdozen"\` or \`workspace: "client"\` so the right workspace is targeted.

## Schema-first (Notion API 2025-09-03)
Before querying, updating, or creating pages in a data source:
1. Call **notion_get_database** with the data_source_id to get property names and types (get data source ID from Notion: Database settings → Manage Data Sources → Copy data source ID).
2. Use only the property names and valid select/status values returned; otherwise updates will fail.

## Common workflow
- **Read from one workspace, act in the other**: e.g. Use **notion_search** or **notion_query_database** in halfdozen to find the source; then **notion_create_page** or **notion_update_page** in client for the outcome.

## Batch operations
When updating or archiving many pages, use **notion_bulk_update** or **notion_bulk_archive** instead of calling update/archive repeatedly.`,
          },
        },
      ],
    }),
  );
}
