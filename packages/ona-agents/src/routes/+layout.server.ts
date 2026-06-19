import type { LayoutServerLoad } from './$types';
import { getClerkAccessState } from '$lib/server/auth/clerk-access';

export const load: LayoutServerLoad = async ({ cookies, fetch, platform, request, url }) => {
  return {
    clerkAccess: await getClerkAccessState({ cookies, fetch, platform, request, url }),
    currentPath: url.pathname
  };
};
