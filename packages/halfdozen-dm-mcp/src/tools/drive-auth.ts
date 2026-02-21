/**
 * DM Google Drive auth navigation tools.
 *
 * These tools are intentionally lightweight:
 * - google_drive_connection_status
 * - google_drive_get_connect_link
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

const COMPOSIO_CONNECT_API = 'https://backend.composio.dev/api/v1/connectedAccounts';

export interface DriveConnectionChecker {
  hasActiveConnection(userId: string, toolkit: string): Promise<boolean>;
}

export interface DriveAuthToolDeps {
  composioClient: DriveConnectionChecker;
  composioApiKey: string;
  driveAuthConfigId?: string;
  entityId: string;
}

async function hasDriveConnection(client: DriveConnectionChecker, entityId: string): Promise<boolean> {
  // Composio toolkit slug spelling has varied by account/tooling; check both.
  const [a, b] = await Promise.allSettled([
    client.hasActiveConnection(entityId, 'googledrive'),
    client.hasActiveConnection(entityId, 'google_drive'),
  ]);
  return (a.status === 'fulfilled' && a.value) || (b.status === 'fulfilled' && b.value);
}

export function registerDriveAuthTools(server: McpServer, deps: DriveAuthToolDeps): void {
  server.tool(
    'google_drive_connection_status',
    'Check if DM shared Google Drive is connected for this MCP.',
    {},
    async () => {
      try {
        const connected = await hasDriveConnection(deps.composioClient, deps.entityId);
        const message = connected
          ? `Google Drive is connected for entity "${deps.entityId}".`
          : `Google Drive is not connected. Call google_drive_get_connect_link and present the URL to the user.`;
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ connected, entityId: deps.entityId, message }, null, 2) }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  connected: false,
                  entityId: deps.entityId,
                  error: String(error),
                  message: 'Connection check failed. Ensure COMPOSIO_API_KEY is configured and Composio is reachable.',
                },
                null,
                2
              ),
            },
          ],
        };
      }
    }
  );

  server.tool(
    'google_drive_get_connect_link',
    'Get a one-time OAuth link to connect DM shared Google Drive.',
    {},
    async () => {
      if (!deps.driveAuthConfigId) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  link: null,
                  message:
                    'Connect link not configured. Set COMPOSIO_GOOGLEDRIVE_AUTH_CONFIG_ID and redeploy.',
                },
                null,
                2
              ),
            },
          ],
        };
      }

      try {
        const response = await fetch(COMPOSIO_CONNECT_API, {
          method: 'POST',
          headers: {
            'x-api-key': deps.composioApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            integrationId: deps.driveAuthConfigId,
            data: { userUuid: deps.entityId },
          }),
        });

        if (!response.ok) {
          const body = await response.text();
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  {
                    link: null,
                    error: `Composio API error: ${response.status} ${body}`,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        const payload = (await response.json()) as { redirectUrl?: string; connectionStatus?: string };
        if (payload.connectionStatus === 'ACTIVE') {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  {
                    link: null,
                    already_connected: true,
                    message: `Google Drive is already connected for entity "${deps.entityId}".`,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        if (!payload.redirectUrl) {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  {
                    link: null,
                    message: 'No redirect URL returned by Composio. Re-check connection status.',
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  link: payload.redirectUrl,
                  message:
                    'Present this URL to the user. After authorization, call google_drive_connection_status again.',
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ link: null, error: String(error) }, null, 2),
            },
          ],
        };
      }
    }
  );
}
