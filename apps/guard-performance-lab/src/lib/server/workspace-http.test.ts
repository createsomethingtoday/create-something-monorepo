import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { LabService } from './lab-service.js';
import { JsonFileLabStore } from './store.js';
import { readWorkspaceResponse, resetWorkspaceResponse } from './workspace-http.js';

let dir = '';
afterEach(async () => { if (dir) await rm(dir, { recursive: true, force: true }); });

describe('authorized workspace HTTP responses', () => {
  it('returns only the assigned player workspace to player scope', async () => {
    dir = await mkdtemp(join(tmpdir(), 'guard-read-scope-'));
    const service = new LabService(new JsonFileLabStore(join(dir, 'workspace.json')));
    const initial = await service.getWorkspace();
    const assignedPlayerId = initial.workspace.selectedPlayerId;
    await service.createPlayer('Other player');

    const response = await readWorkspaceResponse(service, { role: 'player', playerId: assignedPlayerId });
    const body = await response.json();
    expect(body.workspace.players).toHaveLength(1);
    expect(body.workspace.players[0].id).toBe(assignedPlayerId);
  });

  it('denies destructive reset to player scope', async () => {
    dir = await mkdtemp(join(tmpdir(), 'guard-reset-scope-'));
    const service = new LabService(new JsonFileLabStore(join(dir, 'workspace.json')));
    const playerId = (await service.getWorkspace()).workspace.selectedPlayerId;
    const response = await resetWorkspaceResponse(
      new Request('http://local/api/workspace', { method: 'DELETE', headers: { 'x-guard-lab-confirm': 'reset' } }),
      service,
      { role: 'player', playerId }
    );
    expect(response.status).toBe(403);
  });
});
