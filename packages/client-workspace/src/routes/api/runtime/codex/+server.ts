import type { RequestHandler } from './$types';

import { clientWorkspaceRuntime } from '$lib/server/runtime.js';

export const GET: RequestHandler = async () =>
  Response.json(await clientWorkspaceRuntime.codexStatus(), {
    headers: { 'cache-control': 'no-store' }
  });
