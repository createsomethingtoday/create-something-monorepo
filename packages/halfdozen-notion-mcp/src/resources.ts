/**
 * Notion Half Dozen X CREATE SOMETHING — workspace resource.
 * Injects the two workspaces into context so the agent knows which to use.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function registerWorkspacesResource(server: McpServer): void {
  server.resource(
    'workspaces',
    'notion://workspaces',
    { description: 'The two Notion workspaces: Half Dozen (internal) and CREATE SOMETHING client. Use workspace "halfdozen" for internal data (Meeting Capture, transcripts); use "client" for the agency client\'s Notion.', mimeType: 'application/json' },
    async () => ({
      contents: [
        {
          uri: 'notion://workspaces',
          mimeType: 'application/json',
          text: JSON.stringify(
            {
              workspaces: [
                { id: 'halfdozen', label: 'Half Dozen', description: 'Internal — Meeting Capture, meeting transcripts (e.g. Danny meeting)' },
                { id: 'client', label: 'CREATE SOMETHING client', description: "The agency client's Notion — work Half Dozen does for that client" },
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
