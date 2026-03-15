import { json } from "@sveltejs/kit";
import { l as listAgencyContractState, u as upsertAgencyContractState } from "../../../../../chunks/mcp-entitlements.js";
import { r as requireAgencyOperator } from "../../../../../chunks/operator-auth.js";
const GET = async ({ url, cookies, platform }) => {
  try {
    await requireAgencyOperator({ cookies, platform });
    const db = platform?.env?.DB;
    if (!db) {
      return json({ error: "unavailable", message: "Database is unavailable" }, { status: 503 });
    }
    const contracts = await listAgencyContractState(db, {
      limit: Number.parseInt(url.searchParams.get("limit") ?? "100", 10),
      search: url.searchParams.get("search") ?? void 0
    });
    return json({ contracts });
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
    if (!body?.contract_reference?.trim() || !body.contract_status) {
      return json({ error: "invalid_request", message: "contract_reference and contract_status are required" }, { status: 400 });
    }
    await upsertAgencyContractState(db, {
      authSubject: body.auth_subject?.trim() || null,
      authEmail: body.auth_email?.trim() || null,
      accountId: body.account_id?.trim() || null,
      tenantId: body.tenant_id?.trim() || null,
      contractReference: body.contract_reference.trim(),
      contractStatus: body.contract_status,
      contractActive: Boolean(body.contract_active),
      serviceEntitled: Boolean(body.service_entitled),
      policyAccepted: Boolean(body.policy_accepted),
      effectiveAt: body.effective_at?.trim() || null,
      expiresAt: body.expires_at?.trim() || null,
      metadata: {
        operator_email: operator.email,
        updated_via: "agency_contract_api",
        ...body.metadata ?? {}
      }
    });
    return json({ success: true });
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
