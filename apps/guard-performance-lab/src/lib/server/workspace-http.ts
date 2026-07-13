import type { LabService } from './lab-service.js';
import { isPlayerScope, type GuardAccessScope } from './scope.js';

export async function readWorkspaceResponse(service: LabService, scope: GuardAccessScope): Promise<Response> {
  const result = isPlayerScope(scope)
    ? await service.getPlayerWorkspace(scope.playerId)
    : await service.getWorkspace();
  return Response.json(result);
}

export async function resetWorkspaceResponse(
  request: Request,
  service: LabService,
  scope: GuardAccessScope
): Promise<Response> {
  if (isPlayerScope(scope)) {
    return Response.json({ ok: false, error: 'Player access cannot reset the workspace.' }, { status: 403 });
  }
  if (request.headers.get('x-guard-lab-confirm') !== 'reset') {
    return Response.json({ ok: false, error: 'Reset requires x-guard-lab-confirm: reset.' }, { status: 409 });
  }
  return Response.json(await service.reset());
}
