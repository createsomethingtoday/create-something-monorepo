import type { PageServerLoad } from './$types';
import { labelAgentReturnPath, safeAgentReturnPath } from '$lib/server/auth/return-path';

export const load: PageServerLoad = async ({ url }) => {
  const redirectTo = safeAgentReturnPath(url.searchParams.get('redirect'));
  return {
    redirectTo,
    returnDestinationLabel: labelAgentReturnPath(redirectTo)
  };
};
