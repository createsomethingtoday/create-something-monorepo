import type { RequestHandler } from './$types';
import { workspaceCommandResponse } from '$lib/workspace-api.js';
import { deniedAccessResponse, privateResponse, resolveGuardApplicationAccess, runtimeEnv } from '$lib/server/access.js';
import { labServiceForRuntime } from '$lib/server/runtime-store.js';

export const POST: RequestHandler = async ({ request, url, fetch, platform }) => {
  const access = await resolveGuardApplicationAccess({ request, url, fetch, env: runtimeEnv(platform) });
  return privateResponse(access.scope
    ? await workspaceCommandResponse(request, labServiceForRuntime(platform), access.scope)
    : deniedAccessResponse(access));
};
