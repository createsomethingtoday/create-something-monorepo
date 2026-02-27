import type { D1Database } from '@create-something/mcp-core';
import type { AtlasEntityType } from './versions.js';

export type JudgmentEngineRolloutMode = 'legacy_enforce' | 'shadow' | 'polar_enforce';

export interface JudgmentEngineRolloutRow {
  account_id: string;
  entity_type: AtlasEntityType;
  entity_id: string;
  mode: JudgmentEngineRolloutMode;
  canary_percent: number;
  mismatch_threshold: number;
  fallback_rate_threshold: number;
  updated_by: string;
  updated_at: number;
}

function nowEpochSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

function normalizePercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.floor(value)));
}

function normalizeRate(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(1, value));
}

export function defaultRollout(
  accountId: string,
  entityType: AtlasEntityType,
  entityId: string,
): JudgmentEngineRolloutRow {
  return {
    account_id: accountId,
    entity_type: entityType,
    entity_id: entityId,
    mode: 'legacy_enforce',
    canary_percent: 0,
    mismatch_threshold: 0.005,
    fallback_rate_threshold: 0.01,
    updated_by: 'system',
    updated_at: nowEpochSeconds(),
  };
}

export async function getEngineRollout(
  db: D1Database | undefined,
  input: {
    accountId: string;
    entityType: AtlasEntityType;
    entityId: string;
  },
): Promise<JudgmentEngineRolloutRow> {
  if (!db) return defaultRollout(input.accountId, input.entityType, input.entityId);

  const row = await db
    .prepare(
      `SELECT account_id, entity_type, entity_id, mode, canary_percent, updated_by, updated_at
             , mismatch_threshold, fallback_rate_threshold
       FROM judgment_engine_rollout
       WHERE account_id = ? AND entity_type = ? AND entity_id = ?
       LIMIT 1`,
    )
    .bind(input.accountId, input.entityType, input.entityId)
    .first<JudgmentEngineRolloutRow>();

  if (!row) return defaultRollout(input.accountId, input.entityType, input.entityId);
  return {
    ...row,
    canary_percent: normalizePercent(row.canary_percent),
    mismatch_threshold: normalizeRate(row.mismatch_threshold, 0.005),
    fallback_rate_threshold: normalizeRate(row.fallback_rate_threshold, 0.01),
  };
}

export async function setEngineRollout(
  db: D1Database | undefined,
  input: {
    accountId: string;
    entityType: AtlasEntityType;
    entityId: string;
    mode: JudgmentEngineRolloutMode;
    canaryPercent: number;
    mismatchThreshold?: number;
    fallbackRateThreshold?: number;
    updatedBy: string;
  },
): Promise<JudgmentEngineRolloutRow> {
  const row: JudgmentEngineRolloutRow = {
    account_id: input.accountId,
    entity_type: input.entityType,
    entity_id: input.entityId,
    mode: input.mode,
    canary_percent: normalizePercent(input.canaryPercent),
    mismatch_threshold: normalizeRate(input.mismatchThreshold ?? 0.005, 0.005),
    fallback_rate_threshold: normalizeRate(input.fallbackRateThreshold ?? 0.01, 0.01),
    updated_by: input.updatedBy,
    updated_at: nowEpochSeconds(),
  };

  if (!db) return row;

  await db
    .prepare(
      `INSERT INTO judgment_engine_rollout
       (account_id, entity_type, entity_id, mode, canary_percent, mismatch_threshold, fallback_rate_threshold, updated_by, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(account_id, entity_type, entity_id) DO UPDATE SET
         mode = excluded.mode,
         canary_percent = excluded.canary_percent,
         mismatch_threshold = excluded.mismatch_threshold,
         fallback_rate_threshold = excluded.fallback_rate_threshold,
         updated_by = excluded.updated_by,
         updated_at = excluded.updated_at`,
    )
    .bind(
      row.account_id,
      row.entity_type,
      row.entity_id,
      row.mode,
      row.canary_percent,
      row.mismatch_threshold,
      row.fallback_rate_threshold,
      row.updated_by,
      row.updated_at,
    )
    .run();

  return row;
}
