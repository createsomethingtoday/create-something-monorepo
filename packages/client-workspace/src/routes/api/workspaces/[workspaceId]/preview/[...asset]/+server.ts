import type { RequestHandler } from './$types';

import { PreviewSessionError } from '$lib/server/preview/preview-session.js';
import { clientWorkspaceRuntime } from '$lib/server/runtime.js';
import { WorkspaceRegistryError } from '$lib/server/workspaces/registry.js';

async function proxyPreview(request: Request, workspaceId: string): Promise<Response> {
  try {
    const preview = clientWorkspaceRuntime.preview(workspaceId);
    await preview.start();
    return await preview.proxy(request);
  } catch (error) {
    if (error instanceof WorkspaceRegistryError) {
      return Response.json({ error: error.code }, { status: 404 });
    }
    if (error instanceof PreviewSessionError) {
      const status = error.code === 'preview_method_not_allowed' ? 405 : 503;
      return Response.json({ error: error.code }, { status });
    }
    return Response.json({ error: 'preview_unavailable' }, { status: 503 });
  }
}

export const GET: RequestHandler = ({ request, params }) =>
  proxyPreview(request, params.workspaceId);

export const HEAD: RequestHandler = ({ request, params }) =>
  proxyPreview(request, params.workspaceId);
