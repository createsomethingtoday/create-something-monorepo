import { listAgencyContractState } from '$lib/server/mcp-entitlements';
import { requireAgencyOperator } from '$lib/server/operator-auth';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies, platform }) => {
	const operator = await requireAgencyOperator({ cookies, platform });
	const contracts = await listAgencyContractState(platform!.env.DB, { limit: 100 });

	return {
		operator: {
			email: operator.email,
		},
		contracts,
	};
};
