import { json } from "@sveltejs/kit";
import { r as requirePartnerAdmin, n as normalizePartnerSlug, g as getPartnerClientBySlug, H as HALF_DOZEN_PARTNER_KEY, k as authorizePartnerToolkitAdminAction, d as randomId, P as PartnerAuthHttpError } from "../../../../../../../../../../../chunks/partner-auth.js";
const POST = async ({ request, params, platform }) => {
  try {
    const env = platform?.env;
    if (!env?.DB) {
      return json({ error: "unavailable", message: "Database is unavailable" }, { status: 503 });
    }
    const actor = requirePartnerAdmin(request, env);
    const slug = normalizePartnerSlug(params.slug);
    const accountSlug = normalizePartnerSlug(params.accountSlug);
    if (!slug || !accountSlug) {
      return json({ error: "invalid_request", message: "Valid client and account slugs are required" }, { status: 400 });
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
      actionName: "disable_toolkit_account",
      accessType: "destructive",
      toolkit: "notion",
      accountSlug
    });
    const account = await env.DB.prepare(
      `SELECT * FROM partner_auth_notion_accounts
			 WHERE partner_client_id = ? AND account_slug = ?
			 LIMIT 1`
    ).bind(client.id, accountSlug).first();
    if (!account) {
      return json({ error: "not_found", message: "Notion account binding not found" }, { status: 404 });
    }
    await env.DB.prepare(
      `UPDATE partner_auth_notion_accounts
			 SET status = 'disabled', disabled_at = datetime('now'), updated_at = datetime('now')
			 WHERE id = ?`
    ).bind(account.id).run();
    await env.DB.prepare(
      `INSERT INTO partner_auth_notion_events (
				 id, partner_client_id, account_slug, event_type, actor, metadata_json
			 ) VALUES (?, ?, ?, 'account_disabled', ?, ?)`
    ).bind(randomId("panevent"), client.id, accountSlug, actor, JSON.stringify({ previous_status: account.status })).run();
    return json({
      client_slug: client.slug,
      account_slug: accountSlug,
      status: "disabled",
      policy: authz.policy
    });
  } catch (error) {
    if (error instanceof PartnerAuthHttpError) {
      return json({ error: error.code, message: error.message }, { status: error.status });
    }
    return json(
      { error: "internal_error", message: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 }
    );
  }
};
export {
  POST
};
