import type { D1Database } from '@create-something/mcp-core';

export type AccountAccessMode = 'normal' | 'read_only' | 'off';

export interface AccountAccessRow {
  account_id: string;
  mode: AccountAccessMode;
  reason: string | null;
  incident_id: string | null;
  updated_by: string;
  updated_at: number;
  expires_at: number | null;
}

export interface SecurityIncidentRow {
  id: string;
  account_id: string;
  incident_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  action_mode: AccountAccessMode;
  reason: string;
  signal_json: string;
  status: 'open' | 'resolved';
  correlation_id: string | null;
  created_at: number;
  resolved_at: number | null;
  resolved_by: string | null;
}

export interface AbuseMitigationConfig {
  enabled: boolean;
  windowSeconds: number;
  blockThreshold: number;
  distinctToolThreshold: number;
}

function nowEpochSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

function normalizeMode(raw: unknown, fallback: AccountAccessMode = 'normal'): AccountAccessMode {
  if (typeof raw !== 'string') return fallback;
  const value = raw.trim().toLowerCase();
  if (value === 'off' || value === 'disabled' || value === 'deny_all') return 'off';
  if (value === 'read_only' || value === 'read-only' || value === 'readonly') return 'read_only';
  return 'normal';
}

function defaultAccess(accountId: string): AccountAccessRow {
  return {
    account_id: accountId,
    mode: 'normal',
    reason: null,
    incident_id: null,
    updated_by: 'system',
    updated_at: nowEpochSeconds(),
    expires_at: null,
  };
}

function incidentId(accountId: string): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `sec_${accountId}_${ts}_${rand}`.replace(/[^a-zA-Z0-9_\-]/g, '_');
}

function toNumber(value: number | string | null | undefined): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function isMissingTableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /no such table|no such column|SQLITE_ERROR/i.test(message);
}

export function resolveEffectiveToolAccessMode(
  globalMode: AccountAccessMode,
  accountMode: AccountAccessMode,
): AccountAccessMode {
  if (globalMode === 'off' || accountMode === 'off') return 'off';
  if (globalMode === 'read_only' || accountMode === 'read_only') return 'read_only';
  return 'normal';
}

export async function getAccountAccess(
  db: D1Database | undefined,
  accountId: string,
): Promise<AccountAccessRow> {
  if (!db) return defaultAccess(accountId);

  try {
    const row = await db
      .prepare(
        `SELECT account_id, mode, reason, incident_id, updated_by, updated_at, expires_at
         FROM judgment_account_access
         WHERE account_id = ?
         LIMIT 1`,
      )
      .bind(accountId)
      .first<AccountAccessRow>();

    if (!row) return defaultAccess(accountId);
    if (typeof row.expires_at === 'number' && row.expires_at > 0 && row.expires_at <= nowEpochSeconds()) {
      return defaultAccess(accountId);
    }
    return {
      ...row,
      mode: normalizeMode(row.mode),
    };
  } catch (error) {
    if (isMissingTableError(error)) return defaultAccess(accountId);
    throw error;
  }
}

export async function setAccountAccess(
  db: D1Database | undefined,
  input: {
    accountId: string;
    mode: AccountAccessMode;
    reason?: string | null;
    incidentId?: string | null;
    updatedBy: string;
    expiresAt?: number | null;
  },
): Promise<AccountAccessRow> {
  const row: AccountAccessRow = {
    account_id: input.accountId,
    mode: normalizeMode(input.mode),
    reason: input.reason ?? null,
    incident_id: input.incidentId ?? null,
    updated_by: input.updatedBy,
    updated_at: nowEpochSeconds(),
    expires_at: input.expiresAt ?? null,
  };

  if (!db) return row;

  try {
    await db
      .prepare(
        `INSERT INTO judgment_account_access
         (account_id, mode, reason, incident_id, updated_by, updated_at, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(account_id) DO UPDATE SET
           mode = excluded.mode,
           reason = excluded.reason,
           incident_id = excluded.incident_id,
           updated_by = excluded.updated_by,
           updated_at = excluded.updated_at,
           expires_at = excluded.expires_at`,
      )
      .bind(
        row.account_id,
        row.mode,
        row.reason,
        row.incident_id,
        row.updated_by,
        row.updated_at,
        row.expires_at,
      )
      .run();
  } catch (error) {
    if (isMissingTableError(error)) return row;
    throw error;
  }

  return row;
}

