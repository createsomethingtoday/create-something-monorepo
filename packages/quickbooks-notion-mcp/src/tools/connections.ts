/**
 * Connection management tools — multi-tenant QuickBooks access.
 *
 * These tools allow agents to:
 * - Connect new QuickBooks accounts via OAuth (Composio-managed)
 * - Complete connection with Company ID
 * - List all connected QBO companies
 * - Disconnect a specific company
 *
 * Only registered in Worker mode (multi-connection).
 * Local stdio mode uses single-user auth without connection management.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ConnectionManager } from "../services/connections.js";
import { QuickBooksClient } from "../services/quickbooks.js";
import type { QBOCompanyInfo } from "../types.js";
import { toolResponse } from "../services/formatting.js";
import {
  resolveQuickBooksAuthConfigId,
  selectActiveQuickBooksConnection,
  type ComposioConnectedAccount,
} from "./composio.js";

interface ConnectionToolsConfig {
  composioApiKey: string;
  composioAuthConfigId?: string;
  qboClientSecret: string;
  workerBaseUrl: string;
  qboEnvironment: string;
}

export function registerConnectionTools(
  server: McpServer,
  connManager: ConnectionManager,
  config: ConnectionToolsConfig,
): void {

  // ── qbo_connect ────────────────────────────────────────────────

  server.registerTool(
    "qbo_connect",
    {
      title: "Connect a QuickBooks Account",
      description: `Use when a user wants to connect their QuickBooks Online account. This is a two-step process:

**Step 1**: Call this tool to generate an authorization link. Present it to the user. They click it, sign in to QuickBooks, and authorize access.

**Step 2**: After the user authorizes, ask them for their Company ID. They can find it by pressing Ctrl+Alt+? (Windows) or Control+Option+? (Mac) anywhere in QuickBooks Online — a dialog pops up showing "Your Company ID is XXXX XXXX XXXX XXXX" with a Copy button. Then call qbo_complete_connection with their user_id and company_id. If this tool returns a connection reference, pass it as connected_account_id so the exact Composio connection is bound.

Multiple QuickBooks companies can be connected simultaneously. Each gets its own connection.`,
      inputSchema: z.object({
        user_id: z.string().min(1).describe("A unique identifier for this user (e.g., email address or name). Used to track their connection."),
      }).strict(),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: { user_id: string }) => {
      try {
        if (!config.composioApiKey) {
          return toolResponse(
            "Composio API key not configured. Cannot generate connect link.",
            true
          );
        }
        const authConfigId = resolveQuickBooksAuthConfigId(config.composioAuthConfigId);
        if (!authConfigId) {
          return toolResponse(
            "Composio QuickBooks auth config not configured. Set COMPOSIO_QBO_AUTH_CONFIG_ID on the worker before generating connect links.",
            true
          );
        }

        // Generate Composio connect link via API (v3 format)
        const response = await fetch("https://backend.composio.dev/api/v1/connectedAccounts", {
          method: "POST",
          headers: {
            "x-api-key": config.composioApiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            integrationId: authConfigId,
            data: {
              userUuid: params.user_id,
            },
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          return toolResponse(
            `Failed to generate connect link: ${response.status} ${errorText}`,
            true
          );
        }

        const data = await response.json() as { redirectUrl?: string; connectionStatus?: string; connectedAccountId?: string };

        if (!data.redirectUrl) {
          // User may already be connected
          if (data.connectionStatus === "ACTIVE") {
            return toolResponse(
              `This user already has an active QuickBooks connection.\n\n` +
              `If they need to connect a **different** company, use \`qbo_disconnect\` first, then try again.\n\n` +
              `Otherwise, ask for their Company ID and call \`qbo_complete_connection\`` +
              (data.connectedAccountId ? ` with \`connected_account_id="${data.connectedAccountId}"\`.` : `.`)
            );
          }
          return toolResponse(
            "No redirect URL received from Composio. The user may already be connected.",
            true
          );
        }

        return toolResponse(
          `## Connect Your QuickBooks\n\n` +
          `**Step 1 of 2**: Click the link below to authorize access to your QuickBooks Online account:\n\n` +
          `**[Authorize QuickBooks Access](${data.redirectUrl})**\n\n` +
          `After you authorize, come back here for Step 2.\n\n` +
          (data.connectedAccountId
            ? `**Connection reference**: \`${data.connectedAccountId}\`\n` +
              `Pass this as \`connected_account_id\` to \`qbo_complete_connection\` so the exact Composio connection is used.\n\n`
            : "") +
          `---\n\n` +
          `**Step 2**: Once authorized, I'll need your **QuickBooks Company ID**.\n\n` +
          `Open [QuickBooks Online](https://app.qbo.intuit.com) and find your Company ID:\n` +
          `- **Keyboard shortcut** (fastest): Press \`Ctrl+Alt+?\` (Windows) or \`Control+Option+?\` (Mac) anywhere in QuickBooks\n` +
          `- A dialog appears showing **"Your Company ID is XXXX XXXX XXXX XXXX"** with a **Copy** button\n` +
          `- Copy it and paste it back here\n\n` +
          `_Alternative: Gear icon (⚙️) > Account and Settings > Billing & Subscription — Company ID is at the top._\n\n` +
          `**[Watch the video walkthrough](https://share.descript.com/view/67jew4dxSbU)** if you need a visual guide.`
        );
      } catch (error: unknown) {
        return toolResponse(
          `Error: ${error instanceof Error ? error.message : String(error)}`,
          true
        );
      }
    }
  );

  // ── qbo_complete_connection ────────────────────────────────────

  server.registerTool(
    "qbo_complete_connection",
    {
      title: "Complete QuickBooks Connection",
      description: `Use after the user has completed Step 1 (OAuth authorization via qbo_connect) and provided their Company ID.

This tool pulls the OAuth tokens from the auth provider and stores the connection with the correct Company ID. After this completes, all QBO tools will work for this user's company.

The company_id should be the number the user copied from QuickBooks (e.g., "9341456366994696"). Strip any spaces. If qbo_connect returned a connected_account_id, pass it here to bind the exact Composio account without guessing.`,
      inputSchema: z.object({
        user_id: z.string().min(1).describe("The same user_id used in qbo_connect."),
        company_id: z.string().min(5).describe("The QuickBooks Company ID (realmId). A 12-18 digit number from QuickBooks. Strip any spaces."),
        connected_account_id: z.string().min(1).optional().describe("Optional Composio connected account ID returned by qbo_connect. Use this when available to bind the exact OAuth connection."),
      }).strict(),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: { user_id: string; company_id: string; connected_account_id?: string }) => {
      try {
        // Strip spaces from company ID (QBO shows it as "XXXX XXXX XXXX XXXX")
        const realmId = params.company_id.replace(/\s+/g, "");

        if (!config.composioApiKey) {
          return toolResponse("Composio API key not configured.", true);
        }

        const composioResp = await fetch(
          `https://backend.composio.dev/api/v1/connectedAccounts?user_uuid=${encodeURIComponent(params.user_id)}&showActiveOnly=true`,
          { headers: { "x-api-key": config.composioApiKey } }
        );

        if (!composioResp.ok) {
          return toolResponse(
            `Failed to fetch connected accounts: ${composioResp.status}`,
            true
          );
        }

        const composioData = await composioResp.json() as {
          items: ComposioConnectedAccount[];
        };
        const selection = selectActiveQuickBooksConnection(composioData.items, {
          connectedAccountId: params.connected_account_id,
        });
        if (!selection.connection) {
          return toolResponse(
            `${selection.error}\n\n` +
            `Make sure the user completed Step 1 (clicked the authorization link from \`qbo_connect\` and authorized in the browser).`,
            true
          );
        }
        const qboConn = selection.connection;

        const cParams = qboConn.connectionParams;
        const token = {
          accessToken: cParams.access_token,
          refreshToken: cParams.refresh_token,
          accessTokenExpiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
          refreshTokenExpiresAt: new Date(Date.now() + (cParams.x_refresh_token_expires_in || 8726400) * 1000).toISOString(),
          realmId,
          tokenType: cParams.token_type || "bearer",
        };

        // Fetch company info for metadata
        let companyName = "Unknown Company";
        let email: string | undefined;
        try {
          const tempClient = new QuickBooksClient(
            { getAccessToken: async () => token.accessToken, getRealmId: async () => realmId },
            realmId,
            config.qboEnvironment === "sandbox"
          );
          const info = await tempClient.getCompanyInfo<QBOCompanyInfo>();
          companyName = info.CompanyName || companyName;
          email = info.Email?.Address;
        } catch {
          // Best effort — company info fetch may fail for new accounts
        }

        // Store connection directly via ConnectionManager (no HTTP loopback)
        await connManager.addConnection(token, { companyName, email });

        return toolResponse(
          `## QuickBooks Connected!\n\n` +
          `**Company**: ${companyName}\n` +
          `**Company ID**: \`${realmId}\`\n` +
          `**Connected Account ID**: \`${qboConn.id}\`\n` +
          (email ? `**Email**: ${email}\n` : "") +
          `\nAll QuickBooks tools are now ready. Try \`qbo_company_info\` to verify, or ask any question about your QuickBooks data.`
        );
      } catch (error: unknown) {
        return toolResponse(
          `Error completing connection: ${error instanceof Error ? error.message : String(error)}`,
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
