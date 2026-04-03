import { isHttpError, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ensureAgencyMcpEntitlement, requireAgencySessionUser } from '$lib/server/mcp-token';

export const GET: RequestHandler = async ({ cookies, platform }) => {
	try {
		const env = platform?.env;
		if (!env) {
			return json({ error: 'unavailable', message: 'Platform env is unavailable' }, { status: 503 });
		}

		const user = await requireAgencySessionUser({ cookies, platform });
		const { row, decision, snapshot } = await ensureAgencyMcpEntitlement({ platform, user });

		return json({
			user: {
				id: user.id,
				email: user.email,
				tier: user.tier ?? 'free',
				source: user.source ?? 'auth0'
			},
			decision: {
				allowed: decision.allowed,
				reason: decision.reason,
				accountId: decision.account_id,
				tenantId: decision.tenant_id,
				checks: {
					managedBearerAllowed: decision.checks.managed_bearer_allowed,
					orgMembershipActive: decision.checks.org_membership_active,
					serviceEntitled: decision.checks.service_entitled,
					policyAccepted: decision.checks.policy_accepted,
					contractActive: decision.checks.contract_active,
					billingActive: decision.checks.billing_active
				}
			},
			snapshot: {
				serviceTier: snapshot.service_tier,
				managedBearerAllowed: snapshot.managed_bearer_allowed,
				orgMembershipActive: snapshot.org_membership_active,
				serviceEntitled: snapshot.service_entitled,
				policyAccepted: snapshot.policy_accepted,
				contractActive: snapshot.contract_active,
				billingActive: snapshot.billing_active,
				approvedException: {
					present: snapshot.approved_exception.present,
					type: snapshot.approved_exception.type,
					allowedScope: snapshot.approved_exception.allowed_scope,
					graduationTarget: snapshot.approved_exception.graduation_target,
					reviewBy: snapshot.approved_exception.review_by
				}
			},
			updatedAt: row.updated_at,
			accountId: row.account_id,
			tenantId: row.tenant_id
		});
	} catch (error) {
		if (isHttpError(error)) {
			const code = error.status === 401 ? 'unauthorized' : error.status === 503 ? 'unavailable' : 'request_failed';
			const message =
				error.body && typeof error.body === 'object' && 'message' in error.body && typeof error.body.message === 'string'
					? error.body.message
					: 'Request failed';
			return json({ error: code, message }, { status: error.status });
		}

		return json(
			{
				error: 'internal_error',
				message: error instanceof Error ? error.message : 'Unexpected error'
			},
			{ status: 500 }
		);
	}
};
