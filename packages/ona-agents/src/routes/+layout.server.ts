import type { LayoutServerLoad } from './$types';
import { getIdentityAccessState } from '$lib/server/auth/identity-access';

export const load: LayoutServerLoad = async ({ fetch, platform, request, url }) => {
  return {
    authAccess: await getIdentityAccessState({ fetch, platform, request, url }),
    currentPath: url.pathname
  };
};
