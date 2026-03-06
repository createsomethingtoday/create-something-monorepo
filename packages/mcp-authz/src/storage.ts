import type {
  AuthzDecisionEventRecord,
  AuthzEventCompat,
  AuthzMetricsSummary,
  AuthzRolloutCompat,
  AuthzRolloutRow,
  AuthzScope,
  PolicyManifest,
  SqlDatabase,
} from './types.js';

const DEFAULT_MISMATCH_THRESHOLD = 0.005;
const DEFAULT_FALLBACK_RATE_THRESHOLD = 0.01;

function nowEpochSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

function toNumber(value: number | string | null | undefined): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function normalizePercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.floor(value)));
}

function normalizeRate(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(1, value));
}

export function buildAuthzScopeKey(scope: AuthzScope): string {
  if (scope.scopeType === 'policy') {
    return `policy:${scope.policyId}`;
  }
  return `entity:${scope.accountId}:${scope.entityType}:${scope.entityId}:${scope.policyId}`;
}

export function defaultAuthzRollout(scope: AuthzScope, manifest: PolicyManifest): AuthzRolloutRow {
  return {
    scopeKey: buildAuthzScopeKey(scope),
    scopeType: scope.scopeType,
    policyId: scope.policyId,
    accountId: scope.scopeType === 'entity' ? scope.accountId : scope.accountId ?? null,
    entityType: scope.scopeType === 'entity' ? scope.entityType : null,
    entityId: scope.scopeType === 'entity' ? scope.entityId : null,
    mode: manifest.rolloutDefaults?.mode ?? 'legacy_enforce',
    canaryPercent: normalizePercent(manifest.rolloutDefaults?.canaryPercent ?? 0),
    mismatchThreshold: normalizeRate(
      manifest.rolloutDefaults?.mismatchThreshold ?? DEFAULT_MISMATCH_THRESHOLD,
      DEFAULT_MISMATCH_THRESHOLD,
    ),
    fallbackRateThreshold: normalizeRate(
      manifest.rolloutDefaults?.fallbackRateThreshold ?? DEFAULT_FALLBACK_RATE_THRESHOLD,
      DEFAULT_FALLBACK_RATE_THRESHOLD,
    ),
    updatedBy: 'system',
    updatedAt: nowEpochSeconds(),
  };
}

