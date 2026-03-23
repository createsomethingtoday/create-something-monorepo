import { listAgencyCommercialState } from '$lib/server/mcp-entitlements';
import { requireAgencyOperator } from '$lib/server/operator-auth';

export const load = async ({ cookies, platform }: { cookies: import('@sveltejs/kit').Cookies; platform: App.Platform }) => {
	await requireAgencyOperator({ cookies, platform });
	const commercial = await listAgencyCommercialState(platform!.env.DB, { limit: 200 });
	return { commercial };
};
