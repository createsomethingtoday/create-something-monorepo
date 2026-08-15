export interface AgencyMcpEntitlementRow {
  auth_subject: string;
  auth_email: string | null;
  account_id: string | null;
  tenant_id: string | null;
  workspace_account_id: string | null;
  service_tier: string;
  managed_bearer_allowed: number;
  org_membership_active: number;
  service_entitled: number;
  policy_accepted: number;
  contract_active: number;
  billing_active: number;
  denial_reason: string | null;
  metadata_json: string;
  created_at: string;
  updated_at: string;
}

export interface AgencyMcpEntitlementDecision {
  allowed: boolean;
  reason: string;
  account_id: string | null;
  tenant_id: string | null;
  checks: {
    managed_bearer_allowed: boolean;
    org_membership_active: boolean;
    service_entitled: boolean;
    policy_accepted: boolean;
    contract_active: boolean;
    billing_active: boolean;
  };
}

export type AgencyCanonicalServiceTier = 'mcp_only' | 'policy_os_trial' | 'policy_os_core';

export interface AgencyEntitlementSnapshot {
  service_tier: AgencyCanonicalServiceTier;
  managed_bearer_allowed: boolean;
  org_membership_active: boolean;
  service_entitled: boolean;
  policy_accepted: boolean;
  contract_active: boolean;
  billing_active: boolean;
  approved_exception: {
    present: boolean;
    type: string | null;
    allowed_scope: string | null;
    graduation_target: string | null;
    review_by: string | null;
  };
}

export interface AgencyMcpEntitlementUpdateInput {
  authSubject: string;
  authEmail?: string | null;
  accountId?: string | null;
  tenantId?: string | null;
  workspaceAccountId?: string | null;
  serviceTier?: string | null;
  managedBearerAllowed?: boolean;
  orgMembershipActive?: boolean;
  serviceEntitled?: boolean;
  policyAccepted?: boolean;
  contractActive?: boolean;
  billingActive?: boolean;
  denialReason?: string | null;
  metadata?: Record<string, unknown>;
}

interface AgencyPartnerEntitlementSource {
  partner_client_id: string;
  partner_key: string;
  slug: string;
  status: 'initialized' | 'active' | 'paused' | 'sunset' | 'disabled';
  workspace_account_id: string;
  identity_account_id: string | null;
  identity_user_id: string | null;
  identity_tenant_id: string | null;
  owner_email: string | null;
  active_consent_id: string | null;
  lane_id: string | null;
  lane_slug: string | null;
  lane_display_name: string | null;
  lane_hub_url: string | null;
  lane_host_key: string | null;
  lane_metadata_json: string | null;
}

export interface AgencyCommercialStateRow {
  id: string;
  normalized_email: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  product_id: string | null;
  service_tier: string | null;
  subscription_status: string | null;
  contract_active: number;
  billing_active: number;
  current_period_end: string | null;
  last_invoice_status: string | null;
  metadata_json: string;
  created_at: string;
  updated_at: string;
}

export interface AgencyIdentitySeedRow {
  normalized_email: string;
  auth_subject: string | null;
  account_id: string;
  tenant_id: string;
  workspace_account_id: string | null;
  service_tier: string;
  managed_bearer_allowed: number;
  org_membership_active: number;
  service_entitled: number;
  policy_accepted: number;
  contract_active: number;
  billing_active: number;
  status: string;
  invited_at: string | null;
  bound_at: string | null;
  metadata_json: string;
  created_at: string;
  updated_at: string;
}

export interface AgencyIdentitySeedUpsertInput {
  authEmail: string;
  authSubject?: string | null;
  accountId: string;
  tenantId: string;
  workspaceAccountId?: string | null;
  serviceTier?: string | null;
  managedBearerAllowed?: boolean;
  orgMembershipActive?: boolean;
  serviceEntitled?: boolean;
  policyAccepted?: boolean;
  contractActive?: boolean;
  billingActive?: boolean;
  status?: string;
  invitedAt?: string | null;
  boundAt?: string | null;
  metadata?: Record<string, unknown>;
}

export interface AgencyContractStateRow {
  id: string;
  auth_subject: string | null;
  normalized_email: string | null;
  account_id: string | null;
  tenant_id: string | null;
  contract_reference: string;
  contract_status: 'draft' | 'pending' | 'active' | 'paused' | 'expired' | 'terminated';
  contract_active: number;
  service_entitled: number;
  policy_accepted: number;
  effective_at: string | null;
  expires_at: string | null;
  metadata_json: string;
  created_at: string;
  updated_at: string;
}

function toFlag(value: number | null | undefined): boolean {
  return value === 1;
}

export function normalizeAgencyServiceTier(
  value: string | null | undefined,
  fallback: AgencyCanonicalServiceTier = 'mcp_only'
): AgencyCanonicalServiceTier {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return fallback;

  if (
    normalized === 'mcp_only' ||
    normalized === 'mcp-only' ||
    normalized === 'free' ||
    normalized === 'agency' ||
    normalized === 'vertical-templates'
  ) {
    return 'mcp_only';
  }

  if (
    normalized === 'policy_os_trial' ||
    normalized === 'policy-os-trial' ||
    normalized === 'trial' ||
    normalized === 'pilot' ||
    normalized === 'solo' ||
    normalized === 'pro'
  ) {
    return 'policy_os_trial';
  }

  if (
    normalized === 'policy_os_core' ||
    normalized === 'policy-os-core' ||
    normalized === 'core' ||
    normalized === 'team' ||
    normalized === 'org'
  ) {
    return 'policy_os_core';
  }

  return fallback;
}

