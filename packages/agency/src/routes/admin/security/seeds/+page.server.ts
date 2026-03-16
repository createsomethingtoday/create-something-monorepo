import { listAgencyIdentitySeeds } from '$lib/server/mcp-entitlements';
import { requireAgencyOperator } from '$lib/server/operator-auth';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies, platform, url }) => {
	const operator = await requireAgencyOperator({ cookies, platform });
	const db = platform!.env.DB;
	const search = url.searchParams.get('search') ?? undefined;

	const seeds = await listAgencyIdentitySeeds(db, { limit: 200, search });

	return {
		operator: { email: operator.email },
		search: search ?? '',
		seeds,
	};
};
