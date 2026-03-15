/**
 * Gmail and Notion auth navigation tools — connection_status and get_connect_link per toolkit.
 * Uses Composio connectedAccounts API; auth config IDs are optional (set by admin).
 */

interface ToolServer {
  tool(
    name: string,
    description: string,
    paramsSchema: Record<string, unknown>,
    handler: (params: Record<string, unknown>) => Promise<{ content: Array<{ type: 'text'; text: string }> }>
  ): void;
}

const COMPOSIO_CONNECT_API = 'https://backend.composio.dev/api/v1/connectedAccounts';
const ENTITY_ID = 'default';

export interface ConnectionChecker {
  hasActiveConnection(userId: string, toolkit: string): Promise<boolean>;
}

export interface AuthToolDeps {
  composioClient: ConnectionChecker;
  composioApiKey: string;
  gmailAuthConfigId: string | undefined;
  notionAuthConfigId: string | undefined;
  /** Resolve entity id at call time (for multi-user). If omitted, uses 'default'. */
  getEntityId?: () => string | Promise<string>;
}

function registerAuthToolsForToolkit(
  server: ToolServer,
  toolkit: 'gmail' | 'notion',
  authConfigId: string | undefined,
  deps: AuthToolDeps,
): void {
  const prefix = toolkit === 'gmail' ? 'gmail' : 'notion';
  const label = toolkit === 'gmail' ? 'Gmail' : 'Notion';

  server.tool(
    `${prefix}_connection_status`,
    `Check if ${label} is connected for the current entity.`,
    {},
    async () => {
      const entityId = deps.getEntityId ? await deps.getEntityId() : ENTITY_ID;
      try {
        const connected = await deps.composioClient.hasActiveConnection(entityId, toolkit);
        const message = connected
          ? `${label} is connected for entity "${entityId}". You can use ${prefix}_* tools.`
          : `${label} is not connected. Call ${prefix}_get_connect_link and present the link to the user.`;
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ connected, entityId, message }, null, 2) }],
        };
      } catch (e) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                connected: false,
                error: String(e),
                message: 'Could not check connection. Ensure COMPOSIO_API_KEY is set.',
              }, null, 2),
            },
          ],
        };
      }
    },
  );

  server.tool(
    `${prefix}_get_connect_link`,
    `Get a link for the user to connect their ${label} account (if not already connected).`,
    {},
    async () => {
      const entityId = deps.getEntityId ? await deps.getEntityId() : ENTITY_ID;
      if (!authConfigId) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  link: null,
                  message: `Connect link not configured. Set COMPOSIO_${label.toUpperCase()}_AUTH_CONFIG_ID (from Composio dashboard) and redeploy.`,
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
          headers: { 'x-api-key': deps.composioApiKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({ integrationId: authConfigId, data: { userUuid: entityId } }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          return {
            content: [
              { type: 'text' as const, text: JSON.stringify({ link: null, error: `Composio API: ${response.status} ${errorText}` }, null, 2) },
            ],
          };
        }

        const data = (await response.json()) as { redirectUrl?: string; connectionStatus?: string };
        if (data.connectionStatus === 'ACTIVE') {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  { link: null, already_connected: true, message: `${label} is already connected for "${entityId}".` },
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
                  { link: null, message: 'No redirect URL from Composio. Try connection_status.' },
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
                { link: data.redirectUrl, message: 'Present this link to the user, then check connection_status.' },
                null,
                2,
              ),
            },
          ],
        };
      } catch (e) {
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify({ link: null, error: String(e) }, null, 2) },
          ],
        };
      }
    },
  );
}

export function registerAuthTools(server: ToolServer, deps: AuthToolDeps): void {
  registerAuthToolsForToolkit(server, 'gmail', deps.gmailAuthConfigId, deps);
  registerAuthToolsForToolkit(server, 'notion', deps.notionAuthConfigId, deps);
}
