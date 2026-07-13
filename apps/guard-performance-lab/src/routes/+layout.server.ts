import type { LayoutServerLoad } from './$types';
import { resolveGuardApplicationAccess, runtimeEnv } from '$lib/server/access.js';

export const load: LayoutServerLoad = async ({ fetch, platform, request, url }) => ({
  publicAuthRoute: url.pathname === '/sign-in',
  guardAccess: await resolveGuardApplicationAccess({
    fetch,
    request,
    url,
    env: runtimeEnv(platform)
  })
});
