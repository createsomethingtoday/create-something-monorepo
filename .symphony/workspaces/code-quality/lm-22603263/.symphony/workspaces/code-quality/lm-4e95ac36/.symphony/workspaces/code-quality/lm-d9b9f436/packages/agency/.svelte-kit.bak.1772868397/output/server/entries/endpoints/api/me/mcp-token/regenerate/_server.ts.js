import { json } from "@sveltejs/kit";
import { p as postIdentityAdmin, P as PartnerAuthHttpError } from "../../../../../../chunks/partner-auth.js";
import { r as requireAgencySessionUser, e as ensureAgencyMcpEntitlement } from "../../../../../../chunks/mcp-token.js";
const POST = async ({ request, cookies, platform }) => {
  try {
    const env = platform?.env;
    if (!env) {
      return json({ error: "unavailable", message: "Platform env is unavailable" }, { status: 503 });
    }
    const user = await requireAgencySessionUser({ cookies, platform });
    const body = await request.json().catch(() => null);
    const entitlement = await ensureAgencyMcpEntitlement({
      platform,
      user,
      accountId: body?.account_id,
      tenantId: body?.tenant_id,
      metadata: {
        managed_bearer_request: "regenerate"
      }
    });
    if (!entitlement.decision.allowed) {
      return json(
        {
          error: "entitlement_denied",
          message: entitlement.decision.reason,
          entitlement: entitlement.decision
        },
        { status: 403 }
      );
    }
    const issued = await postIdentityAdmin(env, "/v1/mcp/long-lived-tokens/admin-issue", {
      auth_subject: user.id,
      auth_email: user.email,
      tenant_id: entitlement.row.tenant_id ?? body?.tenant_id,
      account_id: entitlement.row.account_id ?? body?.account_id,
      toolkit_profile: body?.toolkit_profile,
      tool_mode: body?.tool_mode,
      actor: `agency:${user.id}`,
      metadata: {
        issued_via: "agency_api_regenerate",
        entitlement_reason: entitlement.decision.reason,
        ...body?.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata) ? body.metadata : {}
      }
    });
    return json({
      token: issued.token,
      token_id: issued.token_id,
      token_prefix: issued.token_prefix,
      account_id: issued.account_id,
      tenant_id: issued.tenant_id,
      tool_mode: issued.tool_mode,
      toolkit_profile: issued.toolkit_profile,
      allowed_tool_prefixes: issued.allowed_tool_prefixes
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
