import type { RequestHandler } from './$types';
import { guideResponse } from '$lib/api.js';
import { deniedAccessResponse, resolveGuardApplicationAccess, runtimeEnv } from '$lib/server/access.js';

export const POST: RequestHandler = async ({ request, url, fetch, platform }) => {
  const access = await resolveGuardApplicationAccess({ request, url, fetch, env: runtimeEnv(platform) });
  return access.scope ? guideResponse(request) : deniedAccessResponse(access);
};
