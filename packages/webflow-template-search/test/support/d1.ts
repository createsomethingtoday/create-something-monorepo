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

  batchSql() {
    return `${bindSql(this.sql, this.values)}; SELECT changes() AS changes, last_insert_rowid() AS last_row_id;`;
  }

  async run() {
    const rows = runSqlite(
      this.dbPath,
      this.batchSql(),
      true,
    ) as Array<{ changes: number; last_row_id: number }>;
    return { success: true, meta: rows[0] };
  }
}

class MockD1Database {
  constructor(readonly dbPath: string) {}

  prepare(sql: string) {
    return new MockPreparedStatement(this.dbPath, sql);
  }

  async batch(statements: Array<ReturnType<MockD1Database['prepare']>>) {
    if (statements.length === 0) return [];
    // Keep a batch in one process/transaction instead of paying process startup
    // and durable commit costs for every fixture row. -bail stops on errors;
    // closing that connection rolls back the incomplete transaction.
    const output = execFileSync('sqlite3', ['-json', '-bail', '--', this.dbPath], {
      encoding: 'utf8',
      input: ['BEGIN;', ...statements.map((statement) => statement.batchSql()), 'COMMIT;'].join('\n'),
    });
    return output.trim().split('\n').map((line) => ({
      success: true,
      meta: (JSON.parse(line) as Array<{ changes: number; last_row_id: number }>)[0],
    }));
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