export function buildAgencyEntitlementSnapshot(
  row: AgencyMcpEntitlementRow | null,
  decision?: AgencyMcpEntitlementDecision | null
): AgencyEntitlementSnapshot {
  const metadata = row ? safeParseMetadata(row.metadata_json) : {};
  const approvedException = asObject(metadata.approved_exception) ?? asObject(metadata.exception);

  return {
    service_tier: normalizeAgencyServiceTier(row?.service_tier),
    managed_bearer_allowed:
      decision?.checks.managed_bearer_allowed ?? toFlag(row?.managed_bearer_allowed),
    org_membership_active:
      decision?.checks.org_membership_active ?? toFlag(row?.org_membership_active),
    service_entitled: decision?.checks.service_entitled ?? toFlag(row?.service_entitled),
    policy_accepted: decision?.checks.policy_accepted ?? toFlag(row?.policy_accepted),
    contract_active: decision?.checks.contract_active ?? toFlag(row?.contract_active),
    billing_active: decision?.checks.billing_active ?? toFlag(row?.billing_active),
    approved_exception: {
      present: Boolean(approvedException),
      type:
        typeof approvedException?.exception_type === 'string'
          ? approvedException.exception_type
          : null,
      allowed_scope:
        typeof approvedException?.allowed_scope === 'string'
          ? approvedException.allowed_scope
          : null,
      graduation_target:
        typeof approvedException?.graduation_target === 'string'
          ? approvedException.graduation_target
          : null,
      review_by:
        typeof approvedException?.expiration_or_review_date === 'string'
          ? approvedException.expiration_or_review_date
          : null
    }
  };
}

export async function findAgencyMcpEntitlementByAuthSubject(
  db: D1Database,
  authSubject: string
): Promise<AgencyMcpEntitlementRow | null> {
  return db
    .prepare('SELECT * FROM agency_mcp_entitlements WHERE auth_subject = ? LIMIT 1')
    .bind(authSubject)
    .first<AgencyMcpEntitlementRow>();
}

export async function findAgencyMcpEntitlementByEmail(
  db: D1Database,
  authEmail: string
): Promise<AgencyMcpEntitlementRow | null> {
  const normalizedEmail = normalizeEmail(authEmail);
  if (!normalizedEmail) return null;

  return db
    .prepare(
      `SELECT * FROM agency_mcp_entitlements
       WHERE lower(COALESCE(auth_email, '')) = ?
       ORDER BY updated_at DESC
       LIMIT 1`
    )
    .bind(normalizedEmail)
    .first<AgencyMcpEntitlementRow>();
}

export async function upsertAgencyMcpEntitlement(
  db: D1Database,
  input: {
    authSubject: string;
    authEmail: string | null;
    accountId?: string | null;
    tenantId?: string | null;
    workspaceAccountId?: string | null;
    serviceTier?: string | null;
    metadata?: Record<string, unknown>;
  }
): Promise<AgencyMcpEntitlementRow> {
  await db
    .prepare(
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
    )
    .bind(
      input.authSubject,
      input.authEmail,
      input.accountId ?? null,
      input.tenantId ?? null,
      input.workspaceAccountId ?? null,
      normalizeAgencyServiceTier(input.serviceTier),
      JSON.stringify(input.metadata ?? {})
    )
    .run();

  return (await findAgencyMcpEntitlementByAuthSubject(db, input.authSubject))!;
}

export async function listAgencyMcpEntitlements(
  db: D1Database,
  options: { limit?: number; search?: string } = {}
): Promise<AgencyMcpEntitlementRow[]> {
  const limit = Math.max(1, Math.min(250, options.limit ?? 100));
  const search = options.search?.trim();
  if (search) {
    const pattern = `%${search.toLowerCase()}%`;
    const result = await db
      .prepare(
        `SELECT * FROM agency_mcp_entitlements
         WHERE lower(auth_subject) LIKE ?
            OR lower(COALESCE(auth_email, '')) LIKE ?
            OR lower(COALESCE(account_id, '')) LIKE ?
            OR lower(COALESCE(tenant_id, '')) LIKE ?
         ORDER BY updated_at DESC
         LIMIT ?`
      )
      .bind(pattern, pattern, pattern, pattern, limit)
      .all<AgencyMcpEntitlementRow>();
    return (result.results ?? []).map((row) => ({
      ...row,
      service_tier: normalizeAgencyServiceTier(row.service_tier)
    }));
  }

  const result = await db
    .prepare(
      `SELECT * FROM agency_mcp_entitlements
       ORDER BY updated_at DESC
       LIMIT ?`
    )
    .bind(limit)
    .all<AgencyMcpEntitlementRow>();
  return (result.results ?? []).map((row) => ({
    ...row,
    service_tier: normalizeAgencyServiceTier(row.service_tier)
  }));
}

