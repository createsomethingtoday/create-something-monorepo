import type { RequestHandler } from './$types';

import { workspaceErrorResponse } from '$lib/server/http-error.js';
import { clientWorkspaceRuntime } from '$lib/server/runtime.js';

export const GET: RequestHandler = async ({ params }) => {
  try {
    const { receipt, workspaceId } = await clientWorkspaceRuntime.service.sessionState(
      params.sessionId
    );
    const preview = clientWorkspaceRuntime.preview(workspaceId);
    const previewStatus = await preview.start();
    return Response.json({
      workspace: clientWorkspaceRuntime.registry.get(workspaceId),
      receipt,
      preview: previewStatus
    });
  } catch (error) {
    return workspaceErrorResponse(error);
  }
};
