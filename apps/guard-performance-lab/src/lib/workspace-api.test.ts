import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { workspaceCommandResponse } from './workspace-api.js';
import { LabService } from './server/lab-service.js';
import { JsonFileLabStore } from './server/store.js';

let dir = '';
afterEach(async () => { if (dir) await rm(dir, { recursive: true, force: true }); });

describe('workspace command HTTP contract', () => {
  it('records engagement through a typed command and rejects an unknown action', async () => {
    dir = await mkdtemp(join(tmpdir(), 'guard-api-'));
    const service = new LabService(new JsonFileLabStore(join(dir, 'workspace.json')));
    const initial = await service.getWorkspace();
    const playerId = initial.workspace.selectedPlayerId;
    const valid = await workspaceCommandResponse(new Request('http://local/api/workspace/command', { method: 'POST', body: JSON.stringify({ action: 'record-engagement', playerId, engagement: { stage: 'prepare', status: 'active', source: 'coach', note: 'Player began independent warmup.' } }) }), service);
    expect(valid.status).toBe(200);
    expect((await valid.json()).workspace.engagements).toHaveLength(1);

    const invalid = await workspaceCommandResponse(new Request('http://local/api/workspace/command', { method: 'POST', body: JSON.stringify({ action: 'replace-everything' }) }), service);
    expect(invalid.status).toBe(400);
    expect((await invalid.json()).error).toContain('Invalid workspace command');
  });
});
