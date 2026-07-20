import { describe, expect, it } from 'vitest';
import { captureFilmAnalysis } from '../film.js';
import { createInitialState, type FilmAnalysisRecord } from '../model.js';
import { D1LabStore, prepareD1Workspace, type GuardD1Database } from './d1-store.js';

class ContendedD1 implements GuardD1Database {
  row = { revision: 0, data: JSON.stringify(createInitialState('2026-07-20T00:00:00.000Z')) };
  chunks = new Map<string, string>();
  failNextCas = true;

  prepare(query: string) {
    const database = this;
    let values: unknown[] = [];
    return {
      bind(...nextValues: unknown[]) { values = nextValues; return this; },
      async first<T>() {
        if (query.startsWith('SELECT revision, data')) return database.row as T;
        throw new Error(`Unexpected first query: ${query}`);
      },
      async all<T>() {
        if (!query.startsWith('SELECT chunk_index')) throw new Error(`Unexpected all query: ${query}`);
        const analysisId = String(values[0]);
        return { results: [...database.chunks.entries()].filter(([key]) => key.startsWith(`${analysisId}:`)).map(([key, frames_json]) => ({ chunk_index: Number(key.split(':')[1]), frames_json }) as T) };
      },
      async run() {
        if (query.startsWith('INSERT INTO guard_film_chunks')) {
          database.chunks.set(`${String(values[0])}:${Number(values[1])}`, String(values[2]));
          return { meta: { changes: 1 } };
        }
        if (query.startsWith('DELETE FROM guard_film_chunks')) {
          const analysisId = String(values[0]);
          for (const key of database.chunks.keys()) if (key.startsWith(`${analysisId}:`)) database.chunks.delete(key);
          return { meta: { changes: 1 } };
        }
        if (query.startsWith('UPDATE guard_workspace')) {
          if (database.failNextCas) {
            database.failNextCas = false;
            database.row = { revision: 1, data: JSON.stringify({ ...createInitialState('2026-07-20T00:00:00.000Z'), revision: 1 }) };
            return { meta: { changes: 0 } };
          }
          database.row = { revision: Number(values[0]), data: String(values[1]) };
          return { meta: { changes: 1 } };
        }
        throw new Error(`Unexpected run query: ${query}`);
      }
    };
  }
}

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

  it('removes chunks from a failed workspace compare-and-swap before retrying', async () => {
    const database = new ContendedD1();
    const store = new D1LabStore(database);
    const analysis = captureFilmAnalysis({
      source: { sha256: 'f'.repeat(64), durationMs: 3000, width: 1920, height: 1080, fps: 30, byteSize: 1000, linkedPath: '/private/game.mp4' },
      frames: Array.from({ length: 3 }, (_, timeMs) => ({ timeMs: timeMs * 1000, players: [] }))
    });
    let attempt = 0;

    await store.mutate((state) => {
      attempt += 1;
      const record = { ...analysis, id: `film-attempt-${attempt}`, playerId: 'developing-guard', title: 'Game', createdAt: '2026-07-20T00:00:00Z', corrections: [] } satisfies FilmAnalysisRecord;
      return { ...state, filmAnalyses: [record] };
    });

    expect(attempt).toBe(2);
    expect([...database.chunks.keys()]).toEqual(['film-attempt-2:0']);
  });
});
