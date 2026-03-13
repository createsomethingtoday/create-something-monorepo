import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

function sqliteEscape(value: unknown): string {
  if (value == null) return 'NULL';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL';
  if (typeof value === 'boolean') return value ? '1' : '0';
  return `'${String(value).replace(/'/g, "''")}'`;
}

function bindSql(sql: string, values: unknown[]): string {
  let rendered = sql;
  values.forEach((value, index) => {
    const positional = new RegExp(`\\?${index + 1}(?!\\d)`, 'g');
    rendered = rendered.replace(positional, sqliteEscape(value));
  });

  let cursor = 0;
  rendered = rendered.replace(/\?(?!\d)/g, () => sqliteEscape(values[cursor++]));
  return rendered;
}

export function runSqlite(dbPath: string, sql: string, json = false) {
  const args = json ? ['-json', '--', dbPath, sql] : ['--', dbPath, sql];
  const output = execFileSync('sqlite3', args, { encoding: 'utf8' });
  return json ? JSON.parse(output || '[]') : output;
}

class MockPreparedStatement {
  constructor(
    private readonly dbPath: string,
    private readonly sql: string,
    private readonly values: unknown[] = [],
  ) {}

  bind(...values: unknown[]) {
    return new MockPreparedStatement(this.dbPath, this.sql, values);
  }

  async first<T>(columnName?: string): Promise<T | null> {
    const rows = runSqlite(this.dbPath, bindSql(this.sql, this.values), true) as Array<Record<string, unknown>>;
    const row = rows[0];
    if (!row) return null;
    if (columnName) {
      return (row[columnName] as T) ?? null;
    }
    return row as T;
  }

  async all<T>(): Promise<{ results: T[] }> {
    const results = runSqlite(this.dbPath, bindSql(this.sql, this.values), true) as T[];
    return { results };
  }

  async run(): Promise<any> {
    runSqlite(this.dbPath, bindSql(this.sql, this.values));
    return {
      success: true,
      meta: {
        changed_db: true,
        changes: 0,
        duration: 0,
        last_row_id: 0,
        rows_read: 0,
        rows_written: 0,
        served_by: 'test',
      },
    };
  }
}

export class MockD1Database {
  constructor(readonly dbPath: string) {}

  prepare(sql: string) {
    return new MockPreparedStatement(this.dbPath, sql);
  }

  async batch(statements: Array<ReturnType<MockD1Database['prepare']>>) {
    const results = [];
    for (const statement of statements) {
      results.push(await statement.run());
    }
    return results;
  }

  async exec(sql: string): Promise<any> {
    runSqlite(this.dbPath, sql);
    return { count: 0, duration: 0 };
  }
}

export function applyRemoteMigrations(dbPath: string) {
  const supportDir = dirname(fileURLToPath(import.meta.url));
  const migrationsDir = join(supportDir, '..', '..', 'migrations');
  const files = readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const file of files) {
    runSqlite(dbPath, readFileSync(join(migrationsDir, file), 'utf8'));
  }
}

export function createTestD1(): MockD1Database {
  const dir = mkdtempSync(join(tmpdir(), 'loom-remote-d1-'));
  const dbPath = join(dir, 'test.sqlite');
  runSqlite(dbPath, '');
  applyRemoteMigrations(dbPath);
  return new MockD1Database(dbPath);
}
