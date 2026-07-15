import type { RequestHandler } from './$types';

import { workspaceErrorResponse } from '$lib/server/http-error.js';
import { clientWorkspaceRuntime } from '$lib/server/runtime.js';

export const POST: RequestHandler = async ({ request, params }) => {
  try {
    const form = await request.formData();
    const text = form.get('text');
    const image = form.get('image');
    const attachment =
      image instanceof File && image.size > 0
        ? await clientWorkspaceRuntime.service.storeAttachment(params.sessionId, image)
        : undefined;
    const turn = await clientWorkspaceRuntime.service.startTurn(params.sessionId, {
      text: typeof text === 'string' ? text : '',
      ...(attachment ? { attachment } : {})
    });
    return Response.json(turn, { status: 202 });
  } catch (error) {
    return workspaceErrorResponse(error);
  }
};
