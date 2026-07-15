import type { RequestHandler } from './$types';

import { workspaceErrorResponse } from '$lib/server/http-error.js';
import { clientWorkspaceRuntime } from '$lib/server/runtime.js';

export const POST: RequestHandler = async ({ params }) => {
  try {
    const preview = clientWorkspaceRuntime.preview(params.workspaceId);
    const previewStatus = await preview.start();
    const created = await clientWorkspaceRuntime.service.createSession(params.workspaceId);
    return Response.json({ ...created, preview: previewStatus }, { status: 201 });
  } catch (error) {
    return workspaceErrorResponse(error);
  }
};
