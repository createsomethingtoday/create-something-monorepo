import type { RequestHandler } from './$types';
import { programResponse } from '$lib/api.js';
import { deniedAccessResponse, resolveGuardApplicationAccess, runtimeEnv } from '$lib/server/access.js';

export const GET: RequestHandler = async ({ request, url, fetch, platform }) => {
  const access = await resolveGuardApplicationAccess({ request, url, fetch, env: runtimeEnv(platform) });
  return access.scope ? programResponse() : deniedAccessResponse(access);
};
