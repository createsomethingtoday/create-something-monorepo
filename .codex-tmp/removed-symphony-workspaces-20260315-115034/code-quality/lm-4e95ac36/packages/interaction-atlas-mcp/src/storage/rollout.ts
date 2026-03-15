import type { D1Database } from '@create-something/mcp-core';
import {
  defaultAuthzRollout,
  getAuthzRollout,
  getPolicyManifest,
  setAuthzRollout,
} from '@create-something/mcp-authz';
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

const ATLAS_ROLLOUT_POLICY_ID = 'policy.judgment-baseline.v1';

function scopeFor(input: {
  accountId: string;
  entityType: AtlasEntityType;
  entityId: string;
}) {
  return {
    scopeType: 'entity' as const,
    policyId: ATLAS_ROLLOUT_POLICY_ID,
    accountId: input.accountId,
    entityType: input.entityType,
    entityId: input.entityId,
  };
}

function toEpochSeconds(raw: number | string | null | undefined): number {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : Math.floor(Date.now() / 1000);
  if (typeof raw === 'string') {
    const numeric = Number(raw);
    if (Number.isFinite(numeric)) return numeric;
    const date = new Date(raw);
    if (Number.isFinite(date.getTime())) return Math.floor(date.getTime() / 1000);
  }
  return Math.floor(Date.now() / 1000);
}

function toRow(input: ReturnType<typeof defaultAuthzRollout>): JudgmentEngineRolloutRow {
  return {
    account_id: input.accountId ?? 'unknown',
    entity_type: (input.entityType ?? 'agent') as AtlasEntityType,
    entity_id: input.entityId ?? 'unknown',
    mode: input.mode,
    canary_percent: input.canaryPercent,
    mismatch_threshold: input.mismatchThreshold,
    fallback_rate_threshold: input.fallbackRateThreshold,
    updated_by: input.updatedBy,
    updated_at: input.updatedAt,
  };
}

export function defaultRollout(
  accountId: string,
  entityType: AtlasEntityType,
  entityId: string,
): JudgmentEngineRolloutRow {
  return toRow(defaultAuthzRollout(scopeFor({ accountId, entityType, entityId }), getPolicyManifest(ATLAS_ROLLOUT_POLICY_ID)));
}

export async function getEngineRollout(
  db: D1Database | undefined,
  input: {
    accountId: string;
    entityType: AtlasEntityType;
    entityId: string;
  },
): Promise<JudgmentEngineRolloutRow> {
  const manifest = getPolicyManifest(ATLAS_ROLLOUT_POLICY_ID);
  const rollout = await getAuthzRollout(
    db,
    scopeFor(input),
    manifest,
    {
      readLegacyRollout: async (compatDb, scope) => {
        if (scope.scopeType !== 'entity') return null;
        const row = await compatDb
          .prepare(
            `SELECT account_id, entity_type, entity_id, mode, canary_percent, mismatch_threshold, fallback_rate_threshold, updated_by, updated_at
             FROM judgment_engine_rollout
             WHERE account_id = ? AND entity_type = ? AND entity_id = ?
             LIMIT 1`,
          )
          .bind(scope.accountId, scope.entityType, scope.entityId)
          .first<{
            account_id: string;
            entity_type: AtlasEntityType;
            entity_id: string;
            mode: JudgmentEngineRolloutMode;
            canary_percent: number;
            mismatch_threshold: number;
            fallback_rate_threshold: number;
            updated_by: string;
            updated_at: number | string;
          }>();
        if (!row) return null;
        return {
          scopeKey: `entity:${row.account_id}:${row.entity_type}:${row.entity_id}:${ATLAS_ROLLOUT_POLICY_ID}`,
          scopeType: 'entity',
          policyId: ATLAS_ROLLOUT_POLICY_ID,
          accountId: row.account_id,
          entityType: row.entity_type,
          entityId: row.entity_id,
          mode: row.mode,
          canaryPercent: row.canary_percent,
          mismatchThreshold: row.mismatch_threshold,
          fallbackRateThreshold: row.fallback_rate_threshold,
          updatedBy: row.updated_by,
          updatedAt: toEpochSeconds(row.updated_at),
        };
      },
    },
  );

  return toRow(rollout);
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
  const manifest = getPolicyManifest(ATLAS_ROLLOUT_POLICY_ID);
  const base = defaultAuthzRollout(scopeFor(input), manifest);
  const updated = await setAuthzRollout(
    db,
    {
      ...base,
      mode: input.mode,
      canaryPercent: input.canaryPercent,
      mismatchThreshold: input.mismatchThreshold ?? base.mismatchThreshold,
      fallbackRateThreshold: input.fallbackRateThreshold ?? base.fallbackRateThreshold,
      updatedBy: input.updatedBy,
      updatedAt: Math.floor(Date.now() / 1000),
    },
    {
      writeLegacyRollout: async (compatDb, row) => {
        if (row.scopeType !== 'entity') return;
        await compatDb
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
            row.accountId,
            row.entityType,
            row.entityId,
            row.mode,
            row.canaryPercent,
            row.mismatchThreshold,
            row.fallbackRateThreshold,
            row.updatedBy,
            row.updatedAt,
          )
          .run();
      },
    },
  );

  return toRow(updated);
}
