export interface PartnerToolkitConnectLinkHttpErrorLike {
  status: number;
  code: string;
  message: string;
}

interface ConnectLinkRequestBody {
  callback_url?: string;
  auth_config_id?: string;
  metadata?: Record<string, unknown>;
}

interface ConnectLinkRequestEventLike {
  request: Request;
  params: Record<string, string | undefined>;
  platform?: {
    env?: {
      DB?: D1Database;
      [key: string]: unknown;
    };
  };
  url: URL;
}

export interface PartnerToolkitConnectLinkDeps {
  partnerKey: string;
  authorizePartnerToolkitAdminAction: (input: {
    request: Request;
    env: Record<string, unknown> & { DB: D1Database };
    client: {
      id: string;
      slug: string;
      workspace_account_id: string;
    };
    actor: string;
    actionName: "create_toolkit_connect_link";
    accessType: "auth_admin";
    toolkit: string;
  }) => Promise<{
    policy: Record<string, unknown>;
  }>;
  getComposioClient: (
    env: Record<string, unknown> & { DB: D1Database },
  ) => {
    connectedAccounts: {
      link: (
        userId: string,
        authConfigId: string,
        options?: { callbackUrl?: string },
      ) => Promise<{ id?: string | null; redirectUrl?: string | null }>;
    };
    toolkits: {
      authorize: (
        userId: string,
        toolkit: string,
        authConfigId?: string,
      ) => Promise<{ id?: string | null; redirectUrl?: string | null }>;
    };
  };
  getPartnerClientBySlug: (
    db: D1Database,
    partnerKey: string,
    slug: string,
  ) => Promise<{
    id: string;
    slug: string;
    workspace_account_id: string;
  } | null>;
  normalizePartnerSlug: (value: string) => string;
  normalizeToolkitSlug: (value: string) => string;
  parseJsonObject: (raw: string | null | undefined) => Record<string, unknown>;
  randomId: (prefix: string) => string;
  requirePartnerAdmin: (
    request: Request,
    env: Record<string, unknown> & { DB: D1Database },
  ) => string;
  resolveAuthConfigId: (
    env: Record<string, unknown> & { DB: D1Database },
    toolkit: string,
  ) => string | null;
  isHttpError: (error: unknown) => error is PartnerToolkitConnectLinkHttpErrorLike;
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return Response.json(body, { status });
}

export function createPartnerToolkitConnectLinkPostHandler(
  deps: PartnerToolkitConnectLinkDeps,
) {
  return async ({ request, params, platform, url }: ConnectLinkRequestEventLike): Promise<Response> => {
    try {
      const env = platform?.env;
      if (!env?.DB) {
        return jsonResponse({ error: "unavailable", message: "Database is unavailable" }, 503);
      }

      const actor = deps.requirePartnerAdmin(request, env);
      const slug = deps.normalizePartnerSlug(params.slug ?? "");
      const toolkit = deps.normalizeToolkitSlug(params.toolkit ?? "");
      if (!slug || !toolkit) {
        return jsonResponse(
          { error: "invalid_request", message: "Valid client slug and toolkit are required" },
          400,
        );
      }

      const client = await deps.getPartnerClientBySlug(env.DB, deps.partnerKey, slug);
      if (!client) {
        return jsonResponse({ error: "not_found", message: "Partner client not found" }, 404);
      }

      const authz = await deps.authorizePartnerToolkitAdminAction({
        request,
        env,
        client,
        actor,
        actionName: "create_toolkit_connect_link",
        accessType: "auth_admin",
        toolkit,
      });

      const body = await request.json().catch(() => null) as ConnectLinkRequestBody | null;
      const callbackUrl = body?.callback_url?.trim() || url.searchParams.get("callback_url") || undefined;
      const authConfigId = body?.auth_config_id?.trim() || deps.resolveAuthConfigId(env, toolkit) || undefined;
      const composio = deps.getComposioClient(env);

      const connectionRequest = authConfigId
        ? await composio.connectedAccounts.link(client.workspace_account_id, authConfigId, {
            ...(callbackUrl ? { callbackUrl } : {}),
          })
        : await composio.toolkits.authorize(client.workspace_account_id, toolkit, authConfigId);

      const connectLink = connectionRequest.redirectUrl;
      if (!connectLink) {
        return jsonResponse(
          {
            error: "connect_link_unavailable",
            message: "Composio did not return a redirect URL for this toolkit",
          },
          502,
        );
      }

      await env.DB.prepare(
        `INSERT INTO partner_auth_connections (
         id, partner_client_id, toolkit, auth_config_id, connected_account_id, connection_status,
         last_checked_at, metadata_json
       ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), ?)`,
      )
        .bind(
          deps.randomId("paconn"),
          client.id,
          toolkit,
          authConfigId ?? null,
          connectionRequest.id,
          "INITIATED",
          JSON.stringify({
            actor,
            callback_url: callbackUrl ?? null,
            connect_link_issued_at: new Date().toISOString(),
            ...deps.parseJsonObject(
              body?.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
                ? JSON.stringify(body.metadata)
                : "{}",
            ),
          }),
        )
        .run();

      return jsonResponse({
        client_slug: client.slug,
        workspace_account_id: client.workspace_account_id,
        toolkit,
        auth_config_id: authConfigId ?? null,
        connection_request_id: connectionRequest.id,
        connect_link: connectLink,
        policy: authz.policy,
      });
    } catch (error) {
      if (deps.isHttpError(error)) {
        return jsonResponse({ error: error.code, message: error.message }, error.status);
      }

      return jsonResponse(
        {
          error: "internal_error",
          message: error instanceof Error ? error.message : "Unexpected error",
        },
        500,
      );
    }
  };
}
