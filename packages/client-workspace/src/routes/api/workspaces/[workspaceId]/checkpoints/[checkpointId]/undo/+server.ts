import type { RequestHandler } from './$types';

import { workspaceErrorResponse } from '$lib/server/http-error.js';
import { clientWorkspaceRuntime } from '$lib/server/runtime.js';

export const POST: RequestHandler = async ({ params }) => {
  try {
    await clientWorkspaceRuntime.undo(params.workspaceId, params.checkpointId);
    return Response.json({ restored: true });
  } catch (error) {
    return workspaceErrorResponse(error);
  }
};
