import type { RequestHandler } from './$types';

import { workspaceErrorResponse } from '$lib/server/http-error.js';
import { clientWorkspaceRuntime } from '$lib/server/runtime.js';

export const POST: RequestHandler = async ({ params }) => {
  try {
    await clientWorkspaceRuntime.rollback(params.workspaceId);
    return Response.json({ rolledBack: true });
  } catch (error) {
    return workspaceErrorResponse(error);
  }
};
