import { l as listAgencyContractState } from "../../../../../chunks/mcp-entitlements.js";
import { r as requireAgencyOperator } from "../../../../../chunks/operator-auth.js";
const load = async ({ cookies, platform }) => {
  const operator = await requireAgencyOperator({ cookies, platform });
  const contracts = await listAgencyContractState(platform.env.DB, { limit: 100 });
  return {
    operator: {
      email: operator.email
    },
    contracts
  };
};
export {
  load
};
