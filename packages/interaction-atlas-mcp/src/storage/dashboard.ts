import type { D1Database } from '@create-something/mcp-core';
import type { AtlasEntityType } from './versions.js';

type CountRow = { count: number | string | null };
type GroupCountRow = { key: string | null; count: number | string | null };

function nowEpochSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

function toCount(value: number | string | null | undefined): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function parseSummaryJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function scalarCount(db: D1Database, sql: string, bindings: Array<string | number>): Promise<number> {
  const row = await db.prepare(sql).bind(...bindings).first<CountRow>();
  return toCount(row?.count);
}

async function groupedCounts(db: D1Database, sql: string, bindings: Array<string | number>): Promise<Record<string, number>> {
  const result = await db.prepare(sql).bind(...bindings).all<GroupCountRow>();
  const out: Record<string, number> = {};
  for (const row of result.results) {
    const key = row.key ?? 'unknown';
    out[key] = toCount(row.count);
  }
  return out;
}

function withDefaults(source: Record<string, number>, keys: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const key of keys) out[key] = source[key] ?? 0;
  return out;
}

export interface JudgmentDashboardSummaryInput {
  accountId: string;
  entityType?: AtlasEntityType;
  entityId?: string;
  recentLimit?: number;
}

export interface JudgmentDashboardSummary {
  accountId: string;
  generatedAt: number;
  scope: { level: 'account' } | { level: 'entity'; entity_type: AtlasEntityType; entity_id: string };
  policies: {
    versionsTotal: number;
    entitiesTracked: number;
    activeSelections: number;
    byStatus: Record<string, number>;
  };
  estimates: {
    reportsTotal: number;
    reports24h: number;
    latest: Array<{
      id: string;
      entity_type: AtlasEntityType;
      entity_id: string;
      before_policy_version_id: string | null;
      after_policy_version_id: string;
      summary: unknown;
      created_at: number;
    }>;
  };
  automations: {
    activeContracts: number;
    byStatus: Record<string, number>;
    byExecutionMode: Record<string, number>;
    latest: Array<{
      automation_id: string;
      name: string;
      status: string;
      execution_mode: string;
      approval_mode: string;
      trigger_type: string;
      version: number;
      created_at: number;
    }>;
  };
  runs: {
    total: number;
    last24h: number;
    failed24h: number;
    awaitingApproval: number;
    byState: Record<string, number>;
  };
  approvals: {
    pending: number;
    byState: Record<string, number>;
    latestPending: Array<{
      approval_id: string;
      run_id: string;
      automation_id: string;
      action_type: string;
      reason: string | null;
      requested_at: number;
      expires_at: number | null;
    }>;
  };
}

