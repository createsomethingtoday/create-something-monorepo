import * as v from 'valibot';
import { runHistoryRecordSchema, type RunHistoryRecord } from './run-history.js';

export type { RunHistoryRecord } from './run-history.js';

export const FLUE_RUN_HISTORY_RESOURCE_URIS = {
  status: 'flue://run-history/status',
  latest: 'flue://run-history/latest',
  list: 'flue://run-history/list',
} as const;

export const DEFAULT_RUN_HISTORY_RESOURCE_SOURCE = '.artifacts/flue-service-agent/run-history.jsonl';

const runHistoryRecordSummarySchema = v.object({
  runId: v.string(),
  resourceUri: v.string(),
  issue: v.optional(v.string()),
  checkedAt: v.string(),
  status: v.picklist(['ready', 'review_required', 'blocked']),
  deployable: v.boolean(),
  workflowName: v.string(),
  deploymentTarget: v.picklist(['node', 'cloudflare']),
});

const runHistoryStatusResourceSchema = v.object({
  schemaVersion: v.literal('flue.run_history_status.v1'),
  resourceUri: v.literal('flue://run-history/status'),
  packageName: v.literal('@create-something/flue-service-agent'),
  sourcePath: v.string(),
  recordCount: v.number(),
  latest: v.optional(runHistoryRecordSummarySchema),
  statusCounts: v.object({
    ready: v.number(),
    review_required: v.number(),
    blocked: v.number(),
  }),
  deployableCount: v.number(),
  missingHistory: v.boolean(),
});

const runHistoryListResourceSchema = v.object({
  schemaVersion: v.literal('flue.run_history_list.v1'),
  resourceUri: v.literal('flue://run-history/list'),
  packageName: v.literal('@create-something/flue-service-agent'),
  sourcePath: v.string(),
  count: v.number(),
  records: v.array(runHistoryRecordSummarySchema),
});

const runHistoryLatestResourceSchema = v.object({
  schemaVersion: v.literal('flue.run_history_latest.v1'),
  resourceUri: v.literal('flue://run-history/latest'),
  packageName: v.literal('@create-something/flue-service-agent'),
  sourcePath: v.string(),
  record: v.optional(runHistoryRecordSchema),
});

export type RunHistoryRecordSummary = v.InferOutput<typeof runHistoryRecordSummarySchema>;
export type RunHistoryStatusResource = v.InferOutput<typeof runHistoryStatusResourceSchema>;
export type RunHistoryListResource = v.InferOutput<typeof runHistoryListResourceSchema>;
export type RunHistoryLatestResource = v.InferOutput<typeof runHistoryLatestResourceSchema>;

export interface FlueRunHistoryResourceOptions {
  historyPath?: string;
  listLimit?: number;
  loadRecords?: () => RunHistoryRecord[] | Promise<RunHistoryRecord[]>;
}

export interface McpResourceResult {
  contents: Array<{
    uri: string;
    mimeType: 'application/json';
    text: string;
  }>;
}

export interface McpResourceServerLike {
  resource(
    name: string,
    uri: string,
    metadata: { description?: string; mimeType?: string },
    handler: (uri: URL) => McpResourceResult | Promise<McpResourceResult>,
  ): void;
}

