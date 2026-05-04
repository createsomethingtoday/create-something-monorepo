import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ensureAgencyMcpEntitlement, requireAgencySessionUser } from '$lib/server/mcp-token';
import { normalizeAgencyServiceTier, updateAgencyMcpEntitlement } from '$lib/server/mcp-entitlements';
import { resolveCanonicalAgencyIdentity } from '$lib/server/agency-identity';

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	try {
		const db = platform?.env?.DB;
		if (!db) {
			return json({ error: 'unavailable', message: 'Database is unavailable' }, { status: 503 });
		}

		const user = await requireAgencySessionUser({ locals, request, platform });
		const { row } = await ensureAgencyMcpEntitlement({ platform, user });
		const canonicalIdentity = resolveCanonicalAgencyIdentity(user, row);

		const updated = await updateAgencyMcpEntitlement(db, {
			authSubject: user.id,
			authEmail: user.email,
			accountId: canonicalIdentity.accountId,
			tenantId: canonicalIdentity.tenantId,
			workspaceAccountId: canonicalIdentity.workspaceAccountId,
			serviceTier: normalizeAgencyServiceTier(row.service_tier),
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
