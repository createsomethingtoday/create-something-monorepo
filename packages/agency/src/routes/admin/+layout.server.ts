import { requireAgencyOperator } from '$lib/server/operator-auth';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ cookies, platform }) => {
	const operator = await requireAgencyOperator({ cookies, platform });

	return {
		operator: {
			email: operator.email
		}
	};
};
