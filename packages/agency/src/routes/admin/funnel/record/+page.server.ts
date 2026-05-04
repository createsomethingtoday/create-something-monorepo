import { requireAgencyOperator } from '$lib/server/operator-auth';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, platform }) => {
	await requireAgencyOperator({ locals, platform });
	return {};
};
