import { error } from "@sveltejs/kit";
import { r as reconcileAgencyMcpEntitlement, c as upsertAgencyMcpEntitlement, e as evaluateAgencyMcpEntitlement } from "./mcp-entitlements.js";
import { g as getDomainConfig } from "./handlers.js";
import { g as getAuth0Config } from "./auth0.js";
import { createSessionManager } from "./session.js";
async function requireAgencySessionUser(input) {
  const domainConfig = getDomainConfig(input.platform?.env?.ENVIRONMENT);
  const auth0Config = getAuth0Config(input.platform?.env);
  const authProvider = auth0Config ? { type: "auth0", ...auth0Config } : void 0;
  const sessionManager = createSessionManager(input.cookies, {
    isProduction: input.platform?.env?.ENVIRONMENT === "production",
    domain: domainConfig.domain,
    authProvider
  });
  const user = await sessionManager.getUser();
  if (!user?.id || !user.email) {
    throw error(401, "Authentication required");
  }
  return user;
}
async function ensureAgencyMcpEntitlement(input) {
  const db = input.platform?.env?.DB;
  if (!db) {
    throw error(503, "Database is unavailable");
  }
  const row = await reconcileAgencyMcpEntitlement(db, {
    authSubject: input.user.id,
    authEmail: input.user.email,
    accountId: input.accountId ?? null,
    tenantId: input.tenantId ?? null,
    workspaceAccountId: input.accountId ?? null,
    serviceTier: input.user.tier ?? "agency"
  }) ?? await upsertAgencyMcpEntitlement(db, {
    authSubject: input.user.id,
    authEmail: input.user.email,
    accountId: input.accountId ?? null,
    tenantId: input.tenantId ?? null,
    workspaceAccountId: input.accountId ?? null,
    serviceTier: input.user.tier ?? "agency",
    metadata: {
      session_source: "auth0",
      user_source: input.user.source ?? "auth0",
      ...input.metadata ?? {}
    }
  });
  return {
    row,
    decision: evaluateAgencyMcpEntitlement(row, {
      accountId: input.accountId ?? null,
      tenantId: input.tenantId ?? null
    })
  };
}
export {
  ensureAgencyMcpEntitlement as e,
  requireAgencySessionUser as r
};
