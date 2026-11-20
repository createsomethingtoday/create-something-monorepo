import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { readFileSync } from 'node:fs';

export function createTasteDb() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(
    readFileSync(new URL('../../migrations/0001_create_ltd_tables.sql', import.meta.url), 'utf8')
  );
  const migration = new URL('../../migrations/0009_taste_provenance.sql', import.meta.url);
  sqlite.exec(readFileSync(migration, 'utf8'));
  sqlite.exec("INSERT INTO masters(id,slug,name) VALUES('arena-taste','arena-taste','TASTE')");
  class Statement {
    constructor(
      private query: string,
      private values: SQLInputValue[] = []
    ) {}
    bind(...values: unknown[]) {
      return new Statement(this.query, values as SQLInputValue[]);
    }
    async first<T>() {
      return (sqlite.prepare(this.query).get(...this.values) as T | undefined) ?? null;
    }
    async all<T>() {
      return { results: sqlite.prepare(this.query).all(...this.values) as T[], success: true };
    }
    async run() {
      const result = sqlite.prepare(this.query).run(...this.values);
      return { success: true, meta: { changes: Number(result.changes) } };
    }
  }
  const db = {
    prepare: (query: string) => new Statement(query),
    async batch(statements: Statement[]) {
      sqlite.exec('BEGIN');
      try {
        const results = [];
        for (const statement of statements) results.push(await statement.run());
        sqlite.exec('COMMIT');
        return results;
      } catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      }
    }
  };
  return { db, sqlite };
}
