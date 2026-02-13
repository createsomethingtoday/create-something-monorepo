/**
 * Notion Half Dozen X CREATE SOMETHING — task_workflow prompt.
 * Guides when to use which workspace, schema-first, and read-from-Half-Dozen then write-to-client pattern.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function registerTaskWorkflowPrompt(server: McpServer): void {
  server.prompt(
    'task_workflow',
    'How to use Notion Half Dozen X CREATE SOMETHING — workspaces, schema-first, and common workflow',
    () => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `You are connected to **Notion Half Dozen X CREATE SOMETHING**. One operator can make changes in either of two workspaces using the same full set of Notion tools.

## Workspaces
- **halfdozen** — Internal Half Dozen data: Meeting Capture, meeting transcripts (e.g. Danny meeting). Use for reading internal notes, transcripts, and meeting outcomes.
- **client** — The CREATE SOMETHING (agency) client's Notion. Use when creating or updating deliverables, tasks, or content for that client.

Every tool call must include \`workspace: "halfdozen"\` or \`workspace: "client"\` so the right workspace is targeted.

## Schema-first (Notion API 2025-09-03)
Before querying, updating, or creating pages in a data source:
1. Call **notion_get_database** with the data_source_id to get property names and types (get data source ID from Notion: Database settings → Manage Data Sources → Copy data source ID).
2. Use only the property names and valid select/status values returned; otherwise updates will fail.

## Common workflow
- **Find something in Half Dozen, then act in the CREATE SOMETHING client workspace**: e.g. Read a meeting transcript from Half Dozen (workspace: halfdozen), then create a task or page in the client's Notion (workspace: client).
- Use **notion_search** or **notion_query_database** in halfdozen to find the source; then **notion_create_page** or **notion_update_page** in client for the outcome.

## Batch operations
When updating or archiving many pages, use **notion_bulk_update** or **notion_bulk_archive** instead of calling update/archive repeatedly.`,
          },
        },
      ],
    }),
  );
}
