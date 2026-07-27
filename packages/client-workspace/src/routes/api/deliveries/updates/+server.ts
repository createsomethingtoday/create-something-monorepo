import type { RequestHandler } from './$types';

import { workspaceErrorResponse } from '$lib/server/http-error.js';
import { clientWorkspaceRuntime } from '$lib/server/runtime.js';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const form = await request.formData();
    const delivery = form.get('delivery');
    if (!(delivery instanceof File) || delivery.size === 0 || delivery.size > 25 * 1024 * 1024) {
      return Response.json({ error: 'invalid_package' }, { status: 400 });
    }
    const plan = await clientWorkspaceRuntime.planDeliveryUpdate(
      Buffer.from(await delivery.arrayBuffer())
    );
    return Response.json({ plan }, { status: 201 });
  } catch (error) {
    return workspaceErrorResponse(error);
  }
};