export async function ensureAuthzTables(db: SqlDatabase): Promise<void> {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS authz_policy_rollouts (
         scope_key TEXT PRIMARY KEY,
         scope_type TEXT NOT NULL CHECK (scope_type IN ('policy', 'entity')),
         policy_id TEXT NOT NULL,
         account_id TEXT,
         entity_type TEXT,
         entity_id TEXT,
         mode TEXT NOT NULL CHECK (mode IN ('legacy_enforce', 'shadow', 'polar_enforce')) DEFAULT 'legacy_enforce',
         canary_percent INTEGER NOT NULL DEFAULT 0,
         mismatch_threshold REAL NOT NULL DEFAULT 0.005,
         fallback_rate_threshold REAL NOT NULL DEFAULT 0.01,
         updated_by TEXT NOT NULL,
         updated_at INTEGER NOT NULL DEFAULT (unixepoch())
       )`,
    )
    .run();

  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS authz_decision_events (
         id TEXT PRIMARY KEY,
         scope_key TEXT NOT NULL,
         scope_type TEXT NOT NULL CHECK (scope_type IN ('policy', 'entity')),
         policy_id TEXT NOT NULL,
         account_id TEXT,
         tenant_id TEXT,
         entity_type TEXT,
         entity_id TEXT,
         actor_id TEXT,
         actor_role TEXT,
         action_name TEXT NOT NULL,
         resource_kind TEXT NOT NULL,
         resource_id TEXT,
         resource_access_type TEXT,
         rollout_mode TEXT NOT NULL,
         canary_percent INTEGER NOT NULL,
         sampled_polar INTEGER NOT NULL,
         mismatch INTEGER NOT NULL,
         evaluation_path TEXT NOT NULL,
         fallback_used INTEGER NOT NULL,
         fallback_reason TEXT,
         legacy_decision TEXT NOT NULL,
         polar_decision TEXT NOT NULL,
         final_decision TEXT NOT NULL,
         matched_rule_ids_json TEXT NOT NULL,
         reason TEXT NOT NULL,
         policy_hash TEXT,
         compiler_version TEXT,
         correlation_id TEXT,
         metadata_json TEXT NOT NULL DEFAULT '{}',
         created_at INTEGER NOT NULL DEFAULT (unixepoch())
       )`,
    )
    .run();

  await db
    .prepare(
      `CREATE INDEX IF NOT EXISTS idx_authz_decision_events_scope_time
         ON authz_decision_events (scope_key, created_at DESC)`,
    )
    .run();

  await db
    .prepare(
      `CREATE INDEX IF NOT EXISTS idx_authz_decision_events_account_time
         ON authz_decision_events (account_id, created_at DESC)`,
    )
    .run();

  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS authz_policy_drafts (
         id TEXT PRIMARY KEY,
         policy_id TEXT NOT NULL,
         account_id TEXT,
         entity_type TEXT,
         entity_id TEXT,
         status TEXT NOT NULL DEFAULT 'draft',
         draft_json TEXT NOT NULL,
         created_by TEXT NOT NULL,
         created_at INTEGER NOT NULL DEFAULT (unixepoch())
       )`,
    )
    .run();
}

export async function getAuthzRollout(
  db: SqlDatabase | undefined,
  scope: AuthzScope,
  manifest: PolicyManifest,
  compat?: AuthzRolloutCompat,
): Promise<AuthzRolloutRow> {
  const fallback = defaultAuthzRollout(scope, manifest);
  if (!db) return fallback;

  await ensureAuthzTables(db);
  const row = await db
    .prepare(
      `SELECT scope_key, scope_type, policy_id, account_id, entity_type, entity_id, mode, canary_percent, mismatch_threshold, fallback_rate_threshold, updated_by, updated_at
       FROM authz_policy_rollouts
       WHERE scope_key = ?
       LIMIT 1`,
    )
    .bind(buildAuthzScopeKey(scope))
    .first<{
      scope_key: string;
      scope_type: AuthzRolloutRow['scopeType'];
      policy_id: string;
      account_id: string | null;
      entity_type: string | null;
      entity_id: string | null;
      mode: AuthzRolloutRow['mode'];
      canary_percent: number;
      mismatch_threshold: number;
      fallback_rate_threshold: number;
      updated_by: string;
      updated_at: number;
    }>();

  if (row) {
    return {
      scopeKey: row.scope_key,
      scopeType: row.scope_type,
      policyId: row.policy_id,
      accountId: row.account_id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      mode: row.mode,
      canaryPercent: normalizePercent(row.canary_percent),
      mismatchThreshold: normalizeRate(row.mismatch_threshold, DEFAULT_MISMATCH_THRESHOLD),
      fallbackRateThreshold: normalizeRate(row.fallback_rate_threshold, DEFAULT_FALLBACK_RATE_THRESHOLD),
      updatedBy: row.updated_by,
      updatedAt: toNumber(row.updated_at),
    };
  }

  if (compat?.readLegacyRollout) {
    const legacy = await compat.readLegacyRollout(db, scope);
    if (legacy) return legacy;
  }

  return fallback;
}

export async function setAuthzRollout(
  db: SqlDatabase | undefined,
  row: AuthzRolloutRow,
  compat?: AuthzRolloutCompat,
): Promise<AuthzRolloutRow> {
  if (!db) return row;

  await ensureAuthzTables(db);
  await db
    .prepare(
      `INSERT INTO authz_policy_rollouts
       (scope_key, scope_type, policy_id, account_id, entity_type, entity_id, mode, canary_percent, mismatch_threshold, fallback_rate_threshold, updated_by, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(scope_key) DO UPDATE SET
         scope_type = excluded.scope_type,
         policy_id = excluded.policy_id,
         account_id = excluded.account_id,
         entity_type = excluded.entity_type,
         entity_id = excluded.entity_id,
         mode = excluded.mode,
         canary_percent = excluded.canary_percent,
         mismatch_threshold = excluded.mismatch_threshold,
         fallback_rate_threshold = excluded.fallback_rate_threshold,
         updated_by = excluded.updated_by,
         updated_at = excluded.updated_at`,
    )
    .bind(
      row.scopeKey,
      row.scopeType,
      row.policyId,
      row.accountId,
      row.entityType,
      row.entityId,
      row.mode,
      normalizePercent(row.canaryPercent),
      normalizeRate(row.mismatchThreshold, DEFAULT_MISMATCH_THRESHOLD),
      normalizeRate(row.fallbackRateThreshold, DEFAULT_FALLBACK_RATE_THRESHOLD),
      row.updatedBy,
      row.updatedAt,
    )
    .run();

  if (compat?.writeLegacyRollout) {
    await compat.writeLegacyRollout(db, row);
  }

  return row;
}

export async function recordAuthzDecisionEvent(
  db: SqlDatabase | undefined,
  event: AuthzDecisionEventRecord,
  compat?: AuthzEventCompat,
): Promise<void> {
  if (!db) return;

  await ensureAuthzTables(db);
  await db
    .prepare(
      `INSERT INTO authz_decision_events (
         id, scope_key, scope_type, policy_id, account_id, tenant_id, entity_type, entity_id, actor_id, actor_role,
         action_name, resource_kind, resource_id, resource_access_type, rollout_mode, canary_percent,
         sampled_polar, mismatch, evaluation_path, fallback_used, fallback_reason, legacy_decision, polar_decision,
         final_decision, matched_rule_ids_json, reason, policy_hash, compiler_version, correlation_id, metadata_json
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      event.id,
      event.scopeKey,
      event.scopeType,
      event.policyId,
      event.accountId,
      event.tenantId,
      event.entityType,
      event.entityId,
      event.actorId,
      event.actorRole,
      event.actionName,
      event.resourceKind,
      event.resourceId,
      event.resourceAccessType,
      event.rolloutMode,
      normalizePercent(event.canaryPercent),
      event.sampledPolar,
      event.mismatch,
      event.evaluationPath,
      event.fallbackUsed,
      event.fallbackReason,
      event.legacyDecision,
      event.polarDecision,
      event.finalDecision,
      event.matchedRuleIdsJson,
      event.reason,
      event.policyHash,
      event.compilerVersion,
      event.correlationId,
      event.metadataJson,
    )
    .run();

  if (compat?.writeLegacyEvent) {
    await compat.writeLegacyEvent(db, event);
  }
}

