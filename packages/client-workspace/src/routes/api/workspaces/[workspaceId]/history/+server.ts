import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { searchCtxHistory } from '$lib/server/ctx-history.js';
import { clientWorkspaceRuntime } from '$lib/server/runtime.js';

export const GET: RequestHandler = async ({ params, url }) => {
  const query = url.searchParams.get('q')?.trim() ?? '';
  if (!query || query.length > 200) {
    return json({ error: 'A history query of 1 to 200 characters is required.' }, { status: 400 });
  }

  let workspaceRoot: string;
  try {
    workspaceRoot = clientWorkspaceRuntime.registry.resolve(params.workspaceId).sourceRoot;
  } catch {
    return json({ error: 'Workspace not found.' }, { status: 404 });
  }

  const history = await searchCtxHistory({ workspaceRoot, query });
  return json(history, { headers: { 'cache-control': 'no-store' } });
};
