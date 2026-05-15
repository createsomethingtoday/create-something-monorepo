import type { RunHistoryRecord } from '@create-something/flue-service-agent/mcp-resource-core';
import {
  assertFlueRunHistoryRecordGoverned,
  normalizeFlueRunHistoryRecordGovernance,
  type GovernedRunHistoryRecord,
} from './flue-run-history-governance.js';

export const FLUE_RUN_HISTORY_D1_TABLE = 'flue_run_history';

export interface FlueRunHistoryD1Row {
  run_id: string;
  checked_at: string;
  status: RunHistoryRecord['status'];
  deployable: 0 | 1;
  issue: string | null;
  resource_uri: string;
  workflow_name: string;
  deployment_target: RunHistoryRecord['runtime']['deploymentTarget'];
  record_json: string;
}

export interface D1RunPreparedStatementLike {
  bind(...values: unknown[]): D1RunPreparedStatementLike;
  run(): Promise<unknown>;
}

export interface D1WritableDatabaseLike {
  prepare(query: string): D1RunPreparedStatementLike;
}

export function createFlueRunHistoryD1Row(record: RunHistoryRecord): FlueRunHistoryD1Row {
  const governed = normalizeFlueRunHistoryRecordGovernance(record);

  return {
    run_id: governed.runId,
    checked_at: governed.checkedAt,
    status: governed.status,
    deployable: governed.guardrails.deployable ? 1 : 0,
    issue: governed.issue ?? null,
    resource_uri: governed.resourceUri,
    workflow_name: governed.workflow.workflowName,
    deployment_target: governed.runtime.deploymentTarget,
    record_json: JSON.stringify(governed),
  };
}

export function createFlueRunHistoryD1Rows(records: RunHistoryRecord[]): FlueRunHistoryD1Row[] {
  return records.map(createFlueRunHistoryD1Row);
}

function sqlLiteral(value: string | number | null): string {
  if (value === null) return 'NULL';
  if (typeof value === 'number') return String(value);
  return `'${value.replaceAll("'", "''")}'`;
}

function rowValues(row: FlueRunHistoryD1Row): string {
  return [
    row.run_id,
    row.checked_at,
    row.status,
    row.deployable,
    row.issue,
    row.resource_uri,
    row.workflow_name,
    row.deployment_target,
    row.record_json,
  ]
    .map(sqlLiteral)
    .join(', ');
}

export function createFlueRunHistoryUpsertSql(records: RunHistoryRecord[]): string {
  const rows = createFlueRunHistoryD1Rows(records);
  if (rows.length === 0) return '';

  const values = rows.map((row) => `  (${rowValues(row)})`).join(',\n');

  return `INSERT INTO ${FLUE_RUN_HISTORY_D1_TABLE} (
  run_id,
  checked_at,
  status,
  deployable,
  issue,
  resource_uri,
  workflow_name,
  deployment_target,
  record_json
) VALUES
${values}
ON CONFLICT(run_id) DO UPDATE SET
  checked_at = excluded.checked_at,
  status = excluded.status,
  deployable = excluded.deployable,
  issue = excluded.issue,
  resource_uri = excluded.resource_uri,
  workflow_name = excluded.workflow_name,
  deployment_target = excluded.deployment_target,
  record_json = excluded.record_json;
`;
}

export function createFlueRunHistoryCountSql(records: RunHistoryRecord[]): string {
  const runIds = [...new Set(records.map((record) => record.runId))];
  if (runIds.length === 0) {
    return `SELECT COUNT(*) AS matching_count FROM ${FLUE_RUN_HISTORY_D1_TABLE} WHERE 1 = 0;`;
  }

  return `SELECT COUNT(*) AS matching_count
FROM ${FLUE_RUN_HISTORY_D1_TABLE}
WHERE run_id IN (${runIds.map(sqlLiteral).join(', ')});`;
}

export async function upsertFlueRunHistoryRecord(
  db: D1WritableDatabaseLike,
  record: RunHistoryRecord,
): Promise<GovernedRunHistoryRecord> {
  const governed = assertFlueRunHistoryRecordGoverned(record);
  const row = createFlueRunHistoryD1Row(governed);

  await db
    .prepare(
      `INSERT INTO ${FLUE_RUN_HISTORY_D1_TABLE} (
        run_id,
        checked_at,
        status,
        deployable,
        issue,
        resource_uri,
        workflow_name,
        deployment_target,
        record_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(run_id) DO UPDATE SET
        checked_at = excluded.checked_at,
        status = excluded.status,
        deployable = excluded.deployable,
        issue = excluded.issue,
        resource_uri = excluded.resource_uri,
        workflow_name = excluded.workflow_name,
        deployment_target = excluded.deployment_target,
        record_json = excluded.record_json`,
    )
    .bind(
      row.run_id,
      row.checked_at,
      row.status,
      row.deployable,
      row.issue,
      row.resource_uri,
      row.workflow_name,
      row.deployment_target,
      row.record_json,
    )
    .run();

  return governed;
}
