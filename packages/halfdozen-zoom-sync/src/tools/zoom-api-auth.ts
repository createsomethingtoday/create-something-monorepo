/**
 * Zoom API auth navigation tools — zoom_api_connection_status, zoom_api_get_connect_link
 *
 * Let the agent check Composio Zoom connection status and get a connect link
 * for the user. Auth is separate from Zoom Clips (session context).
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

const ZOOM_ENTITY_ID = 'default';

/** Minimal interface for connection check; satisfied by ComposioClient from composio-bridge */
export interface ZoomApiConnectionChecker {
  hasActiveConnection(userId: string, toolkit: string): Promise<boolean>;
}
const COMPOSIO_CONNECT_API = 'https://backend.composio.dev/api/v1/connectedAccounts';

export interface ZoomApiAuthToolDeps {
  composioClient: ZoomApiConnectionChecker;
  composioApiKey: string;
  zoomAuthConfigId: string | undefined;
  entityId?: string;
}

export function registerZoomApiAuthTools(
  server: McpServer,
  deps: ZoomApiAuthToolDeps,
): void {
  const entityId = deps.entityId ?? ZOOM_ENTITY_ID;

  // --- zoom_api_connection_status ---------------------------------------------------
  server.tool(
    'zoom_api_connection_status',
    {},
    async () => {
      try {
        const connected = await deps.composioClient.hasActiveConnection(entityId, 'zoom');
        const message = connected
          ? `Zoom API is connected for entity "${entityId}". You can use zoom_api_* tools (meetings, recordings, webinars).`
          : `Zoom API is not connected for entity "${entityId}". Call zoom_api_get_connect_link and present the link to the user so they can authorize Zoom.`;
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ connected, entityId, message }, null, 2),
            },
          ],
        };
      } catch (e) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  connected: false,
                  error: String(e),
                  message:
                    'Could not check Zoom API connection. Ensure COMPOSIO_API_KEY is set and Composio API is reachable.',
                },
                null,
                2,
              ),
            },
          ],
        };
      }
    },
  );

  // --- zoom_api_get_connect_link ----------------------------------------------------
  server.tool(
    'zoom_api_get_connect_link',
    {},
    async () => {
      if (!deps.zoomAuthConfigId) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  link: null,
                  message:
                    'Connect link not configured. The server admin must set COMPOSIO_ZOOM_AUTH_CONFIG_ID (Zoom auth config ID from Composio dashboard) and redeploy.',
                },
                null,
                2,
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
            integrationId: deps.zoomAuthConfigId,
            data: { userUuid: entityId },
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  {
                    link: null,
                    error: `Composio API error: ${response.status} ${errorText}`,
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        }

        const data = (await response.json()) as {
          redirectUrl?: string;
          connectionStatus?: string;
        };

        if (data.connectionStatus === 'ACTIVE') {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  {
                    link: null,
                    already_connected: true,
                    message: `Zoom is already connected for entity "${entityId}". You can use zoom_api_* tools.`,
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        }

        if (!data.redirectUrl) {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  {
                    link: null,
                    message: 'No redirect URL from Composio. User may already be connected; try zoom_api_connection_status.',
                  },
                  null,
                  2,
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
                  link: data.redirectUrl,
                  message:
                    'Present this link to the user. After they authorize Zoom, call zoom_api_connection_status to confirm.',
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (e) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  link: null,
                  error: String(e),
                },
                null,
                2,
              ),
            },
          ],
        };
      }
    },
  );
}
