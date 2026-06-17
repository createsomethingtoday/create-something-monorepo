import { defaultAuthzRollout, getAuthzRollout, getPolicyManifest, setAuthzRollout, } from '@create-something/mcp-authz';
const ATLAS_ROLLOUT_POLICY_ID = 'policy.judgment-baseline.v1';
function scopeFor(input) {
    return {
        scopeType: 'entity',
        policyId: ATLAS_ROLLOUT_POLICY_ID,
        accountId: input.accountId,
        entityType: input.entityType,
        entityId: input.entityId,
    };
}
function toEpochSeconds(raw) {
    if (typeof raw === 'number')
        return Number.isFinite(raw) ? raw : Math.floor(Date.now() / 1000);
    if (typeof raw === 'string') {
        const numeric = Number(raw);
        if (Number.isFinite(numeric))
            return numeric;
        const date = new Date(raw);
        if (Number.isFinite(date.getTime()))
            return Math.floor(date.getTime() / 1000);
    }
    return Math.floor(Date.now() / 1000);
}
function toRow(input) {
    return {
        account_id: input.accountId ?? 'unknown',
        entity_type: (input.entityType ?? 'agent'),
        entity_id: input.entityId ?? 'unknown',
        mode: input.mode,
        canary_percent: input.canaryPercent,
        mismatch_threshold: input.mismatchThreshold,
        fallback_rate_threshold: input.fallbackRateThreshold,
        updated_by: input.updatedBy,
        updated_at: input.updatedAt,
    };
}
export function defaultRollout(accountId, entityType, entityId) {
    return toRow(defaultAuthzRollout(scopeFor({ accountId, entityType, entityId }), getPolicyManifest(ATLAS_ROLLOUT_POLICY_ID)));
}
export async function getEngineRollout(db, input) {
    const manifest = getPolicyManifest(ATLAS_ROLLOUT_POLICY_ID);
    const rollout = await getAuthzRollout(db, scopeFor(input), manifest, {
        readLegacyRollout: async (compatDb, scope) => {
            if (scope.scopeType !== 'entity')
                return null;
            const row = await compatDb
                .prepare(`SELECT account_id, entity_type, entity_id, mode, canary_percent, mismatch_threshold, fallback_rate_threshold, updated_by, updated_at
             FROM judgment_engine_rollout
             WHERE account_id = ? AND entity_type = ? AND entity_id = ?
             LIMIT 1`)
                .bind(scope.accountId, scope.entityType, scope.entityId)
                .first();
            if (!row)
                return null;
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
    });
    return toRow(rollout);
}
export async function setEngineRollout(db, input) {
    const manifest = getPolicyManifest(ATLAS_ROLLOUT_POLICY_ID);
    const base = defaultAuthzRollout(scopeFor(input), manifest);
    const updated = await setAuthzRollout(db, {
        ...base,
        mode: input.mode,
        canaryPercent: input.canaryPercent,
        mismatchThreshold: input.mismatchThreshold ?? base.mismatchThreshold,
        fallbackRateThreshold: input.fallbackRateThreshold ?? base.fallbackRateThreshold,
        updatedBy: input.updatedBy,
        updatedAt: Math.floor(Date.now() / 1000),
    }, {
        writeLegacyRollout: async (compatDb, row) => {
            if (row.scopeType !== 'entity')
                return;
            await compatDb
                .prepare(`INSERT INTO judgment_engine_rollout
             (account_id, entity_type, entity_id, mode, canary_percent, mismatch_threshold, fallback_rate_threshold, updated_by, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(account_id, entity_type, entity_id) DO UPDATE SET
               mode = excluded.mode,
               canary_percent = excluded.canary_percent,
               mismatch_threshold = excluded.mismatch_threshold,
               fallback_rate_threshold = excluded.fallback_rate_threshold,
               updated_by = excluded.updated_by,
               updated_at = excluded.updated_at`)
                .bind(row.accountId, row.entityType, row.entityId, row.mode, row.canaryPercent, row.mismatchThreshold, row.fallbackRateThreshold, row.updatedBy, row.updatedAt)
                .run();
        },
    });
    return toRow(updated);
}
//# sourceMappingURL=rollout.js.map