import { json } from "@sveltejs/kit";
import { r as requirePartnerAdmin, n as normalizePartnerSlug, o as normalizeToolkitSlug, g as getPartnerClientBySlug, H as HALF_DOZEN_PARTNER_KEY, l as resolveAuthConfigId, m as getComposioClient, d as randomId, e as parseJsonObject, P as PartnerAuthHttpError } from "../../../../../../../../../../chunks/partner-auth.js";
const POST = async ({ request, params, platform, url }) => {
  try {
    const env = platform?.env;
    if (!env?.DB) {
      return json({ error: "unavailable", message: "Database is unavailable" }, { status: 503 });
    }
    const actor = requirePartnerAdmin(request, env);
    const slug = normalizePartnerSlug(params.slug);
    const toolkit = normalizeToolkitSlug(params.toolkit);
    if (!slug || !toolkit) {
      return json({ error: "invalid_request", message: "Valid client slug and toolkit are required" }, { status: 400 });
    }
    const client = await getPartnerClientBySlug(env.DB, HALF_DOZEN_PARTNER_KEY, slug);
    if (!client) {
      return json({ error: "not_found", message: "Partner client not found" }, { status: 404 });
    }
    const body = await request.json().catch(() => null);
    const callbackUrl = body?.callback_url?.trim() || url.searchParams.get("callback_url") || void 0;
    const authConfigId = body?.auth_config_id?.trim() || resolveAuthConfigId(env, toolkit) || void 0;
    const composio = getComposioClient(env);
    const connectionRequest = authConfigId ? await composio.connectedAccounts.link(client.workspace_account_id, authConfigId, {
      ...callbackUrl ? { callbackUrl } : {}
    }) : await composio.toolkits.authorize(client.workspace_account_id, toolkit, authConfigId);
    const connectLink = connectionRequest.redirectUrl;
    if (!connectLink) {
      return json(
        {
          error: "connect_link_unavailable",
          message: "Composio did not return a redirect URL for this toolkit"
        },
        { status: 502 }
      );
    }
    await env.DB.prepare(
      `INSERT INTO partner_auth_connections (
         id, partner_client_id, toolkit, auth_config_id, connected_account_id, connection_status,
         last_checked_at, metadata_json
       ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), ?)`
    ).bind(
      randomId("paconn"),
      client.id,
      toolkit,
      authConfigId ?? null,
      connectionRequest.id,
      "INITIATED",
      JSON.stringify({
        actor,
        callback_url: callbackUrl ?? null,
        connect_link_issued_at: (/* @__PURE__ */ new Date()).toISOString(),
        ...parseJsonObject(
          body?.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata) ? JSON.stringify(body.metadata) : "{}"
        )
      })
    ).run();
    return json({
      client_slug: client.slug,
      workspace_account_id: client.workspace_account_id,
      toolkit,
      auth_config_id: authConfigId ?? null,
      connection_request_id: connectionRequest.id,
      connect_link: connectLink
    });
  } catch (error) {
    if (error instanceof PartnerAuthHttpError) {
      return json({ error: error.code, message: error.message }, { status: error.status });
    }
    return json(
      {
        error: "internal_error",
        message: error instanceof Error ? error.message : "Unexpected error"
      },
      { status: 500 }
    );
  }
};
export {
  POST
};
