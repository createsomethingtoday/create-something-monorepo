export type JudgmentDecisionType = 'allow' | 'require_human_review' | 'block';
export interface JudgmentGuardrails {
    maxReviewDelta?: number;
    maxBlockDelta?: number;
}
export interface JudgmentRule {
    id: string;
    priority: number;
    when: {
        toolNames?: string[];
        hasWriteIntent?: boolean;
        hasHumanReviewStep?: boolean;
        introspectionOk?: boolean;
        accountIds?: string[];
    };
    then: {
        decision: JudgmentDecisionType;
        reason: string;
    };
}
export interface JudgmentPolicy {
    id: string;
    name: string;
    description?: string;
    guardrails?: JudgmentGuardrails;
    rules: JudgmentRule[];
}
export interface JudgmentDecision {
    decision: JudgmentDecisionType;
    reason: string;
    matchedRuleIds: string[];
    engine?: 'legacy_v1' | 'polar_v1';
    policyHash?: string;
    compilerVersion?: string;
    evaluationPath?: 'legacy' | 'primary' | 'fallback';
    fallbackReason?: string | null;
    latencyMs?: number;
    securityAction?: {
        mode: 'normal' | 'read_only' | 'off';
        incidentId?: string;
        reason?: string;
    };
    atlasSignals: {
        touchpoint?: string;
        aiTask?: string;
        humanOversight?: string;
        constraint?: string;
    };
}
export interface JudgmentEvaluationInput {
    toolName: string;
    accountId: string;
    readOnly: boolean;
    hasWriteIntent?: boolean;
    hasHumanReviewStep?: boolean;
    introspectionOk?: boolean;
}
export interface JudgmentEstimateScenario {
    id: string;
    toolName: string;
    hasWriteIntent?: boolean;
    hasHumanReviewStep?: boolean;
    introspectionOk?: boolean;
}
export interface JudgmentEstimateSummary {
    before: Record<JudgmentDecisionType, number>;
    after: Record<JudgmentDecisionType, number>;
    delta: Record<JudgmentDecisionType, number>;
    scenarioCount: number;
}
//# sourceMappingURL=types.d.ts.map