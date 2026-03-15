import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

type StatementResult = {
  results?: unknown[];
  success: boolean;
  meta: Record<string, unknown>;
};

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../');

function escapeSqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function toSqlLiteral(value: unknown): string {
  if (value == null) return 'NULL';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL';
  if (typeof value === 'boolean') return value ? '1' : '0';
  return escapeSqlString(String(value));
}

function renderSql(sql: string, params: unknown[]): string {
  let rendered = sql;

  for (let index = params.length - 1; index >= 0; index -= 1) {
    rendered = rendered.replace(new RegExp(`\\?${index + 1}(?!\\d)`, 'g'), toSqlLiteral(params[index]));
  }

  let unnumberedIndex = 0;
  return rendered.replace(/\?(?!\d)/g, () => toSqlLiteral(params[unnumberedIndex++]));
}

function runSqlite(dbPath: string, sql: string): string {
  return execFileSync('sqlite3', [dbPath], {
    encoding: 'utf8',
    input: sql,
  });
}

function runSqliteJson(dbPath: string, sql: string): any[] {
  const output = execFileSync('sqlite3', ['-json', dbPath], {
    encoding: 'utf8',
    input: sql,
  });
  return output.trim() ? JSON.parse(output) : [];
}

class SqliteCliD1PreparedStatement {
  constructor(
    private readonly dbPath: string,
    private readonly sql: string,
    private readonly params: unknown[] = [],
  ) {}

  bind(...params: unknown[]) {
    return new SqliteCliD1PreparedStatement(this.dbPath, this.sql, params);
  }

  toSql(): string {
    return renderSql(this.sql, this.params);
  }

  async first<T>(): Promise<T | null> {
    const rows = runSqliteJson(this.dbPath, this.toSql());
    return (rows[0] as T | undefined) ?? null;
  }

  async all<T>(): Promise<{ results: T[] }> {
    return { results: runSqliteJson(this.dbPath, this.toSql()) as T[] };
  }

  async run(): Promise<StatementResult> {
    runSqlite(this.dbPath, this.toSql());
    const changes = runSqliteJson(this.dbPath, 'SELECT changes() AS changes, last_insert_rowid() AS last_row_id;')[0] ?? {};
    return {
      success: true,
      meta: {
        changes: Number(changes.changes ?? 0),
        last_row_id: Number(changes.last_row_id ?? 0),
      },
    };
  }
}

export class SqliteD1Database {
  readonly dbPath: string;
  private readonly tempDir: string;

  constructor() {
    this.tempDir = mkdtempSync(join(tmpdir(), 'loom-remote-d1-'));
    this.dbPath = join(this.tempDir, 'test.sqlite');
    runSqlite(this.dbPath, 'PRAGMA journal_mode = WAL;');
  }

  prepare(sql: string) {
    return new SqliteCliD1PreparedStatement(this.dbPath, sql);
  }

  async batch(statements: Array<SqliteCliD1PreparedStatement>): Promise<StatementResult[]> {
    if (statements.length === 0) return [];

    runSqlite(
      this.dbPath,
      ['BEGIN TRANSACTION;', ...statements.map((statement) => `${statement.toSql().trim().replace(/;$/, '')};`), 'COMMIT;'].join(
        '\n',
      ),
    );

    return statements.map(() => ({
      success: true,
      meta: {
        changes: 0,
        last_row_id: 0,
      },
    }));
  }

  async exec(sql: string): Promise<void> {
    runSqlite(this.dbPath, sql);
  }

  close(): void {
    rmSync(this.tempDir, { recursive: true, force: true });
  }
}

export function createD1Database(): D1Database {
  return new SqliteD1Database() as unknown as D1Database;
}

export function closeD1Database(db: D1Database): void {
  (db as unknown as SqliteD1Database).close();
}

export async function applyRemoteMigrations(db: D1Database): Promise<void> {
  const migrationDir = join(REPO_ROOT, 'packages/loom-mcp-remote/migrations');
  const files = readdirSync(migrationDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = readFileSync(join(migrationDir, file), 'utf8');
    await (db as unknown as SqliteD1Database).exec(sql);
  }
}
