import {
  parseRunHistoryJsonl,
  registerFlueRunHistoryResources,
  type McpResourceServerLike,
  type RunHistoryRecord,
} from '@create-something/flue-service-agent/mcp-resource-core';

export type { McpResourceServerLike } from '@create-something/flue-service-agent/mcp-resource-core';

export const REMOTE_FLUE_RUN_HISTORY_SOURCE = 'd1://TELEMETRY_DB/flue_run_history';
export const DEFAULT_REMOTE_FLUE_RUN_HISTORY_LIMIT = 100;
export const MAX_REMOTE_FLUE_RUN_HISTORY_LIMIT = 500;

export interface D1PreparedStatementLike {
  bind(...values: unknown[]): D1PreparedStatementLike;
  all<T = unknown>(): Promise<{ results?: T[] }>;
}

export interface D1DatabaseLike {
  prepare(query: string): D1PreparedStatementLike;
}

export interface RemoteFlueRunHistoryOptions {
  historyPath?: string;
  listLimit?: number;
  queryLimit?: number;
}

interface RemoteFlueRunHistoryRow {
  record_json: unknown;
}

function normalizeQueryLimit(limit = DEFAULT_REMOTE_FLUE_RUN_HISTORY_LIMIT): number {
  if (!Number.isFinite(limit)) return DEFAULT_REMOTE_FLUE_RUN_HISTORY_LIMIT;
  return Math.max(1, Math.min(Math.floor(limit), MAX_REMOTE_FLUE_RUN_HISTORY_LIMIT));
}

function isMissingRunHistoryTableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /no such table/i.test(message) && /\bflue_run_history\b/i.test(message);
}

function rowsToJsonl(rows: RemoteFlueRunHistoryRow[], sourcePath: string): string {
  return rows
    .map((row, index) => {
      if (typeof row.record_json !== 'string' || !row.record_json.trim()) {
        throw new Error(
          `Invalid Flue run-history D1 row at ${sourcePath}:${index + 1}: record_json must be a non-empty string`,
        );
      }
      return row.record_json.trim();
    })
    .join('\n');
}

export async function readRemoteFlueRunHistoryRecords(
  db: D1DatabaseLike,
  options: RemoteFlueRunHistoryOptions = {},
): Promise<RunHistoryRecord[]> {
  const sourcePath = options.historyPath ?? REMOTE_FLUE_RUN_HISTORY_SOURCE;
  const limit = normalizeQueryLimit(options.queryLimit);

  try {
    const result = await db
      .prepare(
        `SELECT record_json
         FROM flue_run_history
         ORDER BY checked_at DESC, run_id DESC
         LIMIT ?`,
      )
      .bind(limit)
      .all<RemoteFlueRunHistoryRow>();

    return parseRunHistoryJsonl(rowsToJsonl(result.results ?? [], sourcePath), sourcePath);
  } catch (error) {
    if (isMissingRunHistoryTableError(error)) return [];
    throw error;
  }
}

export function registerRemoteFlueRunHistoryResources(
  server: McpResourceServerLike,
  db: D1DatabaseLike,
  options: RemoteFlueRunHistoryOptions = {},
): void {
  const historyPath = options.historyPath ?? REMOTE_FLUE_RUN_HISTORY_SOURCE;

  registerFlueRunHistoryResources(server, {
    historyPath,
    listLimit: options.listLimit,
    loadRecords: () => readRemoteFlueRunHistoryRecords(db, { ...options, historyPath }),
  });
}