export async function getJudgmentDashboardSummary(
  db: D1Database | undefined,
  input: JudgmentDashboardSummaryInput,
): Promise<JudgmentDashboardSummary> {
  const generatedAt = nowEpochSeconds();
  const recentLimit = Math.max(1, Math.min(25, Math.floor(input.recentLimit ?? 10)));
  const scope =
    input.entityType && input.entityId
      ? ({ level: 'entity', entity_type: input.entityType, entity_id: input.entityId } as const)
      : ({ level: 'account' } as const);

  if (!db) {
    return {
      accountId: input.accountId,
      generatedAt,
      scope,
      policies: {
        versionsTotal: 0,
        entitiesTracked: 0,
        activeSelections: 0,
        byStatus: { draft: 0, active: 0, archived: 0 },
      },
      estimates: { reportsTotal: 0, reports24h: 0, latest: [] },
      automations: {
        activeContracts: 0,
        byStatus: { enabled: 0, disabled: 0, paused: 0, archived: 0 },
        byExecutionMode: { direct: 0, guided: 0, autonomous: 0 },
        latest: [],
      },
      runs: {
        total: 0,
        last24h: 0,
        failed24h: 0,
        awaitingApproval: 0,
        byState: { queued: 0, running: 0, awaiting_approval: 0, completed: 0, failed: 0, terminated: 0, cancelled: 0 },
      },
      approvals: {
        pending: 0,
        byState: { pending: 0, approved: 0, denied: 0, expired: 0, cancelled: 0 },
        latestPending: [],
      },
    };
  }

  const hasEntityScope = scope.level === 'entity';
  const policyWhere = hasEntityScope
    ? `account_id = ? AND entity_type = ? AND entity_id = ?`
    : `account_id = ?`;
  const policyBindings = hasEntityScope
    ? [input.accountId, scope.entity_type, scope.entity_id]
    : [input.accountId];
  const reportsWhere = hasEntityScope
    ? `account_id = ? AND entity_type = ? AND entity_id = ?`
    : `account_id = ?`;
  const reportsBindings = hasEntityScope
    ? [input.accountId, scope.entity_type, scope.entity_id]
    : [input.accountId];
  const cutoff24h = generatedAt - 24 * 60 * 60;

  const [versionsTotal, entitiesTracked, activeSelections, policyStatusRaw] = await Promise.all([
    scalarCount(db, `SELECT COUNT(*) AS count FROM judgment_policy_versions WHERE ${policyWhere}`, policyBindings),
    scalarCount(
      db,
      `SELECT COUNT(*) AS count FROM (
         SELECT DISTINCT entity_type, entity_id
         FROM judgment_policy_versions
         WHERE ${policyWhere}
       )`,
      policyBindings,
    ),
    hasEntityScope
      ? scalarCount(
          db,
          `SELECT COUNT(*) AS count
           FROM judgment_policy_selection
           WHERE account_id = ? AND entity_type = ? AND entity_id = ?`,
          [input.accountId, scope.entity_type, scope.entity_id],
        )
      : scalarCount(db, `SELECT COUNT(*) AS count FROM judgment_policy_selection WHERE account_id = ?`, [input.accountId]),
    groupedCounts(
      db,
      `SELECT status AS key, COUNT(*) AS count
       FROM judgment_policy_versions
       WHERE ${policyWhere}
       GROUP BY status`,
      policyBindings,
    ),
  ]);

  const [reportsTotal, reports24h, latestReports] = await Promise.all([
    scalarCount(db, `SELECT COUNT(*) AS count FROM judgment_estimate_reports WHERE ${reportsWhere}`, reportsBindings),
    scalarCount(
      db,
      `SELECT COUNT(*) AS count
       FROM judgment_estimate_reports
       WHERE ${reportsWhere} AND created_at >= ?`,
      [...reportsBindings, cutoff24h],
    ),
    db
      .prepare(
        `SELECT id, entity_type, entity_id, before_policy_version_id, after_policy_version_id, summary_json, created_at
         FROM judgment_estimate_reports
         WHERE ${reportsWhere}
         ORDER BY created_at DESC
         LIMIT ?`,
      )
      .bind(...reportsBindings, recentLimit)
      .all<{
        id: string;
        entity_type: AtlasEntityType;
        entity_id: string;
        before_policy_version_id: string | null;
        after_policy_version_id: string;
        summary_json: string;
        created_at: number;
      }>(),
  ]);

  const [activeContracts, automationStatusRaw, executionModeRaw, latestAutomations] = await Promise.all([
    scalarCount(db, `SELECT COUNT(*) AS count FROM automation_contracts WHERE account_id = ? AND is_active = 1`, [input.accountId]),
    groupedCounts(
      db,
      `SELECT status AS key, COUNT(*) AS count
       FROM automation_contracts
       WHERE account_id = ? AND is_active = 1
       GROUP BY status`,
      [input.accountId],
    ),
    groupedCounts(
      db,
      `SELECT execution_mode AS key, COUNT(*) AS count
       FROM automation_contracts
       WHERE account_id = ? AND is_active = 1
       GROUP BY execution_mode`,
      [input.accountId],
    ),
    db
      .prepare(
        `SELECT automation_id, name, status, execution_mode, approval_mode, trigger_type, version, created_at
         FROM automation_contracts
         WHERE account_id = ? AND is_active = 1
         ORDER BY created_at DESC
         LIMIT ?`,
      )
      .bind(input.accountId, recentLimit)
      .all<{
        automation_id: string;
        name: string;
        status: string;
        execution_mode: string;
        approval_mode: string;
        trigger_type: string;
        version: number;
        created_at: number;
      }>(),
  ]);

  const [runsTotal, runsLast24h, failed24h, awaitingApproval, runStateRaw] = await Promise.all([
    scalarCount(db, `SELECT COUNT(*) AS count FROM automation_runs WHERE account_id = ?`, [input.accountId]),
    scalarCount(
      db,
      `SELECT COUNT(*) AS count
       FROM automation_runs
       WHERE account_id = ? AND created_at >= ?`,
      [input.accountId, cutoff24h],
    ),
    scalarCount(
      db,
      `SELECT COUNT(*) AS count
       FROM automation_runs
       WHERE account_id = ? AND created_at >= ? AND state = 'failed'`,
      [input.accountId, cutoff24h],
    ),
    scalarCount(
      db,
      `SELECT COUNT(*) AS count
       FROM automation_runs
       WHERE account_id = ? AND state = 'awaiting_approval'`,
      [input.accountId],
    ),
    groupedCounts(
      db,
      `SELECT state AS key, COUNT(*) AS count
       FROM automation_runs
       WHERE account_id = ?
       GROUP BY state`,
      [input.accountId],
    ),
  ]);

  const [pendingApprovals, approvalStateRaw, latestPending] = await Promise.all([
    scalarCount(
      db,
      `SELECT COUNT(*) AS count
       FROM approval_requests
       WHERE account_id = ? AND state = 'pending'`,
      [input.accountId],
    ),
    groupedCounts(
      db,
      `SELECT state AS key, COUNT(*) AS count
       FROM approval_requests
       WHERE account_id = ?
       GROUP BY state`,
      [input.accountId],
    ),
    db
      .prepare(
        `SELECT approval_id, run_id, automation_id, action_type, reason, requested_at, expires_at
         FROM approval_requests
         WHERE account_id = ? AND state = 'pending'
         ORDER BY requested_at DESC
         LIMIT ?`,
      )
      .bind(input.accountId, recentLimit)
      .all<{
        approval_id: string;
        run_id: string;
        automation_id: string;
        action_type: string;
        reason: string | null;
        requested_at: number;
        expires_at: number | null;
      }>(),
  ]);

  return {
    accountId: input.accountId,
    generatedAt,
    scope,
    policies: {
      versionsTotal,
      entitiesTracked,
      activeSelections,
      byStatus: withDefaults(policyStatusRaw, ['draft', 'active', 'archived']),
    },
    estimates: {
      reportsTotal,
      reports24h,
      latest: latestReports.results.map((row) => ({
        id: row.id,
        entity_type: row.entity_type,
        entity_id: row.entity_id,
        before_policy_version_id: row.before_policy_version_id,
        after_policy_version_id: row.after_policy_version_id,
        summary: parseSummaryJson(row.summary_json),
        created_at: row.created_at,
      })),
    },
    automations: {
      activeContracts,
      byStatus: withDefaults(automationStatusRaw, ['enabled', 'disabled', 'paused', 'archived']),
      byExecutionMode: withDefaults(executionModeRaw, ['direct', 'guided', 'autonomous']),
      latest: latestAutomations.results,
    },
    runs: {
      total: runsTotal,
      last24h: runsLast24h,
      failed24h,
      awaitingApproval,
      byState: withDefaults(runStateRaw, ['queued', 'running', 'awaiting_approval', 'completed', 'failed', 'terminated', 'cancelled']),
    },
    approvals: {
      pending: pendingApprovals,
      byState: withDefaults(approvalStateRaw, ['pending', 'approved', 'denied', 'expired', 'cancelled']),
      latestPending: latestPending.results,
    },
  };
}
