import { json } from "@sveltejs/kit";
import { p as postIdentityAdmin, P as PartnerAuthHttpError } from "../../../../../../chunks/partner-auth.js";
import { r as requireAgencySessionUser } from "../../../../../../chunks/mcp-token.js";
const POST = async ({ cookies, platform }) => {
  try {
    const env = platform?.env;
    if (!env) {
      return json({ error: "unavailable", message: "Platform env is unavailable" }, { status: 503 });
    }
    const user = await requireAgencySessionUser({ cookies, platform });
    const existing = await postIdentityAdmin(env, "/v1/mcp/long-lived-tokens/admin-get", {
      auth_subject: user.id
    });
    if (!existing.token?.id || !existing.token.active) {
      return json({ success: true, revoked: false, token_id: null });
    }
    const result = await postIdentityAdmin(
      env,
      `/v1/mcp/long-lived-tokens/${existing.token.id}/revoke`,
      {}
    );
    return json(result);
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
