import { updateAgencyMcpEntitlement, type AgencyMcpEntitlementRow } from '$lib/server/mcp-entitlements';

interface AgencyIdentityUser {
	id: string;
	email: string;
}

interface CanonicalAgencyIdentity {
	accountId: string;
	tenantId: string;
	workspaceAccountId: string;
}

const EMAIL_OVERRIDES: Record<string, { accountId: string; tenantId: string }> = {
	'micah@createsomething.io': {
		accountId: 'acct_mj',
		tenantId: 'tenant_createsomething_io',
	},
	'dm@halfdozen.co': {
		accountId: 'acct_danny',
		tenantId: 'tenant_halfdozen_co',
	},
	'danny@halfdozen.co': {
		accountId: 'acct_danny',
		tenantId: 'tenant_halfdozen_co',
	},
	'leah@halfdozen.co': {
		accountId: 'acct_leah',
		tenantId: 'tenant_halfdozen_co',
	},
	'fillip@halfdozen.co': {
		accountId: 'acct_fillip',
		tenantId: 'tenant_halfdozen_co',
	},
	'august@halfdozen.co': {
		accountId: 'acct_august',
		tenantId: 'tenant_halfdozen_co',
	},
	'lainy@halfdozen.co': {
		accountId: 'acct_lainy',
		tenantId: 'tenant_halfdozen_co',
	},
};

function normalizeIdentifier(value: string): string {
	return value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '')
		.slice(0, 48);
}

export function resolveCanonicalAgencyIdentity(
	user: AgencyIdentityUser,
	existing: Pick<AgencyMcpEntitlementRow, 'account_id' | 'tenant_id' | 'workspace_account_id'> | null = null,
): CanonicalAgencyIdentity {
	const normalizedEmail = user.email.trim().toLowerCase();
	const override = EMAIL_OVERRIDES[normalizedEmail];
	if (override) {
		return {
			accountId: override.accountId,
			tenantId: override.tenantId,
			workspaceAccountId: existing?.workspace_account_id ?? override.accountId,
		};
	}

	const emailPart = normalizeIdentifier(user.email.split('@')[0] ?? '');
	const emailDomain = normalizeIdentifier(user.email.split('@')[1] ?? '');
	const subjectPart = normalizeIdentifier(user.id);

	return {
		accountId: existing?.account_id ?? `acct_${emailPart || subjectPart.slice(-16) || 'agency_user'}`,
		tenantId: existing?.tenant_id ?? `tenant_${emailDomain || subjectPart.slice(-12) || 'agency'}`,
		workspaceAccountId:
			existing?.workspace_account_id ??
			existing?.account_id ??
			`acct_${emailPart || subjectPart.slice(-16) || 'agency_user'}`,
	};
}

export async function canonicalizeAgencyEntitlementIdentity(
	db: D1Database,
	user: AgencyIdentityUser,
	row: AgencyMcpEntitlementRow,
): Promise<AgencyMcpEntitlementRow> {
	const canonical = resolveCanonicalAgencyIdentity(user, row);
	if (
		row.account_id === canonical.accountId &&
		row.tenant_id === canonical.tenantId &&
		(row.workspace_account_id ?? canonical.workspaceAccountId) === canonical.workspaceAccountId
	) {
		return row;
	}

	const updated = await updateAgencyMcpEntitlement(db, {
		authSubject: user.id,
		authEmail: user.email,
		accountId: canonical.accountId,
		tenantId: canonical.tenantId,
		workspaceAccountId: canonical.workspaceAccountId,
		serviceTier: row.service_tier,
		metadata: {
			canonical_identity_applied: true,
			canonical_identity_source: 'agency_identity_overrides',
		},
	});

	return updated ?? row;
}
