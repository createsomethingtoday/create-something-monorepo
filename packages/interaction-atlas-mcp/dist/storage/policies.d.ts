import type { D1Database } from '@create-something/mcp-core';
import type { AtlasEntityType } from './versions.js';
export type PolicyStatus = 'draft' | 'active' | 'archived';
export interface PolicyRule {
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
        decision: 'allow' | 'require_human_review' | 'block';
        reason: string;
    };
}
export interface PolicyGuardrails {
    maxReviewDelta?: number;
    maxBlockDelta?: number;
}
export interface JudgmentPolicy {
    id: string;
    name: string;
    description?: string;
    guardrails?: PolicyGuardrails;
    rules: PolicyRule[];
}
export interface PolicyVersionRow {
    id: string;
    account_id: string;
    entity_type: AtlasEntityType;
    entity_id: string;
    status: PolicyStatus;
    policy_json: string;
    policy_engine?: string | null;
    policy_polar?: string | null;
    policy_hash?: string | null;
    compiler_version?: string | null;
    fallback_ir_json?: string | null;
    created_by: string;
    created_at: number;
}
export interface CompiledPolicyArtifact {
    policy_engine: 'polar_v1';
    policy_polar: string;
    policy_hash: string;
    compiler_version: string;
    fallback_ir_json: string;
}
export interface PolicyEstimateSummary {
    before: {
        allow: number;
        require_human_review: number;
        block: number;
    };
    after: {
        allow: number;
        require_human_review: number;
        block: number;
    };
    delta: {
        allow: number;
        require_human_review: number;
        block: number;
    };
    scenarioCount: number;
}
export interface EstimateReportRow {
    id: string;
    account_id: string;
    entity_type: AtlasEntityType;
    entity_id: string;
    before_policy_version_id: string | null;
    after_policy_version_id: string;
    scenario_set_json: string;
    summary_json: string;
    created_by: string;
    created_at: number;
}
export declare function createDefaultPolicy(entityId: string): JudgmentPolicy;
export declare function savePolicyVersion(db: D1Database | undefined, input: {
    accountId: string;
    entityType: AtlasEntityType;
    entityId: string;
    status?: PolicyStatus;
    policy: JudgmentPolicy;
    createdBy: string;
}): Promise<PolicyVersionRow>;
export declare function getPolicyVersionById(db: D1Database | undefined, accountId: string, policyVersionId: string): Promise<PolicyVersionRow | null>;
export declare function listPolicyVersions(db: D1Database | undefined, accountId: string, entityType: AtlasEntityType, entityId: string): Promise<PolicyVersionRow[]>;
export declare function getActivePolicySelection(db: D1Database | undefined, accountId: string, entityType: AtlasEntityType, entityId: string): Promise<string | null>;
export declare function activatePolicyVersion(db: D1Database | undefined, input: {
    accountId: string;
    entityType: AtlasEntityType;
    entityId: string;
    policyVersionId: string;
    updatedBy: string;
}): Promise<void>;
export declare function resolveActivePolicy(db: D1Database | undefined, input: {
    accountId: string;
    entityType: AtlasEntityType;
    entityId: string;
}): Promise<{
    policyVersionId: string;
    policy: JudgmentPolicy;
    compiled: CompiledPolicyArtifact;
}>;
export declare function saveEstimateReport(db: D1Database | undefined, input: {
    accountId: string;
    entityType: AtlasEntityType;
    entityId: string;
    beforePolicyVersionId: string | null;
    afterPolicyVersionId: string;
    scenarioSet: unknown;
    summary: PolicyEstimateSummary;
    createdBy: string;
}): Promise<EstimateReportRow>;
export declare function getEstimateReportById(db: D1Database | undefined, accountId: string, reportId: string): Promise<EstimateReportRow | null>;
export declare function getLatestEstimateReport(db: D1Database | undefined, accountId: string, entityType: AtlasEntityType, entityId: string): Promise<EstimateReportRow | null>;
//# sourceMappingURL=policies.d.ts.map