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

export function constantTimeEqual(left: string, right: string): boolean {
	if (left.length !== right.length) return false;
	let mismatch = 0;
	for (let index = 0; index < left.length; index += 1) {
		mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
	}
	return mismatch === 0;
}
