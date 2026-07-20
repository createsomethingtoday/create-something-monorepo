import { describe, expect, it } from 'vitest';
import { capturedFilmAnalysisSchema } from './film.js';
import { createInitialState } from './model.js';
import { exportFilmAnalysisFromWorkspace } from './film-export.js';

describe('film analysis export', () => {
  it('exports one exact source revision without datastore record metadata', () => {
    const sourceSha256 = 'a'.repeat(64);
    const analysis = {
      version: 1 as const,
      source: {
        sha256: sourceSha256,
        durationMs: 2_000,
        width: 1_920,
        height: 1_080,
        fps: 30,
        byteSize: 1_000,
        linkedPath: '/private/game.mp4'
      },
      profile: 'guard-player-trace-v1' as const,
      analysis: { revision: 1 as const, executionCount: 1 as const, analyzedAt: '2026-07-20T00:00:00Z' },
      frames: [
        { timeMs: 0, targetStatus: 'unresolved' as const, players: [] },
        { timeMs: 1_000, targetStatus: 'resolved' as const, players: [{ trackId: 'p-1', team: 'target' as const, court: [10, 20] as [number, number], confidence: 0.9 }] }
      ]
    };
    const workspace = {
      ...createInitialState(),
      revision: 7,
      filmAnalyses: [{
        ...analysis,
        id: 'analysis-1',
        playerId: 'developing-guard',
        title: 'Private game / #13',
        createdAt: '2026-07-20T00:00:00Z',
        corrections: [{
          id: 'correction-1',
          timeMs: 1_000,
          trackId: 'p-1',
          targetStatus: 'resolved' as const,
          court: [11, 21] as [number, number],
          reason: 'Direct source review.',
          createdAt: '2026-07-20T00:01:00Z'
        }]
      }]
    };

    const result = exportFilmAnalysisFromWorkspace(workspace, { sourceSha256, revision: 1 });

    expect(result.analysis).toEqual(capturedFilmAnalysisSchema.parse(analysis));
    expect(result.corrections).toHaveLength(1);
    expect(result.receipt).toMatchObject({
      profile: 'guard-film-analysis-export-v1',
      workspaceRevision: 7,
      sourceSha256,
      analysisRevision: 1,
      analysisExecutionCount: 1,
      frameCount: 2,
      correctionCount: 1
    });
    expect(result.analysis).not.toHaveProperty('id');
    expect(result.analysis).not.toHaveProperty('playerId');
    expect(result.receipt.analysisSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(result.receipt.correctionsSha256).toMatch(/^[a-f0-9]{64}$/);
  });
});
