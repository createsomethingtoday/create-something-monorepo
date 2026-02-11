/**
 * Connection management tools — multi-tenant QuickBooks access.
 *
 * These tools allow agents to:
 * - Connect new QuickBooks accounts via OAuth
 * - List all connected QBO companies
 * - Disconnect a specific company
 *
 * Only registered in Worker mode (multi-connection).
 * Local stdio mode uses single-user auth without connection management.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ConnectionManager } from "../services/connections.js";
import { toolResponse } from "../services/formatting.js";

export function registerConnectionTools(
  server: McpServer,
  connManager: ConnectionManager,
  /** Base URL for generating OAuth callback URL (e.g., "https://quickbooks.mcp.workway.co") */
  baseUrl: string,
): void {

  // ── qbo_connect ────────────────────────────────────────────────

  server.registerTool(
    "qbo_connect",
    {
      title: "Connect a QuickBooks Account",
      description: `Use when a user wants to connect their QuickBooks Online account. Generates an OAuth authorization URL that the user must visit in their browser to grant access.

After the user completes authorization, their QuickBooks connection is stored and available for all QBO tools.

Multiple QuickBooks companies can be connected simultaneously. Each gets its own connection ID (realmId) that can be passed to other tools via the 'connection' parameter.

The agent should present the returned URL to the user and ask them to complete the authorization in their browser.`,
      inputSchema: z.object({}).strict(),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async () => {
      try {
        const state = crypto.randomUUID();
        const authUrl = connManager.generateAuthUrl(state);

        return toolResponse(
          `## Connect Your QuickBooks\n\n` +
          `Click the link below to authorize access to your QuickBooks Online account:\n\n` +
          `**[Authorize QuickBooks Access](${authUrl})**\n\n` +
          `After you authorize, you'll be redirected back and your connection will be saved automatically.\n\n` +
          `Once complete, use \`qbo_company_info\` to verify the connection.`
        );
      } catch (error: unknown) {
        return toolResponse(
          `Error generating auth URL: ${error instanceof Error ? error.message : String(error)}`,
          true
        );
      }
    }
  );

  // ── qbo_list_connections ───────────────────────────────────────

  server.registerTool(
    "qbo_list_connections",
    {
      title: "List Connected QuickBooks Accounts",
      description: `Use to see all QuickBooks companies currently connected to this MCP server. Shows the connection ID (realmId), company name, and when it was connected.

Use the realmId as the 'connection' parameter in other QBO tools to specify which company to query.

If no connections exist, suggest using qbo_connect to add one.`,
      inputSchema: z.object({}).strict(),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () => {
      try {
        const connections = await connManager.listConnections();

        if (connections.length === 0) {
          return toolResponse(
            `No QuickBooks accounts connected.\n\n` +
            `Use \`qbo_connect\` to connect a QuickBooks Online account.`
          );
        }

        const lines = [
          `## Connected QuickBooks Accounts (${connections.length})`,
          "",
        ];

        for (const conn of connections) {
          lines.push(`### ${conn.companyName || "Unknown Company"}`);
          lines.push(`- **Connection ID**: \`${conn.realmId}\``);
          if (conn.email) lines.push(`- **Email**: ${conn.email}`);
          lines.push(`- **Connected**: ${conn.connectedAt}`);
          lines.push("");
        }

        lines.push(
          "---",
          "Pass a connection ID as the `connection` parameter to any QBO tool to query a specific company.",
        );

        if (connections.length === 1) {
          lines.push(
            "",
            `_Currently using \`${connections[0].realmId}\` as the default connection._`
          );
        }

        return toolResponse(lines.join("\n"));
      } catch (error: unknown) {
        return toolResponse(
          `Error listing connections: ${error instanceof Error ? error.message : String(error)}`,
          true
        );
      }
    }
  );

  // ── qbo_disconnect ─────────────────────────────────────────────

  server.registerTool(
    "qbo_disconnect",
    {
      title: "Disconnect a QuickBooks Account",
      description: `Use to remove a QuickBooks connection from this MCP server. This deletes the stored OAuth tokens for the specified company.

The user should also revoke the app connection from their Intuit account settings for complete disconnection.

Use qbo_list_connections first to find the connection ID (realmId) to disconnect.`,
      inputSchema: z.object({
        realm_id: z.string().min(1).describe("The realmId of the QuickBooks connection to remove. Use qbo_list_connections to find this."),
      }).strict(),
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (params: { realm_id: string }) => {
      try {
        const removed = await connManager.removeConnection(params.realm_id);

        if (!removed) {
          return toolResponse(
            `No connection found with realmId \`${params.realm_id}\`.\n\n` +
            `Use \`qbo_list_connections\` to see available connections.`,
            true
          );
        }

        return toolResponse(
          `## Connection Removed\n\n` +
          `QuickBooks connection \`${params.realm_id}\` has been disconnected.\n\n` +
          `**Recommended**: The user should also sign in to [Intuit](https://accounts.intuit.com) and remove the app connection under "Connected apps" for complete revocation.`
        );
      } catch (error: unknown) {
        return toolResponse(
          `Error disconnecting: ${error instanceof Error ? error.message : String(error)}`,
          true
        );
      }
    }
  );
}
