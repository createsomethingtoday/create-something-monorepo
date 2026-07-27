import type { RequestHandler } from './$types';

import { workspaceErrorResponse } from '$lib/server/http-error.js';
import { clientWorkspaceRuntime } from '$lib/server/runtime.js';

export const POST: RequestHandler = async ({ params }) => {
  try {
    const checkpointId = await clientWorkspaceRuntime.checkpoint(params.workspaceId);
    return Response.json({ checkpointId }, { status: 201 });
  } catch (error) {
    return workspaceErrorResponse(error);
  }
};
