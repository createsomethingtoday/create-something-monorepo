import { error } from '@sveltejs/kit';
import { ensureAgencyMcpEntitlement, type AgencySessionUser } from '$lib/server/mcp-token';
import { buildCustomerMapScopeFromIdentity } from '$lib/server/customer-map-identity';
import type { CustomerMapScope } from '$lib/server/customer-map-workspace';

export async function resolveCustomerMapScope(input: {
	platform: App.Platform | undefined;
	user: AgencySessionUser;
	requireCommercialEntitlement?: boolean;
}): Promise<CustomerMapScope> {
	// Reconcile the canonical first-party identity, but leave MCP authorization to MCP routes.
	// Map applies its independent commercial entitlement below once launch is approved.
	const { row } = await ensureAgencyMcpEntitlement(input);
	const scope = buildCustomerMapScopeFromIdentity({
		authSubject: input.user.id,
		accountId: row.account_id,
		tenantId: row.tenant_id,
		workspaceAccountId: row.workspace_account_id
	});
	if (!scope) {
		throw error(403, 'Map workspace identity is not fully provisioned');
	}

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
