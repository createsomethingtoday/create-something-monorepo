import { g as listAgencyCommercialState } from "../../../../../chunks/mcp-entitlements.js";
import { r as requireAgencyOperator } from "../../../../../chunks/operator-auth.js";
const load = async ({ cookies, platform }) => {
  await requireAgencyOperator({ cookies, platform });
  const commercial = await listAgencyCommercialState(platform.env.DB, { limit: 200 });
  return { commercial };
};
export {
  load
};
