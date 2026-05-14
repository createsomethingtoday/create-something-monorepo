import type { RunHistoryRecord } from '@create-something/flue-service-agent/mcp-resource-core';

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

export function createFlueRunHistoryD1Row(record: RunHistoryRecord): FlueRunHistoryD1Row {
  return {
    run_id: record.runId,
    checked_at: record.checkedAt,
    status: record.status,
    deployable: record.guardrails.deployable ? 1 : 0,
    issue: record.issue ?? null,
    resource_uri: record.resourceUri,
    workflow_name: record.workflow.workflowName,
    deployment_target: record.runtime.deploymentTarget,
    record_json: JSON.stringify(record),
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
