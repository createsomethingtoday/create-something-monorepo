import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ensureAgencyMcpEntitlement, requireAgencySessionUser } from '$lib/server/mcp-token';
import { updateAgencyMcpEntitlement } from '$lib/server/mcp-entitlements';

function normalizeIdentifier(value: string): string {
	return value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '')
		.slice(0, 48);
}

function deriveAccountId(user: { id: string; email: string }, existing: string | null): string {
	if (existing) return existing;
	const emailPart = normalizeIdentifier(user.email.split('@')[0] ?? '');
	const subjectPart = normalizeIdentifier(user.id).slice(-16);
	return `acct_${emailPart || subjectPart || 'agency_user'}`;
}

function deriveTenantId(user: { id: string; email: string }, existing: string | null): string {
	if (existing) return existing;
	const emailDomain = normalizeIdentifier(user.email.split('@')[1] ?? '');
	const subjectPart = normalizeIdentifier(user.id).slice(-12);
	return `tenant_${emailDomain || subjectPart || 'agency'}`;
}

export const POST: RequestHandler = async ({ cookies, platform }) => {
	try {
		const db = platform?.env?.DB;
		if (!db) {
			return json({ error: 'unavailable', message: 'Database is unavailable' }, { status: 503 });
		}

		const user = await requireAgencySessionUser({ cookies, platform });
		const { row } = await ensureAgencyMcpEntitlement({ platform, user });

		const accountId = deriveAccountId(user, row.account_id);
		const tenantId = deriveTenantId(user, row.tenant_id);

		const updated = await updateAgencyMcpEntitlement(db, {
			authSubject: user.id,
			authEmail: user.email,
			accountId,
			tenantId,
			workspaceAccountId: row.workspace_account_id ?? accountId,
			serviceTier: 'agency',
			managedBearerAllowed: true,
			orgMembershipActive: true,
			serviceEntitled: true,
			policyAccepted: true,
			contractActive: true,
			billingActive: true,
			denialReason: null,
			metadata: {
				policy_accepted_at: new Date().toISOString(),
				policy_accepted_via: 'agency_dashboard',
				self_provisioned: true,
			},
		});

		if (!updated) {
			return json({ error: 'not_found', message: 'Entitlement record not found' }, { status: 404 });
		}

		return json({
			success: true,
			message: 'Policy accepted. Provisioning is now initialized for this account.',
			entitlement: updated,
		});
	} catch (error) {
		return json(
			{ error: 'internal_error', message: error instanceof Error ? error.message : 'Unexpected error' },
			{ status: 500 },
		);
	}
};
