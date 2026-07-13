import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { JsonFileLabStore } from './store.js';
import { LabService } from './lab-service.js';

let dir = '';
afterEach(async () => { if (dir) await rm(dir, { recursive: true, force: true }); });

describe('Guard Lab command service', () => {
  it('preserves concurrent browser and Codex writes through the public command interface', async () => {
    dir = await mkdtemp(join(tmpdir(), 'guard-lab-service-'));
    const path = join(dir, 'workspace.json');
    const browser = new LabService(new JsonFileLabStore(path));
    const codex = new LabService(new JsonFileLabStore(path));

    const player = await browser.createPlayer('Shared Player');
    const playerId = player.workspace.selectedPlayerId;
    await Promise.all([
      browser.saveReceipt(playerId, { date: '2026-07-13', strength: 'Named the nail helper', nextFocus: 'Hold pace', playerWords: 'I saw help early' }),
      codex.registerEvidence(playerId, { kind: 'stat-line', title: 'Official college source', sourceLabel: 'NCAA', sourceUrl: 'https://www.ncaa.com/stats/basketball-men/d1', level: 'college', observation: 'Official source retained for review.' })
    ]);

    const result = await browser.getWorkspace();
    expect(result.workspace.receipts).toHaveLength(1);
    expect(result.workspace.artifacts).toHaveLength(1);
  });

  it('rejects a player-scoped write when the assigned profile does not exist', async () => {
    dir = await mkdtemp(join(tmpdir(), 'guard-lab-service-'));
    const service = new LabService(new JsonFileLabStore(join(dir, 'workspace.json')));
    await expect(service.registerEvidence('missing-player', { kind: 'coach-observation', title: 'Live read', sourceLabel: 'Player', level: 'youth', observation: 'Saw the nail helper.' })).rejects.toThrow('does not exist');
  });

  it('records a scoped engagement event without exposing another player', async () => {
    dir = await mkdtemp(join(tmpdir(), 'guard-lab-service-'));
    const service = new LabService(new JsonFileLabStore(join(dir, 'workspace.json')));
    const created = await service.createPlayer('Engaged Player');
    const playerId = created.workspace.selectedPlayerId;
    await service.recordEngagement(playerId, { stage: 'help', status: 'active', source: 'player', note: 'Asked to review nail help.' });
    const scoped = await service.getPlayerWorkspace(playerId);
    expect(scoped.workspace.players).toHaveLength(1);
    expect(scoped.workspace.engagements).toMatchObject([{ playerId, stage: 'help', status: 'active', source: 'player' }]);
  });
});
