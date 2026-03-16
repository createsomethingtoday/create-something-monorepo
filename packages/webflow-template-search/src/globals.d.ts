interface D1ResultMeta {
  changes?: number;
  last_row_id?: number;
}

interface D1Result<T = unknown> {
  results?: T[];
  success?: boolean;
  meta?: D1ResultMeta;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(): Promise<T | null>;
  all<T = unknown>(): Promise<{ results: T[] }>;
  run(): Promise<D1Result>;
}

interface D1Database {
  prepare(sql: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<D1Result[]>;
  exec(sql: string): Promise<unknown>;
}

interface ScheduledController {
  cron: string;
  scheduledTime: number;
}