export async function listAgencyContractState(
  db: D1Database,
  options: { limit?: number; search?: string } = {}
): Promise<AgencyContractStateRow[]> {
  const limit = Math.max(1, Math.min(250, options.limit ?? 100));
  const search = options.search?.trim();
  if (search) {
    const pattern = `%${search.toLowerCase()}%`;
    const result = await db
      .prepare(
        `SELECT * FROM agency_contract_state
         WHERE lower(COALESCE(auth_subject, '')) LIKE ?
            OR lower(COALESCE(normalized_email, '')) LIKE ?
            OR lower(COALESCE(account_id, '')) LIKE ?
            OR lower(contract_reference) LIKE ?
         ORDER BY updated_at DESC
         LIMIT ?`
      )
      .bind(pattern, pattern, pattern, pattern, limit)
      .all<AgencyContractStateRow>();
    return result.results ?? [];
  }

  const result = await db
    .prepare('SELECT * FROM agency_contract_state ORDER BY updated_at DESC LIMIT ?')
    .bind(limit)
    .all<AgencyContractStateRow>();
  return result.results ?? [];
}

export async function listAgencyCommercialState(
  db: D1Database,
  options: { limit?: number; search?: string } = {}
): Promise<AgencyCommercialStateRow[]> {
  const limit = Math.max(1, Math.min(250, options.limit ?? 100));
  const search = options.search?.trim();
  if (search) {
    const pattern = `%${search.toLowerCase()}%`;
    const result = await db
      .prepare(
        `SELECT * FROM agency_commercial_accounts
         WHERE lower(COALESCE(normalized_email, '')) LIKE ?
            OR lower(COALESCE(stripe_customer_id, '')) LIKE ?
            OR lower(COALESCE(stripe_subscription_id, '')) LIKE ?
            OR lower(COALESCE(product_id, '')) LIKE ?
         ORDER BY updated_at DESC
         LIMIT ?`
      )
      .bind(pattern, pattern, pattern, pattern, limit)
      .all<AgencyCommercialStateRow>();
    return (result.results ?? []).map((row) => ({
      ...row,
      service_tier: normalizeAgencyServiceTier(row.service_tier)
    }));
  }

  const result = await db
    .prepare('SELECT * FROM agency_commercial_accounts ORDER BY updated_at DESC LIMIT ?')
    .bind(limit)
    .all<AgencyCommercialStateRow>();
  return (result.results ?? []).map((row) => ({
    ...row,
    service_tier: normalizeAgencyServiceTier(row.service_tier)
  }));
}

export async function listAgencyIdentitySeeds(
  db: D1Database,
  options: { limit?: number; search?: string } = {}
): Promise<AgencyIdentitySeedRow[]> {
  const limit = Math.max(1, Math.min(250, options.limit ?? 100));
  const search = options.search?.trim().toLowerCase();

  try {
    if (search) {
      const pattern = `%${search}%`;
      const result = await db
        .prepare(
          `SELECT * FROM agency_identity_seeds
         WHERE normalized_email LIKE ?
            OR account_id LIKE ?
            OR tenant_id LIKE ?
            OR COALESCE(auth_subject, '') LIKE ?
         ORDER BY updated_at DESC
         LIMIT ?`
        )
        .bind(pattern, pattern, pattern, pattern, limit)
        .all<AgencyIdentitySeedRow>();
      return (result.results ?? []).map((row) => ({
        ...row,
        service_tier: normalizeAgencyServiceTier(row.service_tier)
      }));
    }

    const result = await db
      .prepare(
        `SELECT * FROM agency_identity_seeds
         ORDER BY updated_at DESC
         LIMIT ?`
      )
      .bind(limit)
      .all<AgencyIdentitySeedRow>();
    return (result.results ?? []).map((row) => ({
      ...row,
      service_tier: normalizeAgencyServiceTier(row.service_tier)
    }));
  } catch (error) {
    if (isMissingD1TableError(error, 'agency_identity_seeds')) {
      return [];
    }
    throw error;
  }
}

export async function upsertAgencyIdentitySeed(
  db: D1Database,
  input: AgencyIdentitySeedUpsertInput
): Promise<AgencyIdentitySeedRow | null> {
  const normalizedEmail = normalizeEmail(input.authEmail);
  if (!normalizedEmail) {
    return null;
  }

  try {
    await db
      .prepare(
        `INSERT INTO agency_identity_seeds (
         normalized_email, auth_subject, account_id, tenant_id, workspace_account_id, service_tier,
         managed_bearer_allowed, org_membership_active, service_entitled, policy_accepted,
         contract_active, billing_active, status, invited_at, bound_at, metadata_json
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(normalized_email) DO UPDATE SET
         auth_subject = COALESCE(excluded.auth_subject, agency_identity_seeds.auth_subject),
         account_id = excluded.account_id,
         tenant_id = excluded.tenant_id,
         workspace_account_id = excluded.workspace_account_id,
         service_tier = excluded.service_tier,
         managed_bearer_allowed = excluded.managed_bearer_allowed,
         org_membership_active = excluded.org_membership_active,
         service_entitled = excluded.service_entitled,
         policy_accepted = excluded.policy_accepted,
         contract_active = excluded.contract_active,
         billing_active = excluded.billing_active,
         status = excluded.status,
         invited_at = COALESCE(excluded.invited_at, agency_identity_seeds.invited_at),
         bound_at = COALESCE(excluded.bound_at, agency_identity_seeds.bound_at),
         metadata_json = excluded.metadata_json,
         updated_at = datetime('now')`
      )
      .bind(
        normalizedEmail,
        input.authSubject ?? null,
        input.accountId,
        input.tenantId,
        input.workspaceAccountId ?? input.accountId,
        normalizeAgencyServiceTier(input.serviceTier),
        input.managedBearerAllowed === false ? 0 : 1,
        input.orgMembershipActive === false ? 0 : 1,
        input.serviceEntitled === false ? 0 : 1,
        input.policyAccepted === true ? 1 : 0,
        input.contractActive === false ? 0 : 1,
        input.billingActive === false ? 0 : 1,
        input.status ?? 'seeded',
        input.invitedAt ?? null,
        input.boundAt ?? null,
        JSON.stringify(input.metadata ?? {})
      )
      .run();

    return await db
      .prepare(
        `SELECT * FROM agency_identity_seeds
       WHERE normalized_email = ?
       LIMIT 1`
      )
      .bind(normalizedEmail)
      .first<AgencyIdentitySeedRow>();
  } catch (error) {
    if (isMissingD1TableError(error, 'agency_identity_seeds')) {
      return null;
    }
    throw error;
  }
}

