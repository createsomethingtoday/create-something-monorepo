import type { PageServerLoad } from './$types';
import { requireAgencyOperator } from '$lib/server/operator-auth';

export const load: PageServerLoad = async ({ cookies, platform }) => {
	await requireAgencyOperator({ cookies, platform });
	return {};
};
