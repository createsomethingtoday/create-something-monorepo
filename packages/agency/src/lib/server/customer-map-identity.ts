import type { CustomerMapScope } from '$lib/server/customer-map-workspace';

export function buildCustomerMapScopeFromIdentity(input: {
	authSubject: string;
	accountId: string | null;
	tenantId: string | null;
	workspaceAccountId: string | null;
}): CustomerMapScope | null {
	if (!input.accountId || !input.tenantId || !input.workspaceAccountId) return null;

	return {
		authSubject: input.authSubject,
		accountId: input.accountId,
		tenantId: input.tenantId,
		workspaceAccountId: input.workspaceAccountId
	};
}
