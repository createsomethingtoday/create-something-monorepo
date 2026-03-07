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
}

function toFlag(value: number | null | undefined): boolean {
	return value === 1;
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
			input.serviceTier ?? 'agency',
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
		return result.results ?? [];
	}

	const result = await db
		.prepare(
			`SELECT * FROM agency_mcp_entitlements
       ORDER BY updated_at DESC
       LIMIT ?`
		)
		.bind(limit)
		.all<AgencyMcpEntitlementRow>();
	return result.results ?? [];
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
			input.serviceTier ?? existing.service_tier,
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

export async function reconcileAgencyMcpEntitlement(
	db: D1Database,
	input: {
		authSubject: string;
		authEmail?: string | null;
		accountId?: string | null;
		tenantId?: string | null;
		workspaceAccountId?: string | null;
		serviceTier?: string | null;
	}
): Promise<AgencyMcpEntitlementRow | null> {
	const existing = await findAgencyMcpEntitlementByAuthSubject(db, input.authSubject);
	const existingMetadata = existing ? safeParseMetadata(existing.metadata_json) : {};
	if (existingMetadata.manual_override === true && existing) {
		return existing;
	}

	const source = await findAgencyPartnerEntitlementSource(db, input.authSubject, input.authEmail ?? existing?.auth_email ?? null);
	if (!source) {
		if (existing) {
			return existing;
		}

		return upsertAgencyMcpEntitlement(db, {
			authSubject: input.authSubject,
			authEmail: input.authEmail ?? null,
			accountId: input.accountId ?? null,
			tenantId: input.tenantId ?? null,
			workspaceAccountId: input.workspaceAccountId ?? input.accountId ?? null,
			serviceTier: input.serviceTier ?? 'agency',
			metadata: {
				source: 'session_bootstrap',
				manual_override: false,
			},
		});
	}

	const hasAccess = source.status === 'active';
	const policyAccepted = Boolean(source.active_consent_id);
	const denialReason = derivePartnerDenialReason(source.status, policyAccepted);

	return upsertAgencyMcpEntitlement(db, {
		authSubject: input.authSubject,
		authEmail: input.authEmail ?? source.owner_email,
		accountId: source.identity_account_id ?? input.accountId ?? existing?.account_id ?? source.workspace_account_id,
		tenantId: source.identity_tenant_id ?? input.tenantId ?? existing?.tenant_id ?? source.slug,
		workspaceAccountId: source.workspace_account_id,
		serviceTier: input.serviceTier ?? 'agency',
		metadata: {
			manual_override: false,
			source: 'partner_auth_client',
			partner_client_id: source.partner_client_id,
			partner_key: source.partner_key,
			client_slug: source.slug,
			partner_status: source.status,
			active_consent_id: source.active_consent_id,
		},
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
				hasAccess ? 1 : 0,
				hasAccess ? 1 : 0,
				hasAccess ? 1 : 0,
				policyAccepted ? 1 : 0,
				hasAccess ? 1 : 0,
				hasAccess ? 1 : 0,
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
				billing_active: false,
			},
		};
	}

	const checks = {
		managed_bearer_allowed: toFlag(row.managed_bearer_allowed),
		org_membership_active: toFlag(row.org_membership_active),
		service_entitled: toFlag(row.service_entitled),
		policy_accepted: toFlag(row.policy_accepted),
		contract_active: toFlag(row.contract_active),
		billing_active: toFlag(row.billing_active),
	};

	if (!checks.managed_bearer_allowed) {
		return { allowed: false, reason: row.denial_reason ?? 'managed_bearer_disabled', account_id: row.account_id, tenant_id: row.tenant_id, checks };
	}
	if (!checks.org_membership_active) {
		return { allowed: false, reason: row.denial_reason ?? 'org_membership_inactive', account_id: row.account_id, tenant_id: row.tenant_id, checks };
	}
	if (!checks.service_entitled) {
		return { allowed: false, reason: row.denial_reason ?? 'service_not_entitled', account_id: row.account_id, tenant_id: row.tenant_id, checks };
	}
	if (!checks.policy_accepted) {
		return { allowed: false, reason: row.denial_reason ?? 'policy_acceptance_required', account_id: row.account_id, tenant_id: row.tenant_id, checks };
	}
	if (!checks.contract_active) {
		return { allowed: false, reason: row.denial_reason ?? 'contract_inactive', account_id: row.account_id, tenant_id: row.tenant_id, checks };
	}
	if (!checks.billing_active) {
		return { allowed: false, reason: row.denial_reason ?? 'billing_inactive', account_id: row.account_id, tenant_id: row.tenant_id, checks };
	}
	if (expected.accountId && row.account_id && row.account_id !== expected.accountId) {
		return { allowed: false, reason: 'account_mismatch', account_id: row.account_id, tenant_id: row.tenant_id, checks };
	}
	if (expected.tenantId && row.tenant_id && row.tenant_id !== expected.tenantId) {
		return { allowed: false, reason: 'tenant_mismatch', account_id: row.account_id, tenant_id: row.tenant_id, checks };
	}

	return {
		allowed: true,
		reason: 'allowed',
		account_id: row.account_id,
		tenant_id: row.tenant_id,
		checks,
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

function booleanToInt(input: boolean | undefined, fallback: number): number {
	return input === undefined ? fallback : input ? 1 : 0;
}

async function findAgencyPartnerEntitlementSource(
	db: D1Database,
	authSubject: string,
	authEmail: string | null
): Promise<AgencyPartnerEntitlementSource | null> {
	const normalizedEmail = authEmail?.trim().toLowerCase() ?? null;
	if (normalizedEmail) {
		const row = await db
			.prepare(
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
			)
			.bind(authSubject, normalizedEmail, authSubject)
			.first<AgencyPartnerEntitlementSource>();
		return row;
	}

	return db
		.prepare(
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
		)
		.bind(authSubject)
		.first<AgencyPartnerEntitlementSource>();
}

function derivePartnerDenialReason(
	status: AgencyPartnerEntitlementSource['status'],
	policyAccepted: boolean
): string | null {
	if (!policyAccepted) {
		return 'policy_acceptance_required';
	}
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

export function constantTimeEqual(left: string, right: string): boolean {
	if (left.length !== right.length) return false;
	let mismatch = 0;
	for (let index = 0; index < left.length; index += 1) {
		mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
	}
	return mismatch === 0;
}
