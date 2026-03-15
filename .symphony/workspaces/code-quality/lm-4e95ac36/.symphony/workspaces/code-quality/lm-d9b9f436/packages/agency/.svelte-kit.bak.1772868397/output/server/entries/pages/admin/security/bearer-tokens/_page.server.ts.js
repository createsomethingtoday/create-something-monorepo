import { a as listAgencyMcpEntitlements, e as evaluateAgencyMcpEntitlement } from "../../../../../chunks/mcp-entitlements.js";
import { r as requireAgencyOperator } from "../../../../../chunks/operator-auth.js";
const load = async ({ cookies, platform }) => {
  const operator = await requireAgencyOperator({ cookies, platform });
  const rows = await listAgencyMcpEntitlements(platform.env.DB, { limit: 100 });
  return {
    operator: {
      email: operator.email
    },
    entitlements: rows.map((row) => ({
      ...row,
      decision: evaluateAgencyMcpEntitlement(row)
    }))
  };
};
export {
  load
};
