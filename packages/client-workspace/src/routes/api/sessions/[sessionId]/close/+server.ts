import type { RequestHandler } from './$types';

import { workspaceErrorResponse } from '$lib/server/http-error.js';
import { clientWorkspaceRuntime } from '$lib/server/runtime.js';

export const POST: RequestHandler = async ({ params }) => {
  try {
    await clientWorkspaceRuntime.service.closeSession(params.sessionId);
    return Response.json({ ok: true });
  } catch (error) {
    return workspaceErrorResponse(error);
  }
};
