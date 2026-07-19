import { createInitialState, parseAuthoritativeState, parseState, type FilmAnalysisRecord, type LabState } from '../model.js';
import type { LabStore } from './store.js';

interface WorkspaceRow {
  revision: number;
  data: string;
}

interface GuardD1Statement {
  bind(...values: unknown[]): GuardD1Statement;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<{ results: T[] }>;
  run(): Promise<{ meta: { changes?: number } }>;
}

export interface GuardD1Database {
  prepare(query: string): GuardD1Statement;
}

type FilmChunk = { analysisId: string; chunkIndex: number; framesJson: string };
type StoredFilm = Omit<FilmAnalysisRecord, 'frames'> & {
  frames: [];
  frameStorage: { kind: 'd1-chunks'; chunkCount: number; frameCount: number };
};

export function prepareD1Workspace(state: LabState, framesPerChunk = 40): { workspace: LabState; chunks: FilmChunk[] } {
  const chunks: FilmChunk[] = [];
  const filmAnalyses = state.filmAnalyses.map((analysis) => {
    for (let index = 0; index < analysis.frames.length; index += framesPerChunk) {
      chunks.push({ analysisId: analysis.id, chunkIndex: Math.floor(index / framesPerChunk), framesJson: JSON.stringify(analysis.frames.slice(index, index + framesPerChunk)) });
    }
    return { ...analysis, frames: [], frameStorage: { kind: 'd1-chunks', chunkCount: Math.ceil(analysis.frames.length / framesPerChunk), frameCount: analysis.frames.length } } satisfies StoredFilm;
  });
  return { workspace: { ...state, filmAnalyses }, chunks };
}

export class D1LabStore implements LabStore {
  constructor(private readonly db: GuardD1Database) {}

  private async row(): Promise<WorkspaceRow | null> {
    return this.db.prepare('SELECT revision, data FROM guard_workspace WHERE id = 1').first<WorkspaceRow>();
  }

  private async hydrate(state: LabState): Promise<LabState> {
    const filmAnalyses = await Promise.all(state.filmAnalyses.map(async (analysis) => {
      if (analysis.frames.length) return analysis;
      const storage = (analysis as FilmAnalysisRecord & { frameStorage?: StoredFilm['frameStorage'] }).frameStorage;
      if (!storage || storage.kind !== 'd1-chunks') return analysis;
      const result = await this.db.prepare('SELECT chunk_index, frames_json FROM guard_film_chunks WHERE analysis_id = ? ORDER BY chunk_index').bind(analysis.id).all<{ chunk_index: number; frames_json: string }>();
      if (result.results.length !== storage.chunkCount) throw new Error(`Film analysis ${analysis.id} is missing durable frame chunks.`);
      const frames = result.results.flatMap((row) => JSON.parse(row.frames_json) as FilmAnalysisRecord['frames']);
      if (frames.length !== storage.frameCount) throw new Error(`Film analysis ${analysis.id} has an invalid durable frame count.`);
      return { ...analysis, frames };
    }));
    return { ...state, filmAnalyses };
  }

  private async writeNewFilmChunks(current: LabState, next: LabState) {
    const existingIds = new Set(current.filmAnalyses.map((analysis) => analysis.id));
    const prepared = prepareD1Workspace({ ...next, filmAnalyses: next.filmAnalyses.filter((analysis) => !existingIds.has(analysis.id)) });
    for (const chunk of prepared.chunks) {
      await this.db.prepare('INSERT INTO guard_film_chunks (analysis_id, chunk_index, frames_json) VALUES (?, ?, ?) ON CONFLICT(analysis_id, chunk_index) DO UPDATE SET frames_json = excluded.frames_json')
        .bind(chunk.analysisId, chunk.chunkIndex, chunk.framesJson).run();
    }
  }

  private async deleteRemovedFilmChunks(current: LabState, next: LabState) {
    const nextIds = new Set(next.filmAnalyses.map((analysis) => analysis.id));
    for (const analysis of current.filmAnalyses) {
      if (!nextIds.has(analysis.id)) await this.db.prepare('DELETE FROM guard_film_chunks WHERE analysis_id = ?').bind(analysis.id).run();
    }
  }

  async read(): Promise<LabState> {
    const row = await this.row();
    return row ? this.hydrate(parseAuthoritativeState(row.data)) : createInitialState();
  }

  async mutate(transform: (state: LabState) => LabState | Promise<LabState>): Promise<LabState> {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const row = await this.row();
      const current = row ? await this.hydrate(parseAuthoritativeState(row.data)) : createInitialState();
      const next = parseState(JSON.stringify({
        ...await transform(current),
        revision: current.revision + 1
      }));
      await this.writeNewFilmChunks(current, next);
      const encoded = JSON.stringify(prepareD1Workspace(next).workspace);
      const result = row
        ? await this.db.prepare('UPDATE guard_workspace SET revision = ?, data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1 AND revision = ?')
          .bind(next.revision, encoded, row.revision).run()
        : await this.db.prepare('INSERT OR IGNORE INTO guard_workspace (id, revision, data) VALUES (1, ?, ?)')
          .bind(next.revision, encoded).run();
      if ((result.meta.changes ?? 0) === 1) {
        await this.deleteRemovedFilmChunks(current, next);
        return next;
      }
    }
    throw new Error('The durable Guard Lab workspace changed concurrently. Retry the operation.');
  }

  async reset(): Promise<LabState> {
    return this.mutate(() => createInitialState());
  }
}
