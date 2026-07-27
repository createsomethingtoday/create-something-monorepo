import type { RequestHandler } from './$types';

import { workspaceErrorResponse } from '$lib/server/http-error.js';
import { clientWorkspaceRuntime } from '$lib/server/runtime.js';

export const POST: RequestHandler = async ({ params }) => {
  try {
    const plan = await clientWorkspaceRuntime.applyDeliveryUpdate(params.planId);
    return Response.json({ plan });
  } catch (error) {
    return workspaceErrorResponse(error);
  }
};
