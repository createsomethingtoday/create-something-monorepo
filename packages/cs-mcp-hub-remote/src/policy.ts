import type { Env, PolicyCheckInput } from './types.js';
import { HubError } from './types.js';

let policyTablesReady = false;

async function ensurePolicyTables(db: D1Database): Promise<void> {
  if (policyTablesReady) {
    return;
  }

  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS hub_tenant_policy (
         tenant_id TEXT NOT NULL,
         tool_ref TEXT NOT NULL,
         effect TEXT NOT NULL CHECK(effect IN ('allow', 'deny')),
         read_only_override INTEGER,
         updated_at TEXT NOT NULL DEFAULT (datetime('now')),
         PRIMARY KEY (tenant_id, tool_ref)
       )`
    )
    .run();

  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS hub_tenant_quotas (
         tenant_id TEXT NOT NULL,
         scope_type TEXT NOT NULL CHECK(scope_type IN ('global', 'connector', 'server', 'tool')),
         scope_key TEXT NOT NULL,
         window_seconds INTEGER NOT NULL,
         max_calls INTEGER NOT NULL,
         updated_at TEXT NOT NULL DEFAULT (datetime('now')),
         PRIMARY KEY (tenant_id, scope_type, scope_key)
       )`
    )
    .run();

  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS hub_quota_counters (
         tenant_id TEXT NOT NULL,
         scope_type TEXT NOT NULL,
         scope_key TEXT NOT NULL,
         window_start INTEGER NOT NULL,
         calls INTEGER NOT NULL DEFAULT 0,
         updated_at TEXT NOT NULL DEFAULT (datetime('now')),
         PRIMARY KEY (tenant_id, scope_type, scope_key, window_start)
       )`
    )
    .run();

  await db
    .prepare(
      `CREATE INDEX IF NOT EXISTS idx_hub_tenant_policy_tool
       ON hub_tenant_policy(tenant_id, tool_ref)`
    )
    .run();

  await db
    .prepare(
      `CREATE INDEX IF NOT EXISTS idx_hub_tenant_quotas_lookup
       ON hub_tenant_quotas(tenant_id, scope_type, scope_key)`
    )
    .run();

  await db
    .prepare(
      `CREATE INDEX IF NOT EXISTS idx_hub_quota_counters_lookup
       ON hub_quota_counters(tenant_id, scope_type, scope_key, window_start)`
    )
    .run();

  policyTablesReady = true;
}

function resolveWindowStart(windowSeconds: number): number {
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(windowSeconds) || windowSeconds <= 0) {
    return nowSeconds;
  }
  return Math.floor(nowSeconds / windowSeconds) * windowSeconds;
}

function scopeList(
  input: PolicyCheckInput
): Array<{ scopeType: 'global' | 'connector' | 'server' | 'tool'; scopeKey: string }> {
  return [
    { scopeType: 'global', scopeKey: '*' },
    { scopeType: 'connector', scopeKey: input.connector },
    { scopeType: 'server', scopeKey: input.serverName },
    { scopeType: 'tool', scopeKey: input.toolRef }
  ];
}

async function enforceToolPolicy(db: D1Database, input: PolicyCheckInput): Promise<void> {
  const row = await db
    .prepare(
      `SELECT effect, read_only_override
       FROM hub_tenant_policy
       WHERE tenant_id = ? AND tool_ref = ?`
    )
    .bind(input.tenantId, input.toolRef)
    .first<{ effect: string; read_only_override: number | null }>();

  if (!row) {
    return;
  }

  if (row.effect === 'deny') {
    throw new HubError(
      'HUB_POLICY_DENIED',
      `Tool ${input.toolRef} is denied for tenant ${input.tenantId}`,
      {
        tenantId: input.tenantId,
        toolRef: input.toolRef,
        effect: row.effect
      }
    );
  }

  if (row.read_only_override === 1 && input.readWrite === 'write') {
    throw new HubError(
      'HUB_POLICY_DENIED',
      `Tool ${input.toolRef} is read-only for tenant ${input.tenantId}`,
      {
        tenantId: input.tenantId,
        toolRef: input.toolRef,
        readOnly: true
      }
    );
  }
}

async function enforceQuotas(db: D1Database, input: PolicyCheckInput): Promise<void> {
  const scopes = scopeList(input);

  for (const scope of scopes) {
    const quota = await db
      .prepare(
        `SELECT window_seconds, max_calls
         FROM hub_tenant_quotas
         WHERE tenant_id = ? AND scope_type = ? AND scope_key = ?`
      )
      .bind(input.tenantId, scope.scopeType, scope.scopeKey)
      .first<{ window_seconds: number; max_calls: number }>();

    if (!quota) {
      continue;
    }

    const windowStart = resolveWindowStart(quota.window_seconds);

    const current = await db
      .prepare(
        `SELECT calls
         FROM hub_quota_counters
         WHERE tenant_id = ?
           AND scope_type = ?
           AND scope_key = ?
           AND window_start = ?`
      )
      .bind(input.tenantId, scope.scopeType, scope.scopeKey, windowStart)
      .first<{ calls: number }>();

    const calls = current?.calls ?? 0;
    if (calls >= quota.max_calls) {
      throw new HubError('HUB_QUOTA_EXCEEDED', `Quota exceeded for tenant ${input.tenantId}`, {
        tenantId: input.tenantId,
        scopeType: scope.scopeType,
        scopeKey: scope.scopeKey,
        windowSeconds: quota.window_seconds,
        maxCalls: quota.max_calls,
        calls
      });
    }

    await db
      .prepare(
        `INSERT INTO hub_quota_counters (
           tenant_id,
           scope_type,
           scope_key,
           window_start,
           calls,
           updated_at
         ) VALUES (?, ?, ?, ?, 1, datetime('now'))
         ON CONFLICT(tenant_id, scope_type, scope_key, window_start)
         DO UPDATE SET
           calls = hub_quota_counters.calls + 1,
           updated_at = datetime('now')`
      )
      .bind(input.tenantId, scope.scopeType, scope.scopeKey, windowStart)
      .run();
  }
}

export async function enforcePolicyAndQuota(env: Env, input: PolicyCheckInput): Promise<void> {
  const db = env.HUB_DB;
  if (!db) {
    return;
  }

  await ensurePolicyTables(db);
  await enforceToolPolicy(db, input);
  await enforceQuotas(db, input);
}
