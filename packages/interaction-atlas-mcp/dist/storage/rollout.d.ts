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
export declare function defaultRollout(accountId: string, entityType: AtlasEntityType, entityId: string): JudgmentEngineRolloutRow;
export declare function getEngineRollout(db: D1Database | undefined, input: {
    accountId: string;
    entityType: AtlasEntityType;
    entityId: string;
}): Promise<JudgmentEngineRolloutRow>;
export declare function setEngineRollout(db: D1Database | undefined, input: {
    accountId: string;
    entityType: AtlasEntityType;
    entityId: string;
    mode: JudgmentEngineRolloutMode;
    canaryPercent: number;
    mismatchThreshold?: number;
    fallbackRateThreshold?: number;
    updatedBy: string;
}): Promise<JudgmentEngineRolloutRow>;
//# sourceMappingURL=rollout.d.ts.map