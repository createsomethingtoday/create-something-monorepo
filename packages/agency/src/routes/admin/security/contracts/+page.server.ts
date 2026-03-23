import { listAgencyContractState } from '$lib/server/mcp-entitlements';
import { requireAgencyOperator } from '$lib/server/operator-auth';

export const load = async ({ cookies, platform }: { cookies: import('@sveltejs/kit').Cookies; platform: App.Platform }) => {
	const operator = await requireAgencyOperator({ cookies, platform });
	const contracts = await listAgencyContractState(platform!.env.DB, { limit: 100 });

	return {
		operator: {
			email: operator.email,
		},
		contracts,
	};
};
