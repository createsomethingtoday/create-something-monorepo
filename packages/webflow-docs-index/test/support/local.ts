import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

import type { DocsVersion, Embedder, Sql, VectorRecord, VectorStore } from '../../src/types.js';

/** The D1 schema on an in-memory SQLite database, behind the same interface the Worker uses. */
export function createLocalSql(schema?: string): Sql & { db: DatabaseSync } {
  const db = new DatabaseSync(':memory:');
  db.exec(schema ?? readFileSync(new URL('../../migrations/0001_init.sql', import.meta.url), 'utf8'));
  return {
    db,
    async all<T>(sql: string, params: unknown[] = []) {
      return db.prepare(sql).all(...(params as never[])) as T[];
    },
    async batch(statements) {
      db.exec('BEGIN');
      try {
        for (const statement of statements) db.prepare(statement.sql).run(...((statement.params ?? []) as never[]));
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
  };
}

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let index = 0; index < a.length; index += 1) {
    dot += a[index] * b[index];
    normA += a[index] * a[index];
    normB += b[index] * b[index];
  }
  return normA && normB ? dot / Math.sqrt(normA * normB) : 0;
}

/** Exact nearest-neighbour search in memory, in place of Vectorize. */
export function createMemoryVectors(): VectorStore & { records: Map<string, VectorRecord> } {
  const records = new Map<string, VectorRecord>();
  return {
    records,
    async upsert(vectors) {
      for (const vector of vectors) records.set(vector.id, vector);
    },
    async deleteByIds(ids) {
      for (const id of ids) records.delete(id);
    },
    async query(values, options) {
      const versions = new Set<DocsVersion>(options.versions);
      return [...records.values()]
        .filter((record) => versions.has(record.version))
        .map((record) => ({ id: record.id, score: cosine(values, record.values) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, options.topK);
    },
  };
}

/** A deterministic stand-in for the embedding model: texts that share words get near vectors. */
export function createWordHashEmbedder(dimensions = 96): Embedder & { calls: number } {
  const embedder = {
    calls: 0,
    async embed(texts: string[]) {
      embedder.calls += 1;
      return texts.map((text) => {
        const vector = Array.from({ length: dimensions }, () => 0);
        for (const word of text.toLowerCase().match(/[a-z0-9]+/g) ?? []) {
          let hash = 2166136261;
          for (let index = 0; index < word.length; index += 1) hash = Math.imul(hash ^ word.charCodeAt(index), 16777619);
          vector[Math.abs(hash) % dimensions] += 1;
        }
        return vector;
      });
    },
  };
  return embedder;
}
