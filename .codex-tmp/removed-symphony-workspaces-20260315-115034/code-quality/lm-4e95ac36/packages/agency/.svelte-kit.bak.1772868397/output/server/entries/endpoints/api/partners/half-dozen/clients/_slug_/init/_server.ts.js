import { json } from "@sveltejs/kit";
import { r as requirePartnerAdmin, n as normalizePartnerSlug, g as getPartnerClientBySlug, H as HALF_DOZEN_PARTNER_KEY, e as parseJsonObject, c as parseToolkitList, b as parseJsonArray, f as defaultWorkspaceAccountId, h as normalizeEmail, d as randomId, j as parseOptionalIsoTimestamp, P as PartnerAuthHttpError } from "../../../../../../../../chunks/partner-auth.js";
import { r as reconcileAgencyMcpEntitlement } from "../../../../../../../../chunks/mcp-entitlements.js";
const ALLOWED_STATUSES = /* @__PURE__ */ new Set(["initialized", "active", "paused", "sunset", "disabled"]);
const POST = async ({ request, params, platform }) => {
  try {
    const env = platform?.env;
    if (!env?.DB) {
      return json({ error: "unavailable", message: "Database is unavailable" }, { status: 503 });
    }
    const actor = requirePartnerAdmin(request, env);
    const slug = normalizePartnerSlug(params.slug);
    if (!slug) {
      return json({ error: "invalid_request", message: "Client slug is required" }, { status: 400 });
    }
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return json({ error: "invalid_request", message: "Invalid JSON body" }, { status: 400 });
    }
    const existing = await getPartnerClientBySlug(env.DB, HALF_DOZEN_PARTNER_KEY, slug);
    const existingMetadata = parseJsonObject(existing?.metadata_json);
    const incomingMetadata = body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata) ? body.metadata : {};
    const metadata = { ...existingMetadata, ...incomingMetadata, last_updated_by: actor };
    const requiredToolkits = body.required_toolkits !== void 0 ? parseToolkitList(body.required_toolkits) : parseJsonArray(existing?.required_toolkits_json);
    const displayName = body.display_name?.trim() || existing?.display_name || slug;
    const workspaceAccountId = normalizeIdentifier(body.workspace_account_id) ?? existing?.workspace_account_id ?? defaultWorkspaceAccountId(slug);
    const identityAccountId = normalizeIdentifier(body.identity_account_id) ?? existing?.identity_account_id ?? null;
    const identityUserId = normalizeIdentifier(body.identity_user_id) ?? existing?.identity_user_id ?? null;
    const identityTenantId = normalizeIdentifier(body.identity_tenant_id) ?? existing?.identity_tenant_id ?? normalizeIdentifier(slug);
    const ownerEmail = normalizeEmail(body.owner_email) ?? existing?.owner_email ?? null;
    const status = body.status && ALLOWED_STATUSES.has(body.status) ? body.status : existing?.status ?? "initialized";
    const rowId = existing?.id ?? randomId("pacli");
    if (existing) {
      await env.DB.prepare(
        `UPDATE partner_auth_clients
         SET display_name = ?, workspace_account_id = ?, identity_account_id = ?, identity_user_id = ?,
             identity_tenant_id = ?, owner_email = ?, status = ?, required_toolkits_json = ?, metadata_json = ?,
             updated_at = datetime('now')
         WHERE id = ?`
      ).bind(
        displayName,
        workspaceAccountId,
        identityAccountId,
        identityUserId,
        identityTenantId,
        ownerEmail,
        status,
        JSON.stringify(requiredToolkits),
        JSON.stringify(metadata),
        rowId
      ).run();
    } else {
      await env.DB.prepare(
        `INSERT INTO partner_auth_clients (
           id, partner_key, slug, display_name, workspace_account_id, identity_account_id,
           identity_user_id, identity_tenant_id, owner_email, status, required_toolkits_json, metadata_json
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        rowId,
        HALF_DOZEN_PARTNER_KEY,
        slug,
        displayName,
        workspaceAccountId,
        identityAccountId,
        identityUserId,
        identityTenantId,
        ownerEmail,
        status,
        JSON.stringify(requiredToolkits),
        JSON.stringify(metadata)
      ).run();
    }
    let consentRecordId = null;
    if (body.consent?.granted_by?.trim()) {
      const consentVersion = body.consent.consent_version?.trim() || "v1";
      const grantedBy = body.consent.granted_by.trim().slice(0, 255);
      const consentChannel = body.consent.channel?.trim() || "portal";
      const consentReference = body.consent.reference?.trim() || null;
      const grantedAt = parseOptionalIsoTimestamp(body.consent.granted_at) ?? (/* @__PURE__ */ new Date()).toISOString();
      const expiresAt = parseOptionalIsoTimestamp(body.consent.expires_at);
      const consentMetadata = body.consent.metadata && typeof body.consent.metadata === "object" && !Array.isArray(body.consent.metadata) ? body.consent.metadata : {};
      consentRecordId = randomId("paconsent");
      await env.DB.prepare(
        `INSERT INTO partner_auth_consents (
           id, partner_client_id, consent_version, consent_granted_by, consent_channel,
           consent_reference, granted_at, expires_at, metadata_json
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        consentRecordId,
        rowId,
        consentVersion,
        grantedBy,
        consentChannel,
        consentReference,
        grantedAt,
        expiresAt,
        JSON.stringify(consentMetadata)
      ).run();
    }
    const updated = await getPartnerClientBySlug(env.DB, HALF_DOZEN_PARTNER_KEY, slug);
    if (!updated) {
      return json({ error: "internal_error", message: "Failed to load updated partner client" }, { status: 500 });
    }
    if (updated.identity_user_id) {
      await reconcileAgencyMcpEntitlement(env.DB, {
        authSubject: updated.identity_user_id,
        authEmail: updated.owner_email,
        accountId: updated.identity_account_id ?? updated.workspace_account_id,
        tenantId: updated.identity_tenant_id ?? slug,
        workspaceAccountId: updated.workspace_account_id,
        serviceTier: "agency"
      });
    }
    return json({
      client: {
        id: updated.id,
        partner_key: updated.partner_key,
        slug: updated.slug,
        display_name: updated.display_name,
        workspace_account_id: updated.workspace_account_id,
        identity_account_id: updated.identity_account_id,
        identity_user_id: updated.identity_user_id,
        identity_tenant_id: updated.identity_tenant_id,
        owner_email: updated.owner_email,
        status: updated.status,
        required_toolkits: parseJsonArray(updated.required_toolkits_json),
        metadata: parseJsonObject(updated.metadata_json),
        created_at: updated.created_at,
        updated_at: updated.updated_at
      },
      consent_record_id: consentRecordId
    });
  } catch (error) {
    if (error instanceof PartnerAuthHttpError) {
      return json({ error: error.code, message: error.message }, { status: error.status });
    }
    return json(
      {
        error: "internal_error",
        message: error instanceof Error ? error.message : "Unexpected error"
      },
      { status: 500 }
    );
  }
};
function normalizeIdentifier(raw) {
  if (!raw) return null;
  const value = raw.trim();
  if (!value) return null;
  return value.slice(0, 255);
}
export {
  POST
};