export async function upsertAgencyContractState(
  db: D1Database,
  input: {
    authSubject?: string | null;
    authEmail?: string | null;
    accountId?: string | null;
    tenantId?: string | null;
    contractReference: string;
    contractStatus: AgencyContractStateRow['contract_status'];
    contractActive: boolean;
    serviceEntitled: boolean;
    policyAccepted: boolean;
    effectiveAt?: string | null;
    expiresAt?: string | null;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  const normalizedEmail = normalizeEmail(input.authEmail);
  await db
    .prepare(
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
    )
    .bind(
      `contract_${crypto.randomUUID().replace(/-/g, '')}`,
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
    )
    .run();
}

export async function updateAgencyMcpEntitlement(
  db: D1Database,
  input: AgencyMcpEntitlementUpdateInput
): Promise<AgencyMcpEntitlementRow | null> {
  const existing = await findAgencyMcpEntitlementByAuthSubject(db, input.authSubject);
  if (!existing) {
    return null;
  }

  const mergedMetadata = {
    ...safeParseMetadata(existing.metadata_json),
    ...(input.metadata ?? {}),
    manual_override: true,
    authority_source: 'manual_override'
  };

  await db
    .prepare(
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
    )
    .bind(
      input.authEmail ?? existing.auth_email,
      input.accountId ?? existing.account_id,
      input.tenantId ?? existing.tenant_id,
      input.workspaceAccountId ?? existing.workspace_account_id,
      normalizeAgencyServiceTier(input.serviceTier ?? existing.service_tier),
      booleanToInt(input.managedBearerAllowed, existing.managed_bearer_allowed),
      booleanToInt(input.orgMembershipActive, existing.org_membership_active),
      booleanToInt(input.serviceEntitled, existing.service_entitled),
      booleanToInt(input.policyAccepted, existing.policy_accepted),
      booleanToInt(input.contractActive, existing.contract_active),
      booleanToInt(input.billingActive, existing.billing_active),
      input.denialReason === undefined ? existing.denial_reason : input.denialReason,
      JSON.stringify(mergedMetadata),
      input.authSubject
    )
    .run();

  return findAgencyMcpEntitlementByAuthSubject(db, input.authSubject);
}

export async function recordAgencyMcpPolicyAcceptance(
  db: D1Database,
  input: {
    authSubject: string;
    metadata: Record<string, unknown>;
  }
): Promise<AgencyMcpEntitlementRow | null> {
  const existing = await findAgencyMcpEntitlementByAuthSubject(db, input.authSubject);
  if (!existing) {
    return null;
  }

  const mergedMetadata = {
    ...safeParseMetadata(existing.metadata_json),
    ...input.metadata,
    manual_override: false
  };
  const denialReason = deriveEntitlementDenialReason({
    contractActive: existing.contract_active === 1,
    billingActive: existing.billing_active === 1,
    serviceEntitled: existing.service_entitled === 1,
    policyAccepted: true,
    statusReason: null
  });

  await db
    .prepare(
      `UPDATE agency_mcp_entitlements
		 SET policy_accepted = ?,
		     metadata_json = ?,
		     denial_reason = ?,
		     updated_at = datetime('now')
		 WHERE auth_subject = ?`
    )
    .bind(1, JSON.stringify(mergedMetadata), denialReason, input.authSubject)
    .run();

  return findAgencyMcpEntitlementByAuthSubject(db, input.authSubject);
}

export async function reconcileAgencyMcpEntitlement(
  db: D1Database,
  input: {
    authSubject: string;
    authEmail?: string | null;
    accountId?: string | null;
    tenantId?: string | null;
    workspaceAccountId?: string | null;
    serviceTier?: string | null;
    metadata?: Record<string, unknown>;
  }
): Promise<AgencyMcpEntitlementRow | null> {
  const existing = await findAgencyMcpEntitlementByAuthSubject(db, input.authSubject);
  const existingMetadata = existing ? safeParseMetadata(existing.metadata_json) : {};
  if (
    existingMetadata.manual_override === true &&
    existingMetadata.authority_source === 'manual_override' &&
    existing
  ) {
    return existing;
  }

  const seed = await findAgencyIdentitySeedByEmail(
    db,
    input.authEmail ?? existing?.auth_email ?? null
  );
  const dashboardPolicyAccepted =
    existing?.policy_accepted === 1 &&
    existingMetadata.policy_accepted_via === 'agency_dashboard' &&
    typeof existingMetadata.policy_accepted_at === 'string';
  if (seed) {
    await upsertAgencyMcpEntitlement(db, {
      authSubject: input.authSubject,
      authEmail: input.authEmail ?? existing?.auth_email ?? seed.normalized_email,
      accountId: seed.account_id,
      tenantId: seed.tenant_id,
      workspaceAccountId: seed.workspace_account_id ?? seed.account_id,
      serviceTier: seed.service_tier,
      metadata: {
        ...safeParseMetadata(seed.metadata_json),
        manual_override: false,
        source: 'identity_seed',
        seed_status: seed.status,
        seed_invited_at: seed.invited_at
      }
    });

    await db
      .prepare(
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
      )
      .bind(
        seed.managed_bearer_allowed,
        seed.org_membership_active,
        seed.service_entitled,
        seed.policy_accepted === 1 || dashboardPolicyAccepted ? 1 : 0,
        seed.contract_active,
        seed.billing_active,
        deriveEntitlementDenialReason({
          contractActive: seed.contract_active === 1,
          billingActive: seed.billing_active === 1,
          serviceEntitled: seed.service_entitled === 1,
          policyAccepted: seed.policy_accepted === 1 || dashboardPolicyAccepted,
          statusReason: null
        }),
        input.authSubject
      )
      .run();

    await bindAgencyIdentitySeed(db, seed.normalized_email, input.authSubject);
    return findAgencyMcpEntitlementByAuthSubject(db, input.authSubject);
  }

  let source: AgencyPartnerEntitlementSource | null = null;
  let partnerAuthorityUnavailable = false;
  try {
    source = await findAgencyPartnerEntitlementSource(
      db,
      input.authSubject,
      input.authEmail ?? existing?.auth_email ?? null
    );
  } catch (error) {
    if (!isPartnerAuthorityTableUnavailable(error)) {
      throw error;
    }
    partnerAuthorityUnavailable = true;
    console.warn('Partner entitlement authority tables are unavailable; failing closed');
  }
  const contract = await findAgencyContractState(
    db,
    input.authSubject,
    input.authEmail ?? existing?.auth_email ?? null,
    input.accountId ?? existing?.account_id ?? null,
    input.tenantId ?? existing?.tenant_id ?? null
  );
  const commercial = await findAgencyCommercialStateByEmail(
    db,
    input.authEmail ?? existing?.auth_email ?? null
  );
  if (partnerAuthorityUnavailable && !existing) {
    const timestamp = new Date().toISOString();
    return {
      auth_subject: input.authSubject,
      auth_email: input.authEmail ?? null,
      account_id: input.accountId ?? null,
      tenant_id: input.tenantId ?? null,
      workspace_account_id: input.workspaceAccountId ?? input.accountId ?? null,
      service_tier: normalizeAgencyServiceTier(input.serviceTier),
      managed_bearer_allowed: 0,
      org_membership_active: 0,
      service_entitled: 0,
      policy_accepted: 0,
      contract_active: 0,
      billing_active: 0,
      denial_reason: 'entitlement_source_unavailable',
      metadata_json: JSON.stringify({
        ...input.metadata,
        source: 'authority_missing',
        manual_override: false
      }),
      created_at: timestamp,
      updated_at: timestamp
    };
  }
  if (!source) {
    if ((partnerAuthorityUnavailable || (!contract && !commercial)) && existing) {
      const metadata = mergeMetadata(existingMetadata, input.metadata, {
        source: 'authority_missing',
        manual_override: false
      });
      await db
        .prepare(
          `UPDATE agency_mcp_entitlements
           SET managed_bearer_allowed = 0,
               org_membership_active = 0,
               service_entitled = 0,
               policy_accepted = 0,
               contract_active = 0,
               billing_active = 0,
               denial_reason = 'entitlement_source_unavailable',
               metadata_json = ?,
               updated_at = datetime('now')
           WHERE auth_subject = ?`
        )
        .bind(JSON.stringify(metadata), input.authSubject)
        .run();
      return findAgencyMcpEntitlementByAuthSubject(db, input.authSubject);
    }

    const contractActive = contract
      ? contract.contract_active === 1
      : commercial
        ? commercial.contract_active === 1
        : false;
    const billingActive = commercial ? commercial.billing_active === 1 : false;
    const serviceEntitled = contract ? contract.service_entitled === 1 : false;
    const policyAccepted =
      (contract ? contract.policy_accepted === 1 : false) || dashboardPolicyAccepted;
    const commerciallyAllowed = contractActive && billingActive;

    if (existing) {
      const metadata = mergeMetadata(existingMetadata, input.metadata, {
        source: commercial ? 'stripe_commercial_state' : 'session_bootstrap',
        manual_override: false,
        contract_reference: contract?.contract_reference ?? null,
        contract_status: contract?.contract_status ?? null,
        stripe_customer_id: commercial?.stripe_customer_id ?? null,
        stripe_subscription_id: commercial?.stripe_subscription_id ?? null,
        subscription_status: commercial?.subscription_status ?? null,
        product_id: commercial?.product_id ?? null
      });
      await db
        .prepare(
          `UPDATE agency_mcp_entitlements
           SET auth_email = ?,
               account_id = COALESCE(?, account_id),
               tenant_id = COALESCE(?, tenant_id),
               workspace_account_id = COALESCE(?, workspace_account_id),
               service_tier = COALESCE(?, service_tier),
               metadata_json = ?,
               managed_bearer_allowed = ?,
               org_membership_active = ?,
               contract_active = ?,
               billing_active = ?,
               service_entitled = ?,
               policy_accepted = ?,
               denial_reason = ?,
               updated_at = datetime('now')
           WHERE auth_subject = ?`
        )
        .bind(
          input.authEmail ?? existing.auth_email,
          input.accountId ?? existing.account_id,
          input.tenantId ?? existing.tenant_id,
          input.workspaceAccountId ?? existing.workspace_account_id,
          normalizeAgencyServiceTier(input.serviceTier ?? existing.service_tier),
          JSON.stringify(metadata),
          commerciallyAllowed && serviceEntitled && policyAccepted ? 1 : 0,
          commerciallyAllowed && serviceEntitled ? 1 : 0,
          contractActive ? 1 : 0,
          billingActive ? 1 : 0,
          serviceEntitled ? 1 : 0,
          policyAccepted ? 1 : 0,
          deriveEntitlementDenialReason({
            contractActive,
            billingActive,
            serviceEntitled,
            policyAccepted,
            statusReason: null
          }),
          input.authSubject
        )
        .run();
      return findAgencyMcpEntitlementByAuthSubject(db, input.authSubject);
    }

    return upsertAgencyMcpEntitlement(db, {
      authSubject: input.authSubject,
      authEmail: input.authEmail ?? null,
      accountId: input.accountId ?? null,
      tenantId: input.tenantId ?? null,
      workspaceAccountId: input.workspaceAccountId ?? input.accountId ?? null,
      serviceTier: normalizeAgencyServiceTier(input.serviceTier),
      metadata: {
        ...input.metadata,
        source: commercial ? 'stripe_commercial_state' : 'session_bootstrap',
        manual_override: false,
        contract_reference: contract?.contract_reference ?? null,
        contract_status: contract?.contract_status ?? null,
        stripe_customer_id: commercial?.stripe_customer_id ?? null,
        stripe_subscription_id: commercial?.stripe_subscription_id ?? null,
        subscription_status: commercial?.subscription_status ?? null,
        product_id: commercial?.product_id ?? null
      }
    }).then(async () => {
      await db
        .prepare(
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
        )
        .bind(
          commerciallyAllowed && serviceEntitled && policyAccepted ? 1 : 0,
          commerciallyAllowed && serviceEntitled ? 1 : 0,
          serviceEntitled ? 1 : 0,
          policyAccepted ? 1 : 0,
          contractActive ? 1 : 0,
          billingActive ? 1 : 0,
          deriveEntitlementDenialReason({
            contractActive,
            billingActive,
            serviceEntitled,
            policyAccepted,
            statusReason: null
          }),
          input.authSubject
        )
        .run();
      return findAgencyMcpEntitlementByAuthSubject(db, input.authSubject);
    });
  }

  const hasAccess = source.status === 'active';
  const policyAccepted =
    (contract ? contract.policy_accepted === 1 : Boolean(source.active_consent_id)) ||
    dashboardPolicyAccepted;
  const contractActive = contract
    ? contract.contract_active === 1
    : commercial
      ? commercial.contract_active === 1
      : hasAccess;
  const billingActive = commercial ? commercial.billing_active === 1 : hasAccess;
  const serviceEntitled = contract ? contract.service_entitled === 1 : hasAccess;
  const statusReason = derivePartnerDenialReason(source.status, policyAccepted);
  const denialReason = deriveEntitlementDenialReason({
    contractActive,
    billingActive,
    serviceEntitled,
    policyAccepted,
    statusReason
  });
  const laneMetadata = source.lane_metadata_json
    ? safeParseMetadata(source.lane_metadata_json)
    : {};
  const metadata = mergeMetadata(
    existingMetadata,
    laneMetadata,
    input.metadata,
    {
      manual_override: false,
      source: commercial ? 'partner_auth_client+stripe' : 'partner_auth_client',
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
    },
    source.lane_id
      ? {
          partner_access_lane_id: source.lane_id,
          partner_access_lane_slug: source.lane_slug,
          partner_access_lane_display_name: source.lane_display_name,
          partner_access_lane_url: source.lane_hub_url,
          partner_access_lane_host_key: source.lane_host_key
        }
      : undefined
  );

  return upsertAgencyMcpEntitlement(db, {
    authSubject: input.authSubject,
    authEmail: input.authEmail ?? source.owner_email,
    accountId:
      source.identity_account_id ??
      input.accountId ??
      existing?.account_id ??
      source.workspace_account_id,
    tenantId: source.identity_tenant_id ?? input.tenantId ?? existing?.tenant_id ?? source.slug,
    workspaceAccountId: source.workspace_account_id,
    serviceTier: normalizeAgencyServiceTier(input.serviceTier),
    metadata
  }).then(async (row) => {
    await db
      .prepare(
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
      )
      .bind(
        hasAccess && contractActive && billingActive && serviceEntitled && policyAccepted ? 1 : 0,
        hasAccess ? 1 : 0,
        serviceEntitled ? 1 : 0,
        policyAccepted ? 1 : 0,
        contractActive ? 1 : 0,
        billingActive ? 1 : 0,
        denialReason,
        input.authSubject
      )
      .run();

    return findAgencyMcpEntitlementByAuthSubject(db, input.authSubject);
  });
}

export function evaluateAgencyMcpEntitlement(
  row: AgencyMcpEntitlementRow | null,
  expected: {
    accountId?: string | null;
    tenantId?: string | null;
  } = {}
): AgencyMcpEntitlementDecision {
  if (!row) {
    return {
      allowed: false,
      reason: 'missing_entitlement_record',
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
    return {
      allowed: false,
      reason: row.denial_reason ?? 'managed_bearer_disabled',
      account_id: row.account_id,
      tenant_id: row.tenant_id,
      checks
    };
  }
  if (!checks.org_membership_active) {
    return {
      allowed: false,
      reason: row.denial_reason ?? 'org_membership_inactive',
      account_id: row.account_id,
      tenant_id: row.tenant_id,
      checks
    };
  }
  if (!checks.service_entitled) {
    return {
      allowed: false,
      reason: row.denial_reason ?? 'service_not_entitled',
      account_id: row.account_id,
      tenant_id: row.tenant_id,
      checks
    };
  }
  if (!checks.policy_accepted) {
    return {
      allowed: false,
      reason: row.denial_reason ?? 'policy_acceptance_required',
      account_id: row.account_id,
      tenant_id: row.tenant_id,
      checks
    };
  }
  if (!checks.contract_active) {
    return {
      allowed: false,
      reason: row.denial_reason ?? 'contract_inactive',
      account_id: row.account_id,
      tenant_id: row.tenant_id,
      checks
    };
  }
  if (!checks.billing_active) {
    return {
      allowed: false,
      reason: row.denial_reason ?? 'billing_inactive',
      account_id: row.account_id,
      tenant_id: row.tenant_id,
      checks
    };
  }
  if (expected.accountId && row.account_id && row.account_id !== expected.accountId) {
    return {
      allowed: false,
      reason: 'account_mismatch',
      account_id: row.account_id,
      tenant_id: row.tenant_id,
      checks
    };
  }
  if (expected.tenantId && row.tenant_id && row.tenant_id !== expected.tenantId) {
    return {
      allowed: false,
      reason: 'tenant_mismatch',
      account_id: row.account_id,
      tenant_id: row.tenant_id,
      checks
    };
  }

  return {
    allowed: true,
    reason: 'allowed',
    account_id: row.account_id,
    tenant_id: row.tenant_id,
    checks
  };
}

function safeParseMetadata(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // ignore malformed metadata and replace it on next write
  }
  return {};
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function mergeMetadata(
  ...values: Array<Record<string, unknown> | null | undefined>
): Record<string, unknown> {
  return values.reduce<Record<string, unknown>>((acc, value) => {
    if (!value) return acc;
    return { ...acc, ...value };
  }, {});
}

function booleanToInt(input: boolean | undefined, fallback: number): number {
  return input === undefined ? fallback : input ? 1 : 0;
}

async function findAgencyPartnerEntitlementSource(
  db: D1Database,
  authSubject: string,
  authEmail: string | null
): Promise<AgencyPartnerEntitlementSource | null> {
  const normalizedEmail = authEmail?.trim().toLowerCase() ?? null;
  const laneQuery = `SELECT
      c.id AS partner_client_id,
      c.partner_key,
      c.slug,
      c.status,
      c.workspace_account_id,
      c.identity_account_id,
      c.identity_user_id,
      c.identity_tenant_id,
      c.owner_email,
      consent.id AS active_consent_id,
      lane.id AS lane_id,
      lane.slug AS lane_slug,
      lane.display_name AS lane_display_name,
      lane.hub_url AS lane_hub_url,
      lane.host_key AS lane_host_key,
      lane.metadata_json AS lane_metadata_json
     FROM partner_auth_access_lanes lane
     INNER JOIN partner_auth_clients c
       ON c.id = lane.partner_client_id
     LEFT JOIN partner_auth_consents consent
       ON consent.partner_client_id = c.id
      AND consent.revoked_at IS NULL
      AND (consent.expires_at IS NULL OR consent.expires_at > datetime('now'))
     WHERE (
         (? IS NOT NULL AND lane.identity_user_id = ?)
         OR (? IS NOT NULL AND lower(COALESCE(lane.owner_email, '')) = ?)
       )
     ORDER BY
       CASE lane.status
         WHEN 'active' THEN 0
         WHEN 'paused' THEN 1
         WHEN 'initialized' THEN 2
         WHEN 'sunset' THEN 3
         ELSE 4
       END,
       lane.updated_at DESC
     LIMIT 1`;

  const laneRow = await db
    .prepare(laneQuery)
    .bind(authSubject, authSubject, normalizedEmail, normalizedEmail)
    .first<AgencyPartnerEntitlementSource>();
  if (laneRow) {
    return laneRow;
  }

  if (normalizedEmail) {
    const row = await db
      .prepare(
        `SELECT c.id AS partner_client_id, c.partner_key, c.slug, c.status, c.workspace_account_id,
                c.identity_account_id, c.identity_user_id, c.identity_tenant_id, c.owner_email,
                consent.id AS active_consent_id,
                NULL AS lane_id,
                NULL AS lane_slug,
                NULL AS lane_display_name,
                NULL AS lane_hub_url,
                NULL AS lane_host_key,
                NULL AS lane_metadata_json
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
      )
      .bind(authSubject, normalizedEmail, authSubject)
      .first<AgencyPartnerEntitlementSource>();
    return row;
  }

  return db
    .prepare(
      `SELECT c.id AS partner_client_id, c.partner_key, c.slug, c.status, c.workspace_account_id,
              c.identity_account_id, c.identity_user_id, c.identity_tenant_id, c.owner_email,
              consent.id AS active_consent_id,
              NULL AS lane_id,
              NULL AS lane_slug,
              NULL AS lane_display_name,
              NULL AS lane_hub_url,
              NULL AS lane_host_key,
              NULL AS lane_metadata_json
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
    )
    .bind(authSubject)
    .first<AgencyPartnerEntitlementSource>();
}

function derivePartnerDenialReason(
  status: AgencyPartnerEntitlementSource['status'],
  policyAccepted: boolean
): string | null {
  switch (status) {
    case 'active':
      return null;
    case 'paused':
      return 'client_paused';
    case 'initialized':
      return 'client_not_activated';
    case 'sunset':
      return 'client_sunset';
    case 'disabled':
      return 'client_disabled';
    default:
      return 'client_ineligible';
  }
}

async function findAgencyCommercialStateByEmail(
  db: D1Database,
  authEmail: string | null
): Promise<AgencyCommercialStateRow | null> {
  const normalizedEmail = authEmail?.trim().toLowerCase() ?? null;
  if (!normalizedEmail) {
    return null;
  }

  try {
    return await db
      .prepare(
        `SELECT * FROM agency_commercial_accounts
       WHERE normalized_email = ?
       ORDER BY
         billing_active DESC,
         contract_active DESC,
         updated_at DESC
       LIMIT 1`
      )
      .bind(normalizedEmail)
      .first<AgencyCommercialStateRow>();
  } catch (error) {
    if (isMissingD1TableError(error, 'agency_commercial_accounts')) {
      console.warn(
        'agency_commercial_accounts table is unavailable; continuing without commercial state'
      );
      return null;
    }

    throw error;
  }
}

export async function findAgencyIdentitySeedByEmail(
  db: D1Database,
  authEmail: string | null
): Promise<AgencyIdentitySeedRow | null> {
  const normalizedEmail = normalizeEmail(authEmail);
  if (!normalizedEmail) {
    return null;
  }

  try {
    return await db
      .prepare(
        `SELECT * FROM agency_identity_seeds
       WHERE normalized_email = ?
       LIMIT 1`
      )
      .bind(normalizedEmail)
      .first<AgencyIdentitySeedRow>();
  } catch (error) {
    if (isMissingD1TableError(error, 'agency_identity_seeds')) {
      return null;
    }

    throw error;
  }
}

async function bindAgencyIdentitySeed(
  db: D1Database,
  normalizedEmail: string,
  authSubject: string
): Promise<void> {
  try {
    await db
      .prepare(
        `UPDATE agency_identity_seeds
       SET auth_subject = ?,
           status = 'bound',
           bound_at = COALESCE(bound_at, datetime('now')),
           updated_at = datetime('now')
       WHERE normalized_email = ?`
      )
      .bind(authSubject, normalizedEmail)
      .run();
  } catch (error) {
    if (isMissingD1TableError(error, 'agency_identity_seeds')) {
      return;
    }

    throw error;
  }
}

async function findAgencyContractState(
  db: D1Database,
  authSubject: string,
  authEmail: string | null,
  accountId: string | null,
  tenantId: string | null
): Promise<AgencyContractStateRow | null> {
  const normalizedEmail = normalizeEmail(authEmail);
  try {
    const result = await db
      .prepare(
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
      )
      .bind(authSubject, normalizedEmail, normalizedEmail, accountId, accountId, tenantId, tenantId)
      .first<AgencyContractStateRow>();
    return result;
  } catch (error) {
    if (isMissingD1TableError(error, 'agency_contract_state')) {
      console.warn('agency_contract_state table is unavailable; continuing without contract state');
      return null;
    }

    throw error;
  }
}

function isMissingD1TableError(error: unknown, tableName: string): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.message.includes('D1_ERROR') && error.message.includes(`no such table: ${tableName}`)
  );
}

function isPartnerAuthorityTableUnavailable(error: unknown): boolean {
  return ['partner_auth_access_lanes', 'partner_auth_clients', 'partner_auth_consents'].some(
    (tableName) => isMissingD1TableError(error, tableName)
  );
}

function deriveEntitlementDenialReason(input: {
  contractActive: boolean;
  billingActive: boolean;
  serviceEntitled: boolean;
  policyAccepted: boolean;
  statusReason: string | null;
}): string | null {
  if (input.statusReason) {
    return input.statusReason;
  }
  if (!input.policyAccepted) {
    return 'policy_acceptance_required';
  }
  if (!input.serviceEntitled) {
    return 'service_not_entitled';
  }
  if (!input.contractActive) {
    return 'contract_inactive';
  }
  if (!input.billingActive) {
    return 'billing_inactive';
  }
  return null;
}

function normalizeEmail(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const value = raw.trim().toLowerCase();
  return value.length > 0 ? value : null;
}

export function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
}
