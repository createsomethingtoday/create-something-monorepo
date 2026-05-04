import { listAgencyMcpEntitlements, evaluateAgencyMcpEntitlement } from '$lib/server/mcp-entitlements';
import { requireAgencyOperator } from '$lib/server/operator-auth';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, platform }) => {
	const operator = await requireAgencyOperator({ locals, platform });
	const rows = await listAgencyMcpEntitlements(platform!.env.DB, { limit: 100 });

	return {
		operator: {
			email: operator.email,
		},
		entitlements: rows.map((row) => ({
			...row,
			decision: evaluateAgencyMcpEntitlement(row),
		})),
	};
};
