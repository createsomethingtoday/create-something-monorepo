import { redirect } from '@sveltejs/kit';
import { getAgencyAccessControlPlaneSurface } from '$lib/agency-access';
import { buildControlPlaneBridgeHref } from '$lib/control-plane';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const parentData = await parent();

	if (parentData.agencyAccess.status !== 'allowed') {
		throw redirect(
			303,
			buildControlPlaneBridgeHref(getAgencyAccessControlPlaneSurface(parentData.agencyAccess))
		);
	}

	return {};
};
