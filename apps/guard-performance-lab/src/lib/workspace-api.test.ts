import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { workspaceCommandResponse } from './workspace-api.js';
import { LabService } from './server/lab-service.js';
import { JsonFileLabStore } from './server/store.js';
import { captureFilmAnalysis } from './film.js';

let dir = '';
afterEach(async () => { if (dir) await rm(dir, { recursive: true, force: true }); });

describe('workspace command HTTP contract', () => {
  it('lets an operator create a minimally seeded private player profile', async () => {
    dir = await mkdtemp(join(tmpdir(), 'guard-api-profile-'));
    const service = new LabService(new JsonFileLabStore(join(dir, 'workspace.json')));

    const response = await workspaceCommandResponse(
      new Request('http://local/api/workspace/command', {
        method: 'POST',
        body: JSON.stringify({
          action: 'create-player',
          name: 'Player 01',
          profile: { age: 12, gender: 'male', primaryPosition: 'guard' }
        })
      }),
      service
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.workspace.players.at(-1)).toMatchObject({
      name: 'Player 01',
      profile: { age: 12, gender: 'male', primaryPosition: 'guard' }
    });
  });

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

  it('denies a player-scoped caller that supplies another player id', async () => {
    dir = await mkdtemp(join(tmpdir(), 'guard-api-scope-'));
    const service = new LabService(new JsonFileLabStore(join(dir, 'workspace.json')));
    const initial = await service.getWorkspace();
    const assignedPlayerId = initial.workspace.selectedPlayerId;
    const other = await service.createPlayer('Other player');
    const otherPlayerId = other.workspace.selectedPlayerId;

    const response = await workspaceCommandResponse(
      new Request('http://local/api/workspace/command', {
        method: 'POST',
        body: JSON.stringify({
          action: 'record-engagement',
          playerId: otherPlayerId,
          engagement: {
            stage: 'prepare',
            status: 'active',
            source: 'player',
            note: 'Attempted cross-player write.'
          }
        })
      }),
      service,
      { role: 'player', playerId: assignedPlayerId }
    );

    expect(response.status).toBe(403);
    expect((await response.json()).error).toContain('assigned player');
    expect((await service.getPlayerWorkspace(otherPlayerId)).workspace.engagements).toHaveLength(0);
  });

  it('lets an assigned player complete only his own optional profile fields', async () => {
    dir = await mkdtemp(join(tmpdir(), 'guard-api-profile-scope-'));
    const service = new LabService(new JsonFileLabStore(join(dir, 'workspace.json')));
    const assignedPlayerId = (await service.getWorkspace()).workspace.selectedPlayerId;
    const otherPlayerId = (await service.createPlayer('Other player')).workspace.selectedPlayerId;
    const playerScope = { role: 'player' as const, playerId: assignedPlayerId };

    const ownResponse = await workspaceCommandResponse(
      new Request('http://local/api/workspace/command', {
        method: 'POST',
        body: JSON.stringify({
          action: 'update-player-profile',
          playerId: assignedPlayerId,
          profile: { preferredName: 'My name', dominantHand: 'left', goals: 'See the helper before dribble two.' }
        })
      }),
      service,
      playerScope
    );
    expect(ownResponse.status).toBe(200);
    expect((await ownResponse.json()).workspace.players).toMatchObject([{
      id: assignedPlayerId,
      profile: { preferredName: 'My name', dominantHand: 'left', goals: 'See the helper before dribble two.' }
    }]);

    const otherResponse = await workspaceCommandResponse(
      new Request('http://local/api/workspace/command', {
        method: 'POST',
        body: JSON.stringify({ action: 'update-player-profile', playerId: otherPlayerId, profile: { preferredName: 'Changed' } })
      }),
      service,
      playerScope
    );
    expect(otherResponse.status).toBe(403);
    expect((await service.getPlayerWorkspace(otherPlayerId)).workspace.players[0]?.profile.preferredName).toBe('');
  });

  it('lets only an operator attach a captured one-run analysis revision', async () => {
    dir = await mkdtemp(join(tmpdir(), 'guard-api-film-'));
    const service = new LabService(new JsonFileLabStore(join(dir, 'workspace.json')));
    const playerId = (await service.getWorkspace()).workspace.selectedPlayerId;
    const analysis = captureFilmAnalysis({
      source: { sha256: 'b'.repeat(64), durationMs: 1000, width: 1920, height: 1080, fps: 30, byteSize: 1000, linkedPath: '/private/game.mp4' },
      frames: [{ timeMs: 0, players: [] }]
    });
    const command = { action: 'attach-film-analysis', playerId, title: 'Game / #13', analysis };
    const denied = await workspaceCommandResponse(new Request('http://local/api/workspace/command', { method: 'POST', body: JSON.stringify(command) }), service, { role: 'player', playerId });
    expect(denied.status).toBe(403);
    expect((await service.getWorkspace()).workspace.filmAnalyses).toHaveLength(0);

    const allowed = await workspaceCommandResponse(new Request('http://local/api/workspace/command', { method: 'POST', body: JSON.stringify(command) }), service, { role: 'operator' });
    expect(allowed.status).toBe(200);
    const attached = await allowed.json();
    expect(attached.workspace.filmAnalyses).toMatchObject([{ playerId, title: 'Game / #13', analysis: { executionCount: 1 } }]);

    const deniedCorrection = await workspaceCommandResponse(new Request('http://local/api/workspace/command', {
      method: 'POST',
      body: JSON.stringify({
        action: 'correct-film-analysis',
        playerId,
        analysisId: attached.workspace.filmAnalyses[0].id,
        correction: { timeMs: 0, court: null, targetStatus: 'unresolved', reason: 'Player attempted to alter captured evidence.' }
      })
    }), service, { role: 'player', playerId });
    expect(deniedCorrection.status).toBe(403);
    expect((await service.getWorkspace()).workspace.filmAnalyses[0]?.corrections).toHaveLength(0);

    const deniedReview = await workspaceCommandResponse(new Request('http://local/api/workspace/command', {
      method: 'POST',
      body: JSON.stringify({
        action: 'attach-film-play-review',
        playerId,
        analysisId: attached.workspace.filmAnalyses[0].id,
        review: {
          version: 1,
          profile: 'guard-player-13-play-review-v1',
          sourceSha256: analysis.source.sha256,
          analysisRevision: 1,
          analysisExecutionCount: 1,
          reviewer: 'codex',
          reviewedAt: '2026-07-20T20:00:00.000Z',
          cards: [{
            id: 'private-review', startMs: 0, representativeTimeMs: 0, endMs: 1000,
            possession: 'opponent', phase: 'half-court-defense', position: 'Perimeter',
            observation: '#13 is visible in the defensive shell.', interpretation: 'The position preserves width.', limitation: 'The exact assignment is not shown.',
            image: {
              mediaType: 'image/webp', dataUrl: `data:image/webp;base64,${Buffer.from('pixelated').toString('base64')}`,
              sha256: 'e'.repeat(64), width: 960, height: 540,
              anonymization: { method: 'whole-frame-pixelation-v1', sourceWidth: 1920, sourceHeight: 1080, pixelWidth: 160, pixelHeight: 90, rawSourceIncluded: false, marker: { label: '13', style: 'synthetic-orange-v1', normalizedPoint: [0.4, 0.6] } }
            }
          }]
        }
      })
    }), service, { role: 'player', playerId });
    expect(deniedReview.status).toBe(403);
  });
});
