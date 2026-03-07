function toFlag(value) {
  return value === 1;
}
async function findAgencyMcpEntitlementByAuthSubject(db, authSubject) {
  return db.prepare("SELECT * FROM agency_mcp_entitlements WHERE auth_subject = ? LIMIT 1").bind(authSubject).first();
}
async function upsertAgencyMcpEntitlement(db, input) {
  await db.prepare(
    `INSERT INTO agency_mcp_entitlements (
         auth_subject, auth_email, account_id, tenant_id, workspace_account_id, service_tier, metadata_json
       ) VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(auth_subject) DO UPDATE SET
         auth_email = excluded.auth_email,
         account_id = COALESCE(excluded.account_id, agency_mcp_entitlements.account_id),
         tenant_id = COALESCE(excluded.tenant_id, agency_mcp_entitlements.tenant_id),
         workspace_account_id = COALESCE(excluded.workspace_account_id, agency_mcp_entitlements.workspace_account_id),
         service_tier = COALESCE(excluded.service_tier, agency_mcp_entitlements.service_tier),
         metadata_json = excluded.metadata_json,
         updated_at = datetime('now')`
  ).bind(
    input.authSubject,
    input.authEmail,
    input.accountId ?? null,
    input.tenantId ?? null,
    input.workspaceAccountId ?? null,
    input.serviceTier ?? "agency",
    JSON.stringify(input.metadata ?? {})
  ).run();
  return await findAgencyMcpEntitlementByAuthSubject(db, input.authSubject);
}
async function listAgencyMcpEntitlements(db, options = {}) {
  const limit = Math.max(1, Math.min(250, options.limit ?? 100));
  const search = options.search?.trim();
  if (search) {
    const pattern = `%${search.toLowerCase()}%`;
    const result2 = await db.prepare(
      `SELECT * FROM agency_mcp_entitlements
         WHERE lower(auth_subject) LIKE ?
            OR lower(COALESCE(auth_email, '')) LIKE ?
            OR lower(COALESCE(account_id, '')) LIKE ?
            OR lower(COALESCE(tenant_id, '')) LIKE ?
         ORDER BY updated_at DESC
         LIMIT ?`
    ).bind(pattern, pattern, pattern, pattern, limit).all();
    return result2.results ?? [];
  }
  const result = await db.prepare(
    `SELECT * FROM agency_mcp_entitlements
       ORDER BY updated_at DESC
       LIMIT ?`
  ).bind(limit).all();
  return result.results ?? [];
}
async function listAgencyContractState(db, options = {}) {
  const limit = Math.max(1, Math.min(250, options.limit ?? 100));
  const search = options.search?.trim();
  if (search) {
    const pattern = `%${search.toLowerCase()}%`;
    const result2 = await db.prepare(
      `SELECT * FROM agency_contract_state
         WHERE lower(COALESCE(auth_subject, '')) LIKE ?
            OR lower(COALESCE(normalized_email, '')) LIKE ?
            OR lower(COALESCE(account_id, '')) LIKE ?
            OR lower(contract_reference) LIKE ?
         ORDER BY updated_at DESC
         LIMIT ?`
    ).bind(pattern, pattern, pattern, pattern, limit).all();
    return result2.results ?? [];
  }
  const result = await db.prepare("SELECT * FROM agency_contract_state ORDER BY updated_at DESC LIMIT ?").bind(limit).all();
  return result.results ?? [];
}
async function listAgencyCommercialState(db, options = {}) {
  const limit = Math.max(1, Math.min(250, options.limit ?? 100));
  const search = options.search?.trim();
  if (search) {
    const pattern = `%${search.toLowerCase()}%`;
    const result2 = await db.prepare(
      `SELECT * FROM agency_commercial_accounts
         WHERE lower(COALESCE(normalized_email, '')) LIKE ?
            OR lower(COALESCE(stripe_customer_id, '')) LIKE ?
            OR lower(COALESCE(stripe_subscription_id, '')) LIKE ?
            OR lower(COALESCE(product_id, '')) LIKE ?
         ORDER BY updated_at DESC
         LIMIT ?`
    ).bind(pattern, pattern, pattern, pattern, limit).all();
    return result2.results ?? [];
  }
  const result = await db.prepare("SELECT * FROM agency_commercial_accounts ORDER BY updated_at DESC LIMIT ?").bind(limit).all();
  return result.results ?? [];
}
async function upsertAgencyContractState(db, input) {
  const normalizedEmail = normalizeEmail(input.authEmail);
  await db.prepare(
    `INSERT INTO agency_contract_state (
         id, auth_subject, normalized_email, account_id, tenant_id, contract_reference, contract_status,
         contract_active, service_entitled, policy_accepted, effective_at, expires_at, metadata_json
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(contract_reference) DO UPDATE SET
         auth_subject = COALESCE(excluded.auth_subject, agency_contract_state.auth_subject),
         normalized_email = COALESCE(excluded.normalized_email, agency_contract_state.normalized_email),
         account_id = COALESCE(excluded.account_id, agency_contract_state.account_id),
         tenant_id = COALESCE(excluded.tenant_id, agency_contract_state.tenant_id),
         contract_status = excluded.contract_status,
         contract_active = excluded.contract_active,
         service_entitled = excluded.service_entitled,
         policy_accepted = excluded.policy_accepted,
         effective_at = COALESCE(excluded.effective_at, agency_contract_state.effective_at),
         expires_at = COALESCE(excluded.expires_at, agency_contract_state.expires_at),
         metadata_json = excluded.metadata_json,
         updated_at = datetime('now')`
  ).bind(
    `contract_${crypto.randomUUID().replace(/-/g, "")}`,
    input.authSubject ?? null,
    normalizedEmail,
    input.accountId ?? null,
    input.tenantId ?? null,
    input.contractReference,
    input.contractStatus,
    input.contractActive ? 1 : 0,
    input.serviceEntitled ? 1 : 0,
    input.policyAccepted ? 1 : 0,
    input.effectiveAt ?? null,
    input.expiresAt ?? null,
    JSON.stringify(input.metadata ?? {})
  ).run();
}
async function updateAgencyMcpEntitlement(db, input) {
  const existing = await findAgencyMcpEntitlementByAuthSubject(db, input.authSubject);
  if (!existing) {
    return null;
  }
  const mergedMetadata = {
    ...safeParseMetadata(existing.metadata_json),
    ...input.metadata ?? {},
    manual_override: true
  };
  await db.prepare(
    `UPDATE agency_mcp_entitlements
       SET auth_email = ?,
           account_id = ?,
           tenant_id = ?,
           workspace_account_id = ?,
           service_tier = ?,
           managed_bearer_allowed = ?,
           org_membership_active = ?,
           service_entitled = ?,
           policy_accepted = ?,
           contract_active = ?,
           billing_active = ?,
           denial_reason = ?,
           metadata_json = ?,
           updated_at = datetime('now')
       WHERE auth_subject = ?`
  ).bind(
    input.authEmail ?? existing.auth_email,
    input.accountId ?? existing.account_id,
    input.tenantId ?? existing.tenant_id,
    input.workspaceAccountId ?? existing.workspace_account_id,
    input.serviceTier ?? existing.service_tier,
    booleanToInt(input.managedBearerAllowed, existing.managed_bearer_allowed),
    booleanToInt(input.orgMembershipActive, existing.org_membership_active),
    booleanToInt(input.serviceEntitled, existing.service_entitled),
    booleanToInt(input.policyAccepted, existing.policy_accepted),
    booleanToInt(input.contractActive, existing.contract_active),
    booleanToInt(input.billingActive, existing.billing_active),
    input.denialReason === void 0 ? existing.denial_reason : input.denialReason,
    JSON.stringify(mergedMetadata),
    input.authSubject
  ).run();
  return findAgencyMcpEntitlementByAuthSubject(db, input.authSubject);
}
async function reconcileAgencyMcpEntitlement(db, input) {
  const existing = await findAgencyMcpEntitlementByAuthSubject(db, input.authSubject);
  const existingMetadata = existing ? safeParseMetadata(existing.metadata_json) : {};
  if (existingMetadata.manual_override === true && existing) {
    return existing;
  }
  const source = await findAgencyPartnerEntitlementSource(db, input.authSubject, input.authEmail ?? existing?.auth_email ?? null);
  const contract = await findAgencyContractState(
    db,
    input.authSubject,
    input.authEmail ?? existing?.auth_email ?? null,
    input.accountId ?? existing?.account_id ?? null,
    input.tenantId ?? existing?.tenant_id ?? null
  );
  const commercial = await findAgencyCommercialStateByEmail(db, input.authEmail ?? existing?.auth_email ?? null);
  if (!source) {
    const contractActive2 = contract ? contract.contract_active === 1 : commercial ? commercial.contract_active === 1 : existing?.contract_active === 1;
    const billingActive2 = commercial ? commercial.billing_active === 1 : existing?.billing_active === 1;
    const serviceEntitled2 = contract ? contract.service_entitled === 1 : existing?.service_entitled === 1;
    const policyAccepted2 = contract ? contract.policy_accepted === 1 : existing?.policy_accepted === 1;
    const commerciallyAllowed = contractActive2 && billingActive2;
    if (existing) {
      await db.prepare(
        `UPDATE agency_mcp_entitlements
           SET contract_active = ?,
               billing_active = ?,
               service_entitled = ?,
               policy_accepted = ?,
               denial_reason = ?,
               updated_at = datetime('now')
           WHERE auth_subject = ?`
      ).bind(
        contractActive2 ? 1 : 0,
        billingActive2 ? 1 : 0,
        serviceEntitled2 ? 1 : 0,
        policyAccepted2 ? 1 : 0,
        deriveEntitlementDenialReason({
          contractActive: contractActive2,
          billingActive: billingActive2,
          serviceEntitled: serviceEntitled2,
          policyAccepted: policyAccepted2,
          statusReason: null
        }),
        input.authSubject
      ).run();
      return findAgencyMcpEntitlementByAuthSubject(db, input.authSubject);
    }
    return upsertAgencyMcpEntitlement(db, {
      authSubject: input.authSubject,
      authEmail: input.authEmail ?? null,
      accountId: input.accountId ?? null,
      tenantId: input.tenantId ?? null,
      workspaceAccountId: input.workspaceAccountId ?? input.accountId ?? null,
      serviceTier: input.serviceTier ?? "agency",
      metadata: {
        source: commercial ? "stripe_commercial_state" : "session_bootstrap",
        manual_override: false,
        contract_reference: contract?.contract_reference ?? null,
        contract_status: contract?.contract_status ?? null,
        stripe_customer_id: commercial?.stripe_customer_id ?? null,
        stripe_subscription_id: commercial?.stripe_subscription_id ?? null,
        subscription_status: commercial?.subscription_status ?? null,
        product_id: commercial?.product_id ?? null
      }
    }).then(async () => {
      await db.prepare(
        `UPDATE agency_mcp_entitlements
           SET managed_bearer_allowed = ?,
               org_membership_active = ?,
               service_entitled = ?,
               policy_accepted = ?,
               contract_active = ?,
               billing_active = ?,
               denial_reason = ?,
               updated_at = datetime('now')
           WHERE auth_subject = ?`
      ).bind(
        commerciallyAllowed && serviceEntitled2 && policyAccepted2 ? 1 : 0,
        commerciallyAllowed && serviceEntitled2 ? 1 : 0,
        serviceEntitled2 ? 1 : 0,
        policyAccepted2 ? 1 : 0,
        contractActive2 ? 1 : 0,
        billingActive2 ? 1 : 0,
        deriveEntitlementDenialReason({
          contractActive: contractActive2,
          billingActive: billingActive2,
          serviceEntitled: serviceEntitled2,
          policyAccepted: policyAccepted2,
          statusReason: null
        }),
        input.authSubject
      ).run();
      return findAgencyMcpEntitlementByAuthSubject(db, input.authSubject);
    });
  }
  const hasAccess = source.status === "active";
  const policyAccepted = contract ? contract.policy_accepted === 1 : Boolean(source.active_consent_id);
  const contractActive = contract ? contract.contract_active === 1 : commercial ? commercial.contract_active === 1 : hasAccess;
  const billingActive = commercial ? commercial.billing_active === 1 : hasAccess;
  const serviceEntitled = contract ? contract.service_entitled === 1 : hasAccess;
  const statusReason = derivePartnerDenialReason(source.status);
  const denialReason = deriveEntitlementDenialReason({
    contractActive,
    billingActive,
    serviceEntitled,
    policyAccepted,
    statusReason
  });
  return upsertAgencyMcpEntitlement(db, {
    authSubject: input.authSubject,
    authEmail: input.authEmail ?? source.owner_email,
    accountId: source.identity_account_id ?? input.accountId ?? existing?.account_id ?? source.workspace_account_id,
    tenantId: source.identity_tenant_id ?? input.tenantId ?? existing?.tenant_id ?? source.slug,
    workspaceAccountId: source.workspace_account_id,
    serviceTier: input.serviceTier ?? "agency",
    metadata: {
      manual_override: false,
      source: commercial ? "partner_auth_client+stripe" : "partner_auth_client",
      partner_client_id: source.partner_client_id,
      partner_key: source.partner_key,
      client_slug: source.slug,
      partner_status: source.status,
      active_consent_id: source.active_consent_id,
      contract_reference: contract?.contract_reference ?? null,
      contract_status: contract?.contract_status ?? null,
      stripe_customer_id: commercial?.stripe_customer_id ?? null,
      stripe_subscription_id: commercial?.stripe_subscription_id ?? null,
      subscription_status: commercial?.subscription_status ?? null,
      product_id: commercial?.product_id ?? null
    }
  }).then(async (row) => {
    await db.prepare(
      `UPDATE agency_mcp_entitlements
         SET managed_bearer_allowed = ?,
             org_membership_active = ?,
             service_entitled = ?,
             policy_accepted = ?,
             contract_active = ?,
             billing_active = ?,
             denial_reason = ?,
             updated_at = datetime('now')
         WHERE auth_subject = ?`
    ).bind(
      hasAccess && contractActive && billingActive && serviceEntitled && policyAccepted ? 1 : 0,
      hasAccess ? 1 : 0,
      serviceEntitled ? 1 : 0,
      policyAccepted ? 1 : 0,
      contractActive ? 1 : 0,
      billingActive ? 1 : 0,
      denialReason,
      input.authSubject
    ).run();
    return findAgencyMcpEntitlementByAuthSubject(db, input.authSubject);
  });
}
function evaluateAgencyMcpEntitlement(row, expected = {}) {
  if (!row) {
    return {
      allowed: false,
      reason: "missing_entitlement_record",
      account_id: null,
      tenant_id: null,
      checks: {
        managed_bearer_allowed: false,
        org_membership_active: false,
        service_entitled: false,
        policy_accepted: false,
        contract_active: false,
        billing_active: false
      }
    };
  }
  const checks = {
    managed_bearer_allowed: toFlag(row.managed_bearer_allowed),
    org_membership_active: toFlag(row.org_membership_active),
    service_entitled: toFlag(row.service_entitled),
    policy_accepted: toFlag(row.policy_accepted),
    contract_active: toFlag(row.contract_active),
    billing_active: toFlag(row.billing_active)
  };
  if (!checks.managed_bearer_allowed) {
    return { allowed: false, reason: row.denial_reason ?? "managed_bearer_disabled", account_id: row.account_id, tenant_id: row.tenant_id, checks };
  }
  if (!checks.org_membership_active) {
    return { allowed: false, reason: row.denial_reason ?? "org_membership_inactive", account_id: row.account_id, tenant_id: row.tenant_id, checks };
  }
  if (!checks.service_entitled) {
    return { allowed: false, reason: row.denial_reason ?? "service_not_entitled", account_id: row.account_id, tenant_id: row.tenant_id, checks };
  }
  if (!checks.policy_accepted) {
    return { allowed: false, reason: row.denial_reason ?? "policy_acceptance_required", account_id: row.account_id, tenant_id: row.tenant_id, checks };
  }
  if (!checks.contract_active) {
    return { allowed: false, reason: row.denial_reason ?? "contract_inactive", account_id: row.account_id, tenant_id: row.tenant_id, checks };
  }
  if (!checks.billing_active) {
    return { allowed: false, reason: row.denial_reason ?? "billing_inactive", account_id: row.account_id, tenant_id: row.tenant_id, checks };
  }
  if (expected.accountId && row.account_id && row.account_id !== expected.accountId) {
    return { allowed: false, reason: "account_mismatch", account_id: row.account_id, tenant_id: row.tenant_id, checks };
  }
  if (expected.tenantId && row.tenant_id && row.tenant_id !== expected.tenantId) {
    return { allowed: false, reason: "tenant_mismatch", account_id: row.account_id, tenant_id: row.tenant_id, checks };
  }
  return {
    allowed: true,
    reason: "allowed",
    account_id: row.account_id,
    tenant_id: row.tenant_id,
    checks
  };
}
function safeParseMetadata(raw) {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
  }
  return {};
}
function booleanToInt(input, fallback) {
  return input === void 0 ? fallback : input ? 1 : 0;
}
async function findAgencyPartnerEntitlementSource(db, authSubject, authEmail) {
  const normalizedEmail = authEmail?.trim().toLowerCase() ?? null;
  if (normalizedEmail) {
    const row = await db.prepare(
      `SELECT c.id AS partner_client_id, c.partner_key, c.slug, c.status, c.workspace_account_id,
                c.identity_account_id, c.identity_user_id, c.identity_tenant_id, c.owner_email,
                consent.id AS active_consent_id
         FROM partner_auth_clients c
         LEFT JOIN partner_auth_consents consent
           ON consent.partner_client_id = c.id
          AND consent.revoked_at IS NULL
          AND (consent.expires_at IS NULL OR consent.expires_at > datetime('now'))
         WHERE c.identity_user_id = ?
            OR lower(COALESCE(c.owner_email, '')) = ?
         ORDER BY
           CASE WHEN c.identity_user_id = ? THEN 0 ELSE 1 END,
           CASE c.status
             WHEN 'active' THEN 0
             WHEN 'paused' THEN 1
             WHEN 'initialized' THEN 2
             WHEN 'sunset' THEN 3
             ELSE 4
           END,
           c.updated_at DESC
         LIMIT 1`
    ).bind(authSubject, normalizedEmail, authSubject).first();
    return row;
  }
  return db.prepare(
    `SELECT c.id AS partner_client_id, c.partner_key, c.slug, c.status, c.workspace_account_id,
              c.identity_account_id, c.identity_user_id, c.identity_tenant_id, c.owner_email,
              consent.id AS active_consent_id
       FROM partner_auth_clients c
       LEFT JOIN partner_auth_consents consent
         ON consent.partner_client_id = c.id
        AND consent.revoked_at IS NULL
        AND (consent.expires_at IS NULL OR consent.expires_at > datetime('now'))
       WHERE c.identity_user_id = ?
       ORDER BY
         CASE c.status
           WHEN 'active' THEN 0
           WHEN 'paused' THEN 1
           WHEN 'initialized' THEN 2
           WHEN 'sunset' THEN 3
           ELSE 4
         END,
         c.updated_at DESC
       LIMIT 1`
  ).bind(authSubject).first();
}
function derivePartnerDenialReason(status, policyAccepted) {
  switch (status) {
    case "active":
      return null;
    case "paused":
      return "client_paused";
    case "initialized":
      return "client_not_activated";
    case "sunset":
      return "client_sunset";
    case "disabled":
      return "client_disabled";
    default:
      return "client_ineligible";
  }
}
async function findAgencyCommercialStateByEmail(db, authEmail) {
  const normalizedEmail = authEmail?.trim().toLowerCase() ?? null;
  if (!normalizedEmail) {
    return null;
  }
  return db.prepare(
    `SELECT * FROM agency_commercial_accounts
       WHERE normalized_email = ?
       ORDER BY
         billing_active DESC,
         contract_active DESC,
         updated_at DESC
       LIMIT 1`
  ).bind(normalizedEmail).first();
}
async function findAgencyContractState(db, authSubject, authEmail, accountId, tenantId) {
  const normalizedEmail = normalizeEmail(authEmail);
  const result = await db.prepare(
    `SELECT * FROM agency_contract_state
       WHERE (auth_subject IS NOT NULL AND auth_subject = ?)
          OR (? IS NOT NULL AND normalized_email = ?)
          OR (? IS NOT NULL AND account_id = ? AND (? IS NULL OR tenant_id = ?))
       ORDER BY
         contract_active DESC,
         service_entitled DESC,
         policy_accepted DESC,
         updated_at DESC
       LIMIT 1`
  ).bind(authSubject, normalizedEmail, normalizedEmail, accountId, accountId, tenantId, tenantId).first();
  return result;
}
function deriveEntitlementDenialReason(input) {
  if (input.statusReason) {
    return input.statusReason;
  }
  if (!input.policyAccepted) {
    return "policy_acceptance_required";
  }
  if (!input.serviceEntitled) {
    return "service_not_entitled";
  }
  if (!input.contractActive) {
    return "contract_inactive";
  }
  if (!input.billingActive) {
    return "billing_inactive";
  }
  return null;
}
function normalizeEmail(raw) {
  if (!raw) return null;
  const value = raw.trim().toLowerCase();
  return value.length > 0 ? value : null;
}
function constantTimeEqual(left, right) {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
}
export {
  listAgencyMcpEntitlements as a,
  updateAgencyMcpEntitlement as b,
  upsertAgencyMcpEntitlement as c,
  constantTimeEqual as d,
  evaluateAgencyMcpEntitlement as e,
  findAgencyMcpEntitlementByAuthSubject as f,
  listAgencyCommercialState as g,
  listAgencyContractState as l,
  reconcileAgencyMcpEntitlement as r,
  upsertAgencyContractState as u
};
