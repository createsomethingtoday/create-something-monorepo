import { H as HALF_DOZEN_PARTNER_KEY, p as postIdentityAdmin } from "../../../../../chunks/partner-auth.js";
import { r as requireAgencyOperator } from "../../../../../chunks/operator-auth.js";
const load = async ({ cookies, platform }) => {
  await requireAgencyOperator({ cookies, platform });
  const db = platform.env.DB;
  const deliveries = await db.prepare(
    `SELECT d.*, c.slug AS client_slug, c.display_name AS client_display_name
       FROM partner_access_deliveries d
       JOIN partner_auth_clients c ON c.id = d.partner_client_id
       WHERE c.partner_key = ?
       ORDER BY d.created_at DESC
       LIMIT 100`
  ).bind(HALF_DOZEN_PARTNER_KEY).all();
  const identityAudit = await postIdentityAdmin(
    platform.env,
    "/v1/mcp/audit/admin-feed",
    { limit: 100 }
  );
  return {
    deliveries: deliveries.results ?? [],
    authEvents: identityAudit.auth_events,
    policyEvents: identityAudit.policy_events
  };
};
export {
  load
};
