import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { JsonFileLabStore } from './store.js';
import { LabService } from './lab-service.js';
import { applyFilmCorrections, applyFilmPlayStateLedger, captureFilmAnalysis, FILM_PLAY_STATE_PROFILE } from '../film.js';

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

  it('attaches one captured analysis to exactly one player and rejects a duplicate inference revision', async () => {
    dir = await mkdtemp(join(tmpdir(), 'guard-film-service-'));
    const service = new LabService(new JsonFileLabStore(join(dir, 'workspace.json')));
    const playerId = (await service.getWorkspace()).workspace.selectedPlayerId;
    const otherPlayerId = (await service.createPlayer('Other player')).workspace.selectedPlayerId;
    const analysis = captureFilmAnalysis({
      source: { sha256: 'a'.repeat(64), durationMs: 2000, width: 1920, height: 1080, fps: 30, byteSize: 1000, linkedPath: '/private/game.mp4' },
      analyzedAt: '2026-07-19T17:00:00.000Z',
      frames: [{ timeMs: 0, players: [{ trackId: '13', team: 'target', court: [10, 20], confidence: 0.9 }] }]
    });

    await service.attachFilmAnalysis(playerId, 'Burton Angels / #13', analysis);
    await expect(service.attachFilmAnalysis(playerId, 'Duplicate', analysis)).rejects.toThrow(/already captured/i);
    const revision2 = { ...analysis, analysis: { ...analysis.analysis, revision: 2 as const } };
    await service.attachFilmAnalysis(playerId, 'Burton Angels / #13 / team-aware', revision2);
    const revisions = (await service.getPlayerWorkspace(playerId)).workspace.filmAnalyses;
    expect(revisions).toMatchObject([
      { playerId, title: 'Burton Angels / #13', analysis: { revision: 1, executionCount: 1 } },
      { playerId, title: 'Burton Angels / #13 / team-aware', analysis: { revision: 2, executionCount: 1 } }
    ]);
    expect((await service.getPlayerWorkspace(otherPlayerId)).workspace.filmAnalyses).toHaveLength(0);
  });

  it('accepts one distinct play-state overlay for an immutable analysis revision and rejects its duplicate', async () => {
    dir = await mkdtemp(join(tmpdir(), 'guard-film-play-state-'));
    const service = new LabService(new JsonFileLabStore(join(dir, 'workspace.json')));
    const playerId = (await service.getWorkspace()).workspace.selectedPlayerId;
    const sourceSha256 = 'b'.repeat(64);
    const analysis = captureFilmAnalysis({
      source: { sha256: sourceSha256, durationMs: 2000, width: 1920, height: 1080, fps: 30, byteSize: 1000, linkedPath: '/private/game.mp4' },
      frames: [{ timeMs: 0, players: [{ trackId: '13', team: 'target', court: [10, 20], confidence: 0.9 }] }]
    });
    const playStateOverlay = applyFilmPlayStateLedger(analysis, {
      version: 1,
      profile: FILM_PLAY_STATE_PROFILE,
      sourceSha256,
      intervals: [{
        id: 'reviewed-live-play', startMs: 0, endMs: 2000, state: 'live-offense',
        evidence: { method: 'source-review', reviewer: 'codex', note: 'Reviewed live possession.' }
      }]
    });

    await service.attachFilmAnalysis(playerId, 'Original analysis', analysis);
    await service.attachFilmAnalysis(playerId, 'Play-state reviewed', playStateOverlay);
    await expect(service.attachFilmAnalysis(playerId, 'Duplicate overlay', playStateOverlay)).rejects.toThrow(/already captured/i);

    const records = (await service.getPlayerWorkspace(playerId)).workspace.filmAnalyses;
    expect(records).toHaveLength(2);
    expect(records.map((record) => record.analysis.executionCount)).toEqual([1, 1]);
    expect(records[0]?.analysis.playStateVerification).toBeUndefined();
    expect(records[1]?.analysis.playStateVerification).toMatchObject({
      profile: FILM_PLAY_STATE_PROFILE,
      frameCount: 1,
      liveFrameCount: 1
    });
  });

  it('persists a correction overlay without incrementing or replacing the captured analysis', async () => {
    dir = await mkdtemp(join(tmpdir(), 'guard-film-correction-'));
    const service = new LabService(new JsonFileLabStore(join(dir, 'workspace.json')));
    const playerId = (await service.getWorkspace()).workspace.selectedPlayerId;
    const analysis = captureFilmAnalysis({
      source: { sha256: 'c'.repeat(64), durationMs: 2000, width: 1920, height: 1080, fps: 30, byteSize: 1000, linkedPath: '/private/game.mp4' },
      frames: [{ timeMs: 1000, players: [{ trackId: '13', team: 'target', court: [10, 20], confidence: 0.5 }] }]
    });
    const attached = await service.attachFilmAnalysis(playerId, 'Correction game', analysis);
    const analysisId = attached.workspace.filmAnalyses[0]!.id;
    await service.correctFilmAnalysis(playerId, analysisId, { timeMs: 1000, court: [14, 22], targetStatus: 'resolved', reason: 'Operator verified both feet against the lane mark.' });

    const stored = (await new LabService(new JsonFileLabStore(join(dir, 'workspace.json'))).getPlayerWorkspace(playerId)).workspace.filmAnalyses[0]!;
    expect(stored.analysis.executionCount).toBe(1);
    expect(stored.source.linkedPath).toBe('[private linked source]');
    expect(stored.corrections).toMatchObject([{ timeMs: 1000, court: [14, 22], reason: expect.stringContaining('lane mark') }]);
    expect(applyFilmCorrections(stored).frames[0]?.players[0]).toMatchObject({ court: [14, 22], provenance: 'corrected' });
    await expect(service.correctFilmAnalysis(playerId, analysisId, { timeMs: 1000, court: null, targetStatus: 'resolved', reason: 'Invalid resolved correction.' })).rejects.toThrow(/requires a court position/i);
    await expect(service.correctFilmAnalysis(playerId, analysisId, { timeMs: 5000, court: null, targetStatus: 'unresolved', reason: 'Invalid time correction.' })).rejects.toThrow(/outside the captured revision/i);
  });
});
