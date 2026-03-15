import { a as listAgencyMcpEntitlements, l as listAgencyContractState, g as listAgencyCommercialState, e as evaluateAgencyMcpEntitlement } from "../../../../chunks/mcp-entitlements.js";
import { r as requireAgencyOperator } from "../../../../chunks/operator-auth.js";
const load = async ({ cookies, platform }) => {
  const operator = await requireAgencyOperator({ cookies, platform });
  const db = platform.env.DB;
  const [entitlements, contracts, commercial] = await Promise.all([
    listAgencyMcpEntitlements(db, { limit: 200 }),
    listAgencyContractState(db, { limit: 100 }),
    listAgencyCommercialState(db, { limit: 100 })
  ]);
  const evaluated = entitlements.map((row) => ({
    ...row,
    decision: evaluateAgencyMcpEntitlement(row)
  }));
  return {
    operator: {
      email: operator.email
    },
    summary: {
      totalEntitlements: evaluated.length,
      deniedEntitlements: evaluated.filter((row) => !row.decision.allowed).length,
      manualOverrides: evaluated.filter((row) => {
        try {
          const metadata = JSON.parse(row.metadata_json);
          return metadata.manual_override === true;
        } catch {
          return false;
        }
      }).length,
      activeContracts: contracts.filter((row) => row.contract_active === 1).length,
      inactiveBilling: commercial.filter((row) => row.billing_active !== 1).length,
      activeBilling: commercial.filter((row) => row.billing_active === 1).length
    },
    recentDeniedEntitlements: evaluated.filter((row) => !row.decision.allowed).slice(0, 10),
    recentContracts: contracts.slice(0, 10),
    recentCommercialAccounts: commercial.slice(0, 10)
  };
};
export {
  load
};
