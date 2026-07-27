import type { RequestHandler } from './$types';

import { workspaceErrorResponse } from '$lib/server/http-error.js';
import { clientWorkspaceRuntime } from '$lib/server/runtime.js';

export const GET: RequestHandler = async ({ params }) => {
  try {
    const exported = await clientWorkspaceRuntime.service.exportReceipt(params.sessionId);
    return new Response(`${JSON.stringify(exported, null, 2)}\n`, {
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'content-disposition': `attachment; filename="client-workspace-${params.sessionId}.json"`,
        'cache-control': 'no-store'
      }
    });
  } catch (error) {
    return workspaceErrorResponse(error);
  }
};
