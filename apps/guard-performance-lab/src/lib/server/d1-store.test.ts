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
    expect(prepared.chunks).toHaveLength(3);
    expect(prepared.chunks.map((chunk) => JSON.parse(chunk.framesJson).length)).toEqual([100, 100, 50]);
    expect(Math.max(...prepared.chunks.map((chunk) => Buffer.byteLength(chunk.framesJson)))).toBeLessThan(500_000);
  });
});
