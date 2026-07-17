import { error } from '@sveltejs/kit';
import { ensureAgencyMcpEntitlement, type AgencySessionUser } from '$lib/server/mcp-token';
import type { CustomerMapScope } from '$lib/server/customer-map-workspace';

export async function resolveCustomerMapScope(input: {
	platform: App.Platform | undefined;
	user: AgencySessionUser;
	requireCommercialEntitlement?: boolean;
}): Promise<CustomerMapScope> {
	const { row, decision } = await ensureAgencyMcpEntitlement(input);
	if (!decision.allowed) throw error(403, `Map workspace access denied: ${decision.reason}`);
	if (!row.account_id || !row.tenant_id || !row.workspace_account_id) {
		throw error(403, 'Map workspace identity is not fully provisioned');
	}

	const scope = {
		authSubject: input.user.id,
		accountId: row.account_id,
		tenantId: row.tenant_id,
		workspaceAccountId: row.workspace_account_id
	};

	const commercialLaunchApproved =
		input.platform?.env?.MAP_COMMERCIAL_LAUNCH_APPROVED?.trim().toLowerCase() === 'true';
	if (commercialLaunchApproved && input.requireCommercialEntitlement !== false) {
		const entitlement = await input.platform?.env?.DB
			.prepare(
				`SELECT entitlement_status, billing_active FROM agency_map_entitlements
				 WHERE account_id = ? AND tenant_id = ? AND workspace_account_id = ?
				 LIMIT 1`
			)
			.bind(scope.accountId, scope.tenantId, scope.workspaceAccountId)
			.first<{ entitlement_status: string; billing_active: number }>();
		if (entitlement?.entitlement_status !== 'active' || entitlement.billing_active !== 1) {
			throw error(402, 'An active Map subscription is required for this workspace');
		}
	}

	return scope;
}
