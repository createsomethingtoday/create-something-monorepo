import type { PageServerLoad } from './$types';
import { listPartnerProspectClaimsForAgencyUser } from '$lib/server/partner-prospect-discovery';
import { loadProspectPortalData } from '$lib/server/prospect-portal-core';

export const load: PageServerLoad = async ({ parent, platform }) => {
	const { user } = await parent();

	return loadProspectPortalData(
		{
			listPartnerProspectClaimsForAgencyUser,
		},
		{
			user: user ? { id: user.id, email: user.email } : null,
			db: platform?.env?.DB,
			env: platform?.env,
		},
	);
};