function parseJsonLine(line: string, path: string, lineNumber: number): RunHistoryRecord {
  try {
    return v.parse(runHistoryRecordSchema, JSON.parse(line));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid Flue run-history JSONL at ${path}:${lineNumber}: ${message}`);
  }
}

export function parseRunHistoryJsonl(text: string, path: string): RunHistoryRecord[] {
  if (!text.trim()) return [];

  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => parseJsonLine(line, path, index + 1));
}

function newestFirst(records: RunHistoryRecord[]): RunHistoryRecord[] {
  return [...records].sort((left, right) => right.checkedAt.localeCompare(left.checkedAt));
}

function summarizeRecord(record: RunHistoryRecord): RunHistoryRecordSummary {
  return v.parse(runHistoryRecordSummarySchema, {
    runId: record.runId,
    resourceUri: record.resourceUri,
    issue: record.issue,
    checkedAt: record.checkedAt,
    status: record.status,
    deployable: record.guardrails.deployable,
    workflowName: record.workflow.workflowName,
    deploymentTarget: record.runtime.deploymentTarget,
  });
}

export function createRunHistoryStatusResource(
  records: RunHistoryRecord[],
  options: FlueRunHistoryResourceOptions = {},
): RunHistoryStatusResource {
  const sorted = newestFirst(records);
  const sourcePath = options.historyPath ?? DEFAULT_RUN_HISTORY_RESOURCE_SOURCE;

  return v.parse(runHistoryStatusResourceSchema, {
    schemaVersion: 'flue.run_history_status.v1',
    resourceUri: FLUE_RUN_HISTORY_RESOURCE_URIS.status,
    packageName: '@create-something/flue-service-agent',
    sourcePath,
    recordCount: records.length,
    latest: sorted[0] ? summarizeRecord(sorted[0]) : undefined,
    statusCounts: {
      ready: records.filter((record) => record.status === 'ready').length,
      review_required: records.filter((record) => record.status === 'review_required').length,
      blocked: records.filter((record) => record.status === 'blocked').length,
    },
    deployableCount: records.filter((record) => record.guardrails.deployable).length,
    missingHistory: records.length === 0,
  });
}

export function createRunHistoryListResource(
  records: RunHistoryRecord[],
  options: FlueRunHistoryResourceOptions = {},
): RunHistoryListResource {
  const limit = options.listLimit ?? 20;
  const sourcePath = options.historyPath ?? DEFAULT_RUN_HISTORY_RESOURCE_SOURCE;
  const summaries = newestFirst(records).slice(0, limit).map(summarizeRecord);

  return v.parse(runHistoryListResourceSchema, {
    schemaVersion: 'flue.run_history_list.v1',
    resourceUri: FLUE_RUN_HISTORY_RESOURCE_URIS.list,
    packageName: '@create-something/flue-service-agent',
    sourcePath,
    count: summaries.length,
    records: summaries,
  });
}

export function createRunHistoryLatestResource(
  records: RunHistoryRecord[],
  options: FlueRunHistoryResourceOptions = {},
): RunHistoryLatestResource {
  const latest = newestFirst(records)[0];

  return v.parse(runHistoryLatestResourceSchema, {
    schemaVersion: 'flue.run_history_latest.v1',
    resourceUri: FLUE_RUN_HISTORY_RESOURCE_URIS.latest,
    packageName: '@create-something/flue-service-agent',
    sourcePath: options.historyPath ?? DEFAULT_RUN_HISTORY_RESOURCE_SOURCE,
    record: latest,
  });
}

function jsonResource(uri: URL, value: unknown): McpResourceResult {
  return {
    contents: [
      {
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify(value, null, 2),
      },
    ],
  };
}

async function loadRecords(options: FlueRunHistoryResourceOptions): Promise<RunHistoryRecord[]> {
  return options.loadRecords ? await options.loadRecords() : [];
}

export function registerFlueRunHistoryResources(
  server: McpResourceServerLike,
  options: FlueRunHistoryResourceOptions = {},
): void {
  const historyPath = options.historyPath ?? DEFAULT_RUN_HISTORY_RESOURCE_SOURCE;

  server.resource(
    'flue-run-history-status',
    FLUE_RUN_HISTORY_RESOURCE_URIS.status,
    {
      description: 'Aggregate readiness status for Flue service-agent run history',
      mimeType: 'application/json',
    },
    async (uri) => {
      const records = await loadRecords(options);
      return jsonResource(uri, createRunHistoryStatusResource(records, { ...options, historyPath }));
    },
  );

  server.resource(
    'flue-run-history-latest',
    FLUE_RUN_HISTORY_RESOURCE_URIS.latest,
    {
      description: 'Latest Flue service-agent run-history record',
      mimeType: 'application/json',
    },
    async (uri) => {
      const records = await loadRecords(options);
      return jsonResource(uri, createRunHistoryLatestResource(records, { ...options, historyPath }));
    },
  );

  server.resource(
    'flue-run-history-list',
    FLUE_RUN_HISTORY_RESOURCE_URIS.list,
    {
      description: 'Recent Flue service-agent run-history records',
      mimeType: 'application/json',
    },
    async (uri) => {
      const records = await loadRecords(options);
      return jsonResource(uri, createRunHistoryListResource(records, { ...options, historyPath }));
    },
  );
}
