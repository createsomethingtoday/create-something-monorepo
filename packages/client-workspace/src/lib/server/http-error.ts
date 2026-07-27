import { ClientWorkspaceServiceError } from './client-workspace-service.js';
import { ClientWorkspaceDeliveryError } from './deliveries/importer.js';
import { ManagedDeliveryError } from './deliveries/managed-delivery-runtime.js';
import { ClientWorkspacePackageError } from '@create-something/delivery-schema/client-workspace-package';
import { PreviewSessionError } from './preview/preview-session.js';
import { WorkspaceSessionError } from './sessions/workspace-session.js';
import { WorkspaceRegistryError } from './workspaces/registry.js';

export function workspaceErrorResponse(error: unknown): Response {
  if (error instanceof WorkspaceRegistryError) {
    return Response.json({ error: error.code }, { status: 404 });
  }
  if (error instanceof ClientWorkspaceServiceError) {
    return Response.json(
      { error: error.code },
      {
        status:
          error.code === 'session_not_found'
            ? 404
            : error.code === 'session_resume_failed'
              ? 409
              : error.code === 'workspace_integrity_failed'
                ? 409
                : 400
      }
    );
  }
  if (error instanceof ClientWorkspaceDeliveryError) {
    const status =
      error.code === 'workspace_exists'
        ? 409
        : error.code === 'delivery_import_unavailable'
          ? 503
          : 400;
    return Response.json({ error: error.code }, { status });
  }
  if (error instanceof ClientWorkspacePackageError) {
    return Response.json({ error: error.code }, { status: 400 });
  }
  if (error instanceof ManagedDeliveryError) {
    const status =
      error.code === 'update_plan_not_found' || error.code === 'checkpoint_not_found' ? 404 : 409;
    return Response.json({ error: error.code }, { status });
  }
  if (error instanceof WorkspaceSessionError) {
    const status =
      error.code === 'turn_conflict'
        ? 409
        : error.code === 'forbidden_intent'
          ? 403
          : error.code === 'approval_not_found'
            ? 404
            : error.code === 'session_closed'
              ? 410
              : 400;
    return Response.json({ error: error.code }, { status });
  }
  if (error instanceof PreviewSessionError) {
    return Response.json({ error: error.code }, { status: 503 });
  }
  return Response.json({ error: 'workspace_request_failed' }, { status: 500 });
}
