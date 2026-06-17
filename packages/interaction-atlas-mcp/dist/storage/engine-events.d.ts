import type { D1Database } from '@create-something/mcp-core';
import type { AtlasEntityType } from './versions.js';
export interface JudgmentEngineEvent {
    id: string;
    correlation_id: string;
    account_id: string;
    entity_type: AtlasEntityType;
    entity_id: string;
    tool_name: string;
    rollout_mode: string;
    canary_percent: number;
    sampled_polar: number;
    mismatch: number;
    evaluation_path: string;
    fallback_used: number;
    legacy_decision: string;
    polar_decision: string;
    final_decision: string;
    latency_ms: number;
    created_at: number;
}
export interface JudgmentEngineMetricsSummary {
    total24h: number;
    fallbackRate: number;
    mismatchRate: number;
    p50LatencyMs: number;
    p95LatencyMs: number;
    byFinalDecision: Record<string, number>;
}
export declare function recordEngineEvent(db: D1Database | undefined, input: Omit<JudgmentEngineEvent, 'id' | 'created_at'>): Promise<void>;
export declare function getEngineMetricsSummary(db: D1Database | undefined, input: {
    accountId: string;
    entityType?: AtlasEntityType;
    entityId?: string;
    windowSeconds?: number;
}): Promise<JudgmentEngineMetricsSummary>;
//# sourceMappingURL=engine-events.d.ts.map