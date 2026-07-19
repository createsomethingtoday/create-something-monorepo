import { describe, expect, it } from 'vitest';
import { captureFilmAnalysis } from '../film.js';
import { createInitialState, type FilmAnalysisRecord } from '../model.js';
import { prepareD1Workspace } from './d1-store.js';

describe('D1 film frame storage', () => {
  it('keeps the workspace row small and splits immutable frames into bounded ordered chunks', () => {
    const analysis = captureFilmAnalysis({
      source: { sha256: 'd'.repeat(64), durationMs: 300000, width: 1920, height: 1080, fps: 30, byteSize: 1000, linkedPath: '/private/game.mp4' },
      frames: Array.from({ length: 250 }, (_, timeMs) => ({ timeMs: timeMs * 1000, players: [{ trackId: '13', team: 'target', court: [10, 20], confidence: 0.9 }] }))
    });
    const record = { ...analysis, id: 'film-1', playerId: 'developing-guard', title: 'Game', createdAt: '2026-07-19T00:00:00Z', corrections: [] } satisfies FilmAnalysisRecord;
    const prepared = prepareD1Workspace({ ...createInitialState(), filmAnalyses: [record] });

    expect(prepared.workspace.filmAnalyses[0]?.frames).toEqual([]);
    expect(prepared.chunks).toHaveLength(7);
    expect(prepared.chunks.map((chunk) => JSON.parse(chunk.framesJson).length)).toEqual([40, 40, 40, 40, 40, 40, 10]);
    expect(Math.max(...prepared.chunks.map((chunk) => Buffer.byteLength(chunk.framesJson)))).toBeLessThan(500_000);
  });

  it('preserves the original chunk contract when a hydrated immutable revision is written beside a new revision', () => {
    const analysis = captureFilmAnalysis({
      source: { sha256: 'e'.repeat(64), durationMs: 3000, width: 1920, height: 1080, fps: 30, byteSize: 1000, linkedPath: '/private/game.mp4' },
      frames: Array.from({ length: 3 }, (_, timeMs) => ({ timeMs: timeMs * 1000, players: [] }))
    });
    const existing = {
      ...analysis,
      id: 'film-existing',
      playerId: 'developing-guard',
      title: 'Existing',
      createdAt: '2026-07-19T00:00:00Z',
      corrections: [],
      frameStorage: { kind: 'd1-chunks', chunkCount: 1, frameCount: 3 }
    } as FilmAnalysisRecord & { frameStorage: { kind: 'd1-chunks'; chunkCount: number; frameCount: number } };
    const newRevision = {
      ...analysis,
      id: 'film-new',
      playerId: 'developing-guard',
      title: 'New',
      createdAt: '2026-07-19T00:00:00Z',
      corrections: [],
      frameStorage: { kind: 'd1-chunks', chunkCount: 999, frameCount: 999 }
    } as FilmAnalysisRecord & { frameStorage: { kind: 'd1-chunks'; chunkCount: number; frameCount: number } };

    const prepared = prepareD1Workspace({ ...createInitialState(), filmAnalyses: [existing, newRevision] }, 2, new Set(['film-existing']));

    expect((prepared.workspace.filmAnalyses[0] as FilmAnalysisRecord & { frameStorage: unknown }).frameStorage).toEqual({ kind: 'd1-chunks', chunkCount: 1, frameCount: 3 });
    expect(prepared.chunks.map((chunk) => chunk.analysisId)).toEqual(['film-new', 'film-new']);
  });
});
