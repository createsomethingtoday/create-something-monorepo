import { json } from "@sveltejs/kit";
import { a as listAgencyMcpEntitlements, e as evaluateAgencyMcpEntitlement, b as updateAgencyMcpEntitlement } from "../../../../../chunks/mcp-entitlements.js";
import { r as requireAgencyOperator } from "../../../../../chunks/operator-auth.js";
const GET = async ({ url, cookies, platform }) => {
  try {
    await requireAgencyOperator({ cookies, platform });
    const db = platform?.env?.DB;
    if (!db) {
      return json({ error: "unavailable", message: "Database is unavailable" }, { status: 503 });
    }
    const rows = await listAgencyMcpEntitlements(db, {
      limit: Number.parseInt(url.searchParams.get("limit") ?? "100", 10),
      search: url.searchParams.get("search") ?? void 0
    });
    return json({
      entitlements: rows.map((row) => ({
        ...row,
        decision: evaluateAgencyMcpEntitlement(row)
      }))
    });
  } catch (error) {
    return handleError(error);
  }
};
const POST = async ({ request, cookies, platform }) => {
  try {
    const operator = await requireAgencyOperator({ cookies, platform });
    const db = platform?.env?.DB;
    if (!db) {
      return json({ error: "unavailable", message: "Database is unavailable" }, { status: 503 });
    }
    const body = await request.json().catch(() => null);
    const authSubject = body?.auth_subject?.trim();
    if (!authSubject) {
      return json({ error: "invalid_request", message: "auth_subject is required" }, { status: 400 });
    }
    const updated = await updateAgencyMcpEntitlement(db, {
      authSubject,
      authEmail: body?.auth_email ?? void 0,
      accountId: body?.account_id ?? void 0,
      tenantId: body?.tenant_id ?? void 0,
      workspaceAccountId: body?.workspace_account_id ?? void 0,
      serviceTier: body?.service_tier ?? void 0,
      managedBearerAllowed: body?.managed_bearer_allowed,
      orgMembershipActive: body?.org_membership_active,
      serviceEntitled: body?.service_entitled,
      policyAccepted: body?.policy_accepted,
      contractActive: body?.contract_active,
      billingActive: body?.billing_active,
      denialReason: body?.denial_reason,
      metadata: {
        operator_email: operator.email,
        updated_via: "agency_admin_api",
        ...body?.metadata ?? {}
      }
    });
    if (!updated) {
      return json({ error: "not_found", message: "Entitlement record not found" }, { status: 404 });
    }
    return json({
      entitlement: {
        ...updated,
        decision: evaluateAgencyMcpEntitlement(updated)
      }
    });
  } catch (error) {
    return handleError(error);
  }
};
function handleError(error) {
  if (error && typeof error === "object" && "status" in error && "body" in error) {
    const kitError = error;
    return json({ error: "request_failed", message: kitError.body?.message ?? "Request failed" }, { status: kitError.status });
  }
  return json(
    { error: "internal_error", message: error instanceof Error ? error.message : "Unexpected error" },
    { status: 500 }
  );
}
export {
  GET,
  POST
};
