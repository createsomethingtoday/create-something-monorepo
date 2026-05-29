import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const MOCK_D1_MAX_BOUND_VALUES = 100;

function sqliteEscape(value: unknown): string {
  if (value == null) return 'NULL';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL';
  if (typeof value === 'boolean') return value ? '1' : '0';
  return `'${String(value).replace(/'/g, "''")}'`;
}

function bindSql(sql: string, values: unknown[]): string {
  let rendered = sql;
  values.forEach((value, index) => {
    rendered = rendered.replace(new RegExp(`\\?${index + 1}(?!\\d)`, 'g'), sqliteEscape(value));
  });
  let cursor = 0;
  return rendered.replace(/\?(?!\d)/g, () => sqliteEscape(values[cursor++]));
}

function runSqlite(dbPath: string, sql: string, json = false) {
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
    if (values.length > MOCK_D1_MAX_BOUND_VALUES) {
      throw new Error(`D1_ERROR: too many SQL variables: ${values.length} > ${MOCK_D1_MAX_BOUND_VALUES}`);
    }
    return new MockPreparedStatement(this.dbPath, this.sql, values);
  }

  async first<T>(): Promise<T | null> {
    const rows = runSqlite(this.dbPath, bindSql(this.sql, this.values), true) as T[];
    return rows[0] ?? null;
  }

  async all<T>(): Promise<{ results: T[] }> {
    return { results: runSqlite(this.dbPath, bindSql(this.sql, this.values), true) as T[] };
  }

  async run() {
    runSqlite(this.dbPath, bindSql(this.sql, this.values));
    return { success: true, meta: { changes: 0, last_row_id: 0 } };
  }
}

class MockD1Database {
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

  async exec(sql: string) {
    runSqlite(this.dbPath, sql);
    return { success: true };
  }

  close() {
    rmSync(dirname(this.dbPath), { recursive: true, force: true });
  }
}

function applyMigrations(dbPath: string) {
  const supportDir = dirname(fileURLToPath(import.meta.url));
  const migrationsDir = join(supportDir, '..', '..', 'migrations');
  const files = readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();
  for (const file of files) {
    runSqlite(dbPath, readFileSync(join(migrationsDir, file), 'utf8'));
  }
}

export function createTestD1(): D1Database {
  const dir = mkdtempSync(join(tmpdir(), 'webflow-template-search-d1-'));
  const dbPath = join(dir, 'test.sqlite');
  runSqlite(dbPath, '');
  applyMigrations(dbPath);
  return new MockD1Database(dbPath) as unknown as D1Database;
}

export function closeTestD1(db: D1Database): void {
  (db as unknown as MockD1Database).close();
}
