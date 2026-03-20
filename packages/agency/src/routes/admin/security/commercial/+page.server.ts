import { listAgencyCommercialState } from '$lib/server/mcp-entitlements';
import { requireAgencyOperator } from '$lib/server/operator-auth';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies, platform }) => {
	await requireAgencyOperator({ cookies, platform });
	const commercial = await listAgencyCommercialState(platform!.env.DB, { limit: 200 });
	return { commercial };
};
