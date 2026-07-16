import type { RequestHandler } from './$types';

import { workspaceErrorResponse } from '$lib/server/http-error.js';
import { clientWorkspaceRuntime } from '$lib/server/runtime.js';

export const POST: RequestHandler = async ({ request, params }) => {
  try {
    const body = (await request.json()) as { decision?: unknown };
    if (body.decision !== 'accept' && body.decision !== 'decline') {
      return Response.json({ error: 'invalid_approval_decision' }, { status: 400 });
    }
    await clientWorkspaceRuntime.service.respondToApproval(
      params.sessionId,
      params.approvalId,
      body.decision
    );
    return Response.json({ ok: true });
  } catch (error) {
    return workspaceErrorResponse(error);
  }
};
