import { createInitialState, parseAuthoritativeState, parseState, type LabState } from '../model.js';
import type { LabStore } from './store.js';

interface WorkspaceRow {
  revision: number;
  data: string;
}

interface GuardD1Statement {
  bind(...values: unknown[]): GuardD1Statement;
  first<T>(): Promise<T | null>;
  run(): Promise<{ meta: { changes?: number } }>;
}

export interface GuardD1Database {
  prepare(query: string): GuardD1Statement;
}

export class D1LabStore implements LabStore {
  constructor(private readonly db: GuardD1Database) {}

  private async row(): Promise<WorkspaceRow | null> {
    return this.db.prepare('SELECT revision, data FROM guard_workspace WHERE id = 1').first<WorkspaceRow>();
  }

  async read(): Promise<LabState> {
    const row = await this.row();
    return row ? parseAuthoritativeState(row.data) : createInitialState();
  }

  async mutate(transform: (state: LabState) => LabState | Promise<LabState>): Promise<LabState> {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const row = await this.row();
      const current = row ? parseAuthoritativeState(row.data) : createInitialState();
      const next = parseState(JSON.stringify({
        ...await transform(current),
        revision: current.revision + 1
      }));
      const encoded = JSON.stringify(next);
      const result = row
        ? await this.db.prepare('UPDATE guard_workspace SET revision = ?, data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1 AND revision = ?')
          .bind(next.revision, encoded, row.revision).run()
        : await this.db.prepare('INSERT OR IGNORE INTO guard_workspace (id, revision, data) VALUES (1, ?, ?)')
          .bind(next.revision, encoded).run();
      if ((result.meta.changes ?? 0) === 1) return next;
    }
    throw new Error('The durable Guard Lab workspace changed concurrently. Retry the operation.');
  }

  async reset(): Promise<LabState> {
    return this.mutate(() => createInitialState());
  }
}
