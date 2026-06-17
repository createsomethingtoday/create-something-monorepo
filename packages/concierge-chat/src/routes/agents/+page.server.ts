import type { PageServerLoad } from './$types';
import { getAgencyAccessControlPlaneSurface } from '$lib/agency-access';
import { buildControlPlaneBridgeHref } from '$lib/control-plane';
import { getDifyOperatorAgentViews } from '$lib/server/dify/agent-registry';

export const load: PageServerLoad = async ({ parent, platform }) => {
  const parentData = await parent();
  const accessAllowed = parentData.agencyAccess.status === 'allowed';

  return {
    accessAllowed,
    controlPlaneHref: buildControlPlaneBridgeHref(
      getAgencyAccessControlPlaneSurface(parentData.agencyAccess)
    ),
    agents: accessAllowed ? getDifyOperatorAgentViews(platform) : []
  };
};
