import { json } from "@sveltejs/kit";
import { r as requirePartnerAdmin, n as normalizePartnerSlug, g as getPartnerClientBySlug, H as HALF_DOZEN_PARTNER_KEY, k as authorizePartnerToolkitAdminAction, m as getComposioClient, o as normalizeToolkitSlug, l as resolveAuthConfigId, d as randomId, b as parseJsonArray, e as parseJsonObject, P as PartnerAuthHttpError } from "../../../../../../../../../chunks/partner-auth.js";
const GET = async ({ request, params, platform }) => {
  try {
    const env = platform?.env;
    if (!env?.DB) {
      return json({ error: "unavailable", message: "Database is unavailable" }, { status: 503 });
    }
    const actor = requirePartnerAdmin(request, env);
    const slug = normalizePartnerSlug(params.slug);
    if (!slug) {
      return json({ error: "invalid_request", message: "Client slug is required" }, { status: 400 });
    }
    const client = await getPartnerClientBySlug(env.DB, HALF_DOZEN_PARTNER_KEY, slug);
    if (!client) {
      return json({ error: "not_found", message: "Partner client not found" }, { status: 404 });
    }
    const authz = await authorizePartnerToolkitAdminAction({
      request,
      env,
      client,
      actor,
      actionName: "view_toolkit_auth",
      accessType: "read",
      toolkit: "all"
    });
    const composio = getComposioClient(env);
    const response = await composio.connectedAccounts.list({
      userIds: [client.workspace_account_id]
    });
    const items = Array.isArray(response.items) ? response.items : Array.isArray(response) ? response : [];
    const accounts = items.filter((item) => Boolean(item && typeof item === "object")).map((account) => {
      const toolkit = normalizeToolkitSlug(
        account.toolkit?.slug ?? account.appName ?? account.app ?? account.toolkit?.name ?? "unknown"
      );
      const connectedAccountId = account.id ?? account.nanoid ?? "";
      const status = String(account.status ?? "UNKNOWN").toUpperCase();
      const authConfigId = account.authConfigId ?? resolveAuthConfigId(env, toolkit) ?? null;
      return {
        toolkit,
        connected_account_id: connectedAccountId || null,
        status,
        auth_config_id: authConfigId,
        created_at: account.createdAt ?? null,
        updated_at: account.updatedAt ?? null
      };
    }).filter((account) => account.toolkit !== "unknown");
    for (const account of accounts) {
      if (!account.connected_account_id) continue;
      await env.DB.prepare(
        `INSERT INTO partner_auth_connections (
           id, partner_client_id, toolkit, auth_config_id, connected_account_id, connection_status,
           last_checked_at, metadata_json
         ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), ?)
         ON CONFLICT(partner_client_id, toolkit, connected_account_id) DO UPDATE SET
           auth_config_id = excluded.auth_config_id,
           connection_status = excluded.connection_status,
           last_checked_at = datetime('now'),
           metadata_json = excluded.metadata_json,
           updated_at = datetime('now')`
      ).bind(
        randomId("paconn"),
        client.id,
        account.toolkit,
        account.auth_config_id,
        account.connected_account_id,
        account.status,
        JSON.stringify({
          source: "composio.connectedAccounts.list",
          created_at: account.created_at,
          updated_at: account.updated_at
        })
      ).run();
    }
    const requiredToolkits = parseJsonArray(client.required_toolkits_json);
    const statusByToolkit = /* @__PURE__ */ new Map();
    for (const account of accounts) {
      const current = statusByToolkit.get(account.toolkit) ?? {
        connected: false,
        status: "UNKNOWN",
        connected_account_ids: []
      };
      current.connected = current.connected || account.status === "ACTIVE";
      current.status = account.status;
      if (account.connected_account_id) {
        current.connected_account_ids.push(account.connected_account_id);
      }
      statusByToolkit.set(account.toolkit, current);
    }
    const toolkitStatus = [.../* @__PURE__ */ new Set([...requiredToolkits, ...statusByToolkit.keys()])].map((toolkit) => {
      const accountStatus = statusByToolkit.get(toolkit);
      return {
        toolkit,
        required: requiredToolkits.includes(toolkit),
        auth_config_id: resolveAuthConfigId(env, toolkit),
        connected: accountStatus?.connected ?? false,
        connection_status: accountStatus?.status ?? "NOT_CONNECTED",
        connected_account_ids: accountStatus?.connected_account_ids ?? []
      };
    });
    return json({
      client: {
        id: client.id,
        slug: client.slug,
        display_name: client.display_name,
        workspace_account_id: client.workspace_account_id,
        identity_account_id: client.identity_account_id,
        required_toolkits: requiredToolkits,
        metadata: parseJsonObject(client.metadata_json)
      },
      toolkits: toolkitStatus,
      checked_at: (/* @__PURE__ */ new Date()).toISOString(),
      policy: authz.policy
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
  GET
};
