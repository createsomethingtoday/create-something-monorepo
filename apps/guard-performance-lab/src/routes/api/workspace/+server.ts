import type { RequestHandler } from './$types';
import { deniedAccessResponse, resolveGuardApplicationAccess, runtimeEnv } from '$lib/server/access.js';
import { readWorkspaceResponse, resetWorkspaceResponse } from '$lib/server/workspace-http.js';
import { labServiceForRuntime } from '$lib/server/runtime-store.js';

async function accessFor(event: Parameters<RequestHandler>[0]) {
  return resolveGuardApplicationAccess({
    request: event.request,
    url: event.url,
    fetch: event.fetch,
    env: runtimeEnv(event.platform)
  });
}

export const GET: RequestHandler = async (event) => {
  const access = await accessFor(event);
  return access.scope ? readWorkspaceResponse(labServiceForRuntime(event.platform), access.scope) : deniedAccessResponse(access);
};

export const DELETE: RequestHandler = async (event) => {
  const access = await accessFor(event);
  return access.scope
    ? resetWorkspaceResponse(event.request, labServiceForRuntime(event.platform), access.scope)
    : deniedAccessResponse(access);
};
