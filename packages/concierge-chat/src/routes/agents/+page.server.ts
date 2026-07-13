import type { PageServerLoad } from './$types';
import { getAgencyAccessControlPlaneSurface } from '$lib/agency-access';
import { buildControlPlaneBridgeHref } from '$lib/control-plane';

export const load: PageServerLoad = async ({ parent }) => {
  const parentData = await parent();

  return {
    controlPlaneHref: buildControlPlaneBridgeHref(
      getAgencyAccessControlPlaneSurface(parentData.agencyAccess)
    )
  };
};
