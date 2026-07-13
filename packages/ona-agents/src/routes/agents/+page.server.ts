import type { PageServerLoad } from './$types';
import { getDifyOperatorAgentViews } from '$lib/server/dify/agent-registry';

export const load: PageServerLoad = async ({ parent, platform }) => {
  const parentData = await parent();
  const accessAllowed = parentData.authAccess.status === 'allowed';

  return {
    accessAllowed,
    signInUrl: parentData.authAccess.signInUrl,
    accessDetail: parentData.authAccess.detail,
    agents: accessAllowed ? getDifyOperatorAgentViews(platform) : []
  };
};
