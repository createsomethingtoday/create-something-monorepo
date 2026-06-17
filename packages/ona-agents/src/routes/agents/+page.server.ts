import type { PageServerLoad } from './$types';
import { getDifyOperatorAgentViews } from '$lib/server/dify/agent-registry';

export const load: PageServerLoad = async ({ parent, platform }) => {
  const parentData = await parent();
  const accessAllowed = parentData.clerkAccess.status === 'allowed';

  return {
    accessAllowed,
    signInUrl: parentData.clerkAccess.signInUrl,
    accessDetail: parentData.clerkAccess.detail,
    agents: accessAllowed ? getDifyOperatorAgentViews(platform) : []
  };
};
