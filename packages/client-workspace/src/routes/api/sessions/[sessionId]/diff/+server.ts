import type { RequestHandler } from './$types';

import { workspaceErrorResponse } from '$lib/server/http-error.js';
import { clientWorkspaceRuntime } from '$lib/server/runtime.js';

export const GET: RequestHandler = async ({ params }) => {
  try {
    const diff = await clientWorkspaceRuntime.service.workspaceDiff(params.sessionId);
    return Response.json({ diff });
  } catch (error) {
    return workspaceErrorResponse(error);
  }
};