export async function createSecurityIncident(
  db: D1Database | undefined,
  input: {
    accountId: string;
    incidentType: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    actionMode: AccountAccessMode;
    reason: string;
    signal: Record<string, unknown>;
    correlationId?: string | null;
  },
): Promise<SecurityIncidentRow> {
  const row: SecurityIncidentRow = {
    id: incidentId(input.accountId),
    account_id: input.accountId,
    incident_type: input.incidentType,
    severity: input.severity,
    action_mode: normalizeMode(input.actionMode),
    reason: input.reason,
    signal_json: JSON.stringify(input.signal),
    status: 'open',
    correlation_id: input.correlationId ?? null,
    created_at: nowEpochSeconds(),
    resolved_at: null,
    resolved_by: null,
  };

  if (!db) return row;

  try {
    await db
      .prepare(
        `INSERT INTO judgment_security_incidents
         (id, account_id, incident_type, severity, action_mode, reason, signal_json, status, correlation_id, created_at, resolved_at, resolved_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        row.id,
        row.account_id,
        row.incident_type,
        row.severity,
        row.action_mode,
        row.reason,
        row.signal_json,
        row.status,
        row.correlation_id,
        row.created_at,
        row.resolved_at,
        row.resolved_by,
      )
      .run();
  } catch (error) {
    if (isMissingTableError(error)) return row;
    throw error;
  }

  return row;
}

export async function listRecentSecurityIncidents(
  db: D1Database | undefined,
  input: { accountId: string; limit?: number },
): Promise<SecurityIncidentRow[]> {
  if (!db) return [];
  const limit = Math.max(1, Math.min(50, Math.floor(input.limit ?? 10)));
  try {
    const result = await db
      .prepare(
        `SELECT id, account_id, incident_type, severity, action_mode, reason, signal_json, status, correlation_id, created_at, resolved_at, resolved_by
         FROM judgment_security_incidents
         WHERE account_id = ?
         ORDER BY created_at DESC
         LIMIT ?`,
      )
      .bind(input.accountId, limit)
      .all<SecurityIncidentRow>();
    return result.results;
  } catch (error) {
    if (isMissingTableError(error)) return [];
    throw error;
  }
}

export async function evaluateAbusePatternAndMitigate(
  db: D1Database | undefined,
  input: {
    accountId: string;
    correlationId?: string | null;
    readOnly: boolean;
    currentDecision: 'allow' | 'require_human_review' | 'block';
    currentToolName: string;
    config: AbuseMitigationConfig;
  },
): Promise<{
  triggered: boolean;
  actionMode?: AccountAccessMode;
  incidentId?: string;
  reason?: string;
  blockedTotal?: number;
  distinctTools?: number;
}> {
  if (!db || !input.config.enabled) return { triggered: false };
  if (!input.readOnly) return { triggered: false };
  if (input.currentDecision !== 'block') return { triggered: false };

  const cutoff = nowEpochSeconds() - Math.max(60, Math.floor(input.config.windowSeconds));
  const blockThreshold = Math.max(2, Math.floor(input.config.blockThreshold));
  const distinctToolThreshold = Math.max(1, Math.floor(input.config.distinctToolThreshold));

  let blockedTotal = 0;
  let distinctTools = 0;

  try {
    const counts = await db
      .prepare(
        `SELECT
           COUNT(*) AS blocked_total,
           COUNT(DISTINCT tool_name) AS distinct_tools
         FROM judgment_engine_events
         WHERE account_id = ?
           AND created_at >= ?
           AND final_decision = 'block'`,
      )
      .bind(input.accountId, cutoff)
      .first<{ blocked_total: number | string | null; distinct_tools: number | string | null }>();

    blockedTotal = toNumber(counts?.blocked_total);
    distinctTools = toNumber(counts?.distinct_tools);
  } catch (error) {
    if (isMissingTableError(error)) return { triggered: false };
    throw error;
  }

  if (blockedTotal < blockThreshold || distinctTools < distinctToolThreshold) {
    return { triggered: false, blockedTotal, distinctTools };
  }

  const currentAccess = await getAccountAccess(db, input.accountId);
  if (currentAccess.mode === 'off') {
    return { triggered: false, blockedTotal, distinctTools };
  }

  const reason =
    `Abuse pattern detected: ${blockedTotal} blocked tool calls across ${distinctTools} distinct tools` +
    ` in the last ${Math.max(60, Math.floor(input.config.windowSeconds))}s.`;

  const incident = await createSecurityIncident(db, {
    accountId: input.accountId,
    incidentType: 'abuse_pattern_block_spike',
    severity: 'critical',
    actionMode: 'off',
    reason,
    signal: {
      blockedTotal,
      distinctTools,
      windowSeconds: Math.max(60, Math.floor(input.config.windowSeconds)),
      threshold: {
        blockedTotal: blockThreshold,
        distinctTools: distinctToolThreshold,
      },
      triggerToolName: input.currentToolName,
    },
    correlationId: input.correlationId ?? null,
  });

  await setAccountAccess(db, {
    accountId: input.accountId,
    mode: 'off',
    reason: `Auto kill-switch: ${reason}`,
    incidentId: incident.id,
    updatedBy: 'system:abuse-guard',
  });

  return {
    triggered: true,
    actionMode: 'off',
    incidentId: incident.id,
    reason,
    blockedTotal,
    distinctTools,
  };
}
