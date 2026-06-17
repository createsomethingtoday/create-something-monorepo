import { getAuthzMetricsSummary, recordAuthzDecisionEvent, } from '@create-something/mcp-authz';
const ATLAS_POLICY_ID = 'policy.judgment-baseline.v1';
function eventId(accountId, entityType, entityId, toolName) {
    const rand = Math.random().toString(36).slice(2, 10);
    return `eng_${accountId}_${entityType}_${entityId}_${toolName}_${Date.now()}_${rand}`.replace(/[^a-zA-Z0-9_\-]/g, '_');
}
function toRolloutMode(value) {
    return value === 'shadow' || value === 'polar_enforce' ? value : 'legacy_enforce';
}
function toEvaluationPath(value) {
    return value === 'primary' || value === 'fallback' ? value : 'legacy';
}
function toDecisionType(value) {
    return value === 'require_human_review' || value === 'block' ? value : 'allow';
}
export async function recordEngineEvent(db, input) {
    if (!db)
        return;
    const id = eventId(input.account_id, input.entity_type, input.entity_id, input.tool_name);
    const createdAt = Math.floor(Date.now() / 1000);
    await recordAuthzDecisionEvent(db, {
        id,
        scopeKey: `entity:${input.account_id}:${input.entity_type}:${input.entity_id}:${ATLAS_POLICY_ID}`,
        scopeType: 'entity',
        policyId: ATLAS_POLICY_ID,
        accountId: input.account_id,
        tenantId: null,
        entityType: input.entity_type,
        entityId: input.entity_id,
        actorId: input.account_id,
        actorRole: null,
        actionName: input.tool_name,
        resourceKind: input.entity_type,
        resourceId: input.entity_id,
        resourceAccessType: null,
        rolloutMode: toRolloutMode(input.rollout_mode),
        canaryPercent: input.canary_percent,
        sampledPolar: input.sampled_polar,
        mismatch: input.mismatch,
        evaluationPath: toEvaluationPath(input.evaluation_path),
        fallbackUsed: input.fallback_used,
        fallbackReason: null,
        legacyDecision: toDecisionType(input.legacy_decision),
        polarDecision: toDecisionType(input.polar_decision),
        finalDecision: toDecisionType(input.final_decision),
        matchedRuleIdsJson: JSON.stringify([]),
        reason: input.final_decision,
        policyHash: null,
        compilerVersion: null,
        correlationId: input.correlation_id,
        metadataJson: JSON.stringify({
            tool_name: input.tool_name,
            latency_ms: input.latency_ms,
        }),
    }, {
        writeLegacyEvent: async (compatDb, event) => {
            try {
                await compatDb
                    .prepare(`INSERT INTO judgment_engine_events
               (id, correlation_id, account_id, entity_type, entity_id, tool_name, rollout_mode, canary_percent, sampled_polar, mismatch, evaluation_path, fallback_used, legacy_decision, polar_decision, final_decision, latency_ms, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
                    .bind(event.id, event.correlationId, event.accountId, event.entityType, event.entityId, input.tool_name, event.rolloutMode, event.canaryPercent, event.sampledPolar, event.mismatch, event.evaluationPath, event.fallbackUsed, event.legacyDecision, event.polarDecision, event.finalDecision, input.latency_ms, createdAt)
                    .run();
            }
            catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                if (!/correlation_id/i.test(message)) {
                    throw error;
                }
                await compatDb
                    .prepare(`INSERT INTO judgment_engine_events
               (id, account_id, entity_type, entity_id, tool_name, rollout_mode, canary_percent, sampled_polar, mismatch, evaluation_path, fallback_used, legacy_decision, polar_decision, final_decision, latency_ms, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
                    .bind(event.id, event.accountId, event.entityType, event.entityId, input.tool_name, event.rolloutMode, event.canaryPercent, event.sampledPolar, event.mismatch, event.evaluationPath, event.fallbackUsed, event.legacyDecision, event.polarDecision, event.finalDecision, input.latency_ms, createdAt)
                    .run();
            }
        },
    });
}
export async function getEngineMetricsSummary(db, input) {
    const summary = await getAuthzMetricsSummary(db, {
        accountId: input.accountId,
        policyId: ATLAS_POLICY_ID,
        entityType: input.entityType,
        entityId: input.entityId,
        windowSeconds: input.windowSeconds,
    });
    return {
        total24h: summary.total24h,
        fallbackRate: summary.fallbackRate,
        mismatchRate: summary.mismatchRate,
        p50LatencyMs: summary.p50LatencyMs,
        p95LatencyMs: summary.p95LatencyMs,
        byFinalDecision: summary.byFinalDecision,
    };
}
//# sourceMappingURL=engine-events.js.map