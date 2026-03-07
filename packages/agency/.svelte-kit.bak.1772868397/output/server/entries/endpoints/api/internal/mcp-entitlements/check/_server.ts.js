import { json } from "@sveltejs/kit";
import { d as constantTimeEqual, r as reconcileAgencyMcpEntitlement, f as findAgencyMcpEntitlementByAuthSubject, e as evaluateAgencyMcpEntitlement } from "../../../../../../chunks/mcp-entitlements.js";
const POST = async ({ request, platform }) => {
  const env = platform?.env;
  if (!env?.DB) {
    return json({ error: "unavailable", message: "Database is unavailable" }, { status: 503 });
  }
  const expectedKey = env.AGENCY_INTERNAL_API_KEY?.trim();
  if (!expectedKey) {
    return json({ error: "not_configured", message: "AGENCY_INTERNAL_API_KEY is not configured" }, { status: 503 });
  }
  const providedKey = request.headers.get("X-API-Key")?.trim() ?? request.headers.get("Authorization")?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() ?? null;
  if (!providedKey || !constantTimeEqual(expectedKey, providedKey)) {
    return json({ error: "unauthorized", message: "Missing or invalid internal credential" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const authSubject = body?.auth_subject?.trim();
  if (!authSubject) {
    return json({ error: "invalid_request", message: "auth_subject is required" }, { status: 400 });
  }
  const row = await reconcileAgencyMcpEntitlement(env.DB, {
    authSubject,
    accountId: body?.account_id?.trim() || null,
    tenantId: body?.tenant_id?.trim() || null
  }) ?? await findAgencyMcpEntitlementByAuthSubject(env.DB, authSubject);
  const decision = evaluateAgencyMcpEntitlement(row, {
    accountId: body?.account_id?.trim() || null,
    tenantId: body?.tenant_id?.trim() || null
  });
  return json(decision);
};
export {
  POST
};
