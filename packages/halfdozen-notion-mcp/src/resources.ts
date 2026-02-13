/**
 * Workspace resource — injects the two workspaces into context.
 * Labels come from config so each deployment (CREATE SOMETHING vs System Studio) can expose correct names.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { WorkspaceConfig } from './config.js';

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
