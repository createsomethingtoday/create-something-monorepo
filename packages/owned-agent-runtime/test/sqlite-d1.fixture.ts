import { execFileSync } from 'node:child_process';

export function literal(value: unknown): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return String(value);
  return `'${String(value).replaceAll("'", "''")}'`;
}

export function bindSql(sql: string, values: unknown[]): string {
  let sequential = 0;
  return sql.replace(/\?(\d+)?/g, (_match, numbered: string | undefined) => {
    const index = numbered ? Number(numbered) - 1 : sequential++;
    if (index < 0 || index >= values.length) throw new Error(`Missing SQL binding ${index + 1}`);
    return literal(values[index]);
  });
}

class Statement {
  constructor(
    readonly path: string,
    readonly sql: string,
    readonly values: unknown[] = []
  ) {}
  bind(...values: unknown[]) {
    return new Statement(this.path, this.sql, values);
  }
  bound() {
    return bindSql(this.sql, this.values);
  }
  async first<T>() {
    const output = execFileSync('sqlite3', ['-json', this.path], {
      input: `PRAGMA foreign_keys=ON; ${this.bound()};`,
      encoding: 'utf8'
    }).trim();
    return (output ? (JSON.parse(output) as T[]) : [])[0] ?? null;
  }
  async all<T>() {
    const output = execFileSync('sqlite3', ['-json', this.path], {
      input: `PRAGMA foreign_keys=ON; ${this.bound()};`,
      encoding: 'utf8'
    }).trim();
    return { success: true, results: output ? (JSON.parse(output) as T[]) : [], meta: {} };
  }
}

export function d1(path: string): D1Database {
  return {
    prepare(sql: string) {
      return new Statement(path, sql) as unknown as D1PreparedStatement;
    },
    async batch(statements: D1PreparedStatement[]) {
      const body = statements
        .map((statement) => (statement as unknown as Statement).bound())
        .join(';\n');
      execFileSync('sqlite3', ['-bail', path], {
        input: `PRAGMA foreign_keys=ON; BEGIN IMMEDIATE; ${body}; COMMIT;`,
        encoding: 'utf8'
      });
      return statements.map(() => ({ success: true, meta: { changes: 1 } })) as D1Result<unknown>[];
    }
  } as unknown as D1Database;
}