export async function getAuthzMetricsSummary(
  db: SqlDatabase | undefined,
  input: {
    accountId?: string;
    policyId?: string;
    entityType?: string;
    entityId?: string;
    windowSeconds?: number;
  },
): Promise<AuthzMetricsSummary> {
  const empty: AuthzMetricsSummary = {
    total24h: 0,
    fallbackRate: 0,
    mismatchRate: 0,
    p50LatencyMs: 0,
    p95LatencyMs: 0,
    byFinalDecision: { allow: 0, require_human_review: 0, block: 0 },
  };
  if (!db) return empty;

  await ensureAuthzTables(db);
  const cutoff = nowEpochSeconds() - (input.windowSeconds ?? 24 * 60 * 60);
  const where: string[] = ['created_at >= ?'];
  const bindings: unknown[] = [cutoff];
  if (input.accountId) {
    where.push('account_id = ?');
    bindings.push(input.accountId);
  }
  if (input.policyId) {
    where.push('policy_id = ?');
    bindings.push(input.policyId);
  }
  if (input.entityType && input.entityId) {
    where.push('entity_type = ?');
    bindings.push(input.entityType);
    where.push('entity_id = ?');
    bindings.push(input.entityId);
  }
  const clause = where.join(' AND ');

  const countsRow = await db
    .prepare(
      `SELECT
         COUNT(*) AS total,
         COALESCE(SUM(fallback_used), 0) AS fallback_total,
         COALESCE(SUM(mismatch), 0) AS mismatch_total
       FROM authz_decision_events
       WHERE ${clause}`,
    )
    .bind(...bindings)
    .first<{ total: number | string | null; fallback_total: number | string | null; mismatch_total: number | string | null }>();

  const total = toNumber(countsRow?.total);
  if (total === 0) return empty;

  const latencies = await db
    .prepare(
      `SELECT CAST(json_extract(metadata_json, '$.latency_ms') AS INTEGER) AS latency_ms
       FROM authz_decision_events
       WHERE ${clause}
       ORDER BY latency_ms ASC`,
    )
    .bind(...bindings)
    .all<{ latency_ms: number | string | null }>();

  const sorted = latencies.results.map((row) => toNumber(row.latency_ms)).sort((a, b) => a - b);
  const p50 = sorted[Math.floor((sorted.length - 1) * 0.5)] ?? 0;
  const p95 = sorted[Math.floor((sorted.length - 1) * 0.95)] ?? 0;

  const decisionRows = await db
    .prepare(
      `SELECT final_decision AS key, COUNT(*) AS count
       FROM authz_decision_events
       WHERE ${clause}
       GROUP BY final_decision`,
    )
    .bind(...bindings)
    .all<{ key: string | null; count: number | string | null }>();

  const byFinalDecision = { allow: 0, require_human_review: 0, block: 0 };
  for (const row of decisionRows.results) {
    const key = row.key ?? 'allow';
    if (key in byFinalDecision) {
      byFinalDecision[key as keyof typeof byFinalDecision] = toNumber(row.count);
    }
  }

  return {
    total24h: total,
    fallbackRate: toNumber(countsRow?.fallback_total) / total,
    mismatchRate: toNumber(countsRow?.mismatch_total) / total,
    p50LatencyMs: p50,
    p95LatencyMs: p95,
    byFinalDecision,
  };
}
