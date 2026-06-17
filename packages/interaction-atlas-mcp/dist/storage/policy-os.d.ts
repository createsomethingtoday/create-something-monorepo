import type { AuthorizationAccessType, AuthorizationDecisionType, AuthorizationRolloutMode } from '@create-something/mcp-authz';
import type { D1Database } from '@create-something/mcp-core';
import { type ConstraintPolicy } from '@create-something/policy-os-engine';
export type PolicyOsStatus = 'draft' | 'active' | 'archived';
export type PolicyOsApprovalPolicy = 'untrusted' | 'on-failure' | 'on-request' | 'never';
export type PolicyOsNonInteractiveDecision = 'decline' | 'cancel';
export type PolicyOsApprovalState = 'pending' | 'approved' | 'denied' | 'expired' | 'cancelled';
export type PolicyOsDecisionType = AuthorizationDecisionType;
export type PolicyOsAndonSource = 'authz' | 'runtime' | 'operator' | 'model';
export type PolicyOsSeverity = 'low' | 'medium' | 'high' | 'critical';
export type PolicyOsServiceTier = 'mcp_only' | 'policy_os_trial' | 'policy_os_core';
export type PolicyOsEnvironment = 'development' | 'staging' | 'production' | (string & {});
export type PolicyOsRiskLevel = 'low' | 'medium' | 'high' | 'critical' | (string & {});
export type PolicyOsSandboxPolicy = {
    type: 'dangerFullAccess';
} | {
    type: 'readOnly';
} | {
    type: 'workspaceWrite';
    networkAccess?: boolean;
    writableRoots?: string[];
    excludeSlashTmp?: boolean;
    excludeTmpdirEnvVar?: boolean;
};
export interface PolicyOsAutoApproveRules {
    commandActionTypes?: Array<'read' | 'listFiles' | 'search' | 'unknown'>;
    commandRegex?: string[];
    filePathPrefixes?: string[];
}
export interface PolicyOsJudgmentPackDefinition {
    id: string;
    label: string;
    description?: string;
    sandboxPolicy: PolicyOsSandboxPolicy;
    approvalPolicy: PolicyOsApprovalPolicy;
    nonInteractiveDecision: PolicyOsNonInteractiveDecision;
    autoApprove?: PolicyOsAutoApproveRules;
    developerInstructions?: string;
}
export interface PolicyOsRolloutDefaults {
    mode: AuthorizationRolloutMode;
    canaryPercent: number;
    mismatchThreshold?: number;
    fallbackRateThreshold?: number;
}
export interface PolicyOsManifestVersionRow {
    id: string;
    account_id: string;
    policy_id: string;
    version: number;
    status: PolicyOsStatus;
    description: string | null;
    constraint_policy_json: string;
    polar_source: string | null;
    fallback_ir_json: string | null;
    compiler_version: string | null;
    policy_hash: string | null;
    commit_sha: string;
    rollout_defaults_json: string | null;
    created_by: string;
    created_at: number;
}
export interface PolicyOsJudgmentPackVersionRow {
    id: string;
    account_id: string;
    pack_id: string;
    version: number;
    label: string;
    description: string | null;
    sandbox_policy_json: string;
    approval_policy: PolicyOsApprovalPolicy;
    non_interactive_decision: PolicyOsNonInteractiveDecision;
    auto_approve_json: string | null;
    developer_instructions: string | null;
    status: PolicyOsStatus;
    created_by: string;
    created_at: number;
}
export interface PolicyOsBindingRow {
    binding_id: string;
    account_id: string;
    environment: string;
    workflow_id: string | null;
    tool_prefix: string | null;
    resource_kind: string | null;
    access_type: AuthorizationAccessType | null;
    risk_level: string | null;
    service_tier: PolicyOsServiceTier | null;
    authz_policy_version_id: string;
    judgment_pack_version_id: string;
    priority: number;
    active: number;
    created_by: string;
    updated_by: string;
    created_at: number;
    updated_at: number;
}
export interface PolicyOsApprovalCaseRow {
    approval_id: string;
    correlation_id: string | null;
    account_id: string;
    actor_id: string | null;
    agent_id: string | null;
    action_name: string;
    resource_kind: string;
    resource_id: string | null;
    request_payload_json: string;
    binding_id: string | null;
    status: PolicyOsApprovalState;
    reason: string;
    decision_note: string | null;
    decided_by: string | null;
    expires_at: number | null;
    created_at: number;
    decided_at: number | null;
}
export interface PolicyOsDecisionEventRow {
    id: string;
    correlation_id: string | null;
    account_id: string;
    actor_id: string | null;
    agent_id: string | null;
    action_name: string;
    resource_kind: string;
    resource_id: string | null;
    resource_access_type: AuthorizationAccessType | null;
    binding_id: string | null;
    authz_policy_version_id: string | null;
    judgment_pack_version_id: string | null;
    approval_id: string | null;
    final_decision: PolicyOsDecisionType;
    reason: string;
    matched_rule_ids_json: string;
    policy_hash: string | null;
    evaluation_path: 'legacy' | 'primary' | 'fallback' | string;
    fallback_reason: string | null;
    latency_ms: number | null;
    metadata_json: string;
    created_at: number;
}
export interface PolicyOsAndonEventRow {
    andon_id: string;
    correlation_id: string | null;
    account_id: string;
    source: PolicyOsAndonSource;
    severity: PolicyOsSeverity;
    question: string;
    context: string;
    proposed_action: string;
    confidence: number | null;
    approval_id: string | null;
    resolved_by: string | null;
    created_at: number;
    resolved_at: number | null;
}
export interface PolicyOsEntitlementSnapshotRow {
    snapshot_id: string;
    account_id: string;
    tenant_id: string | null;
    service_tier: PolicyOsServiceTier;
    service_entitled: number;
    policy_accepted: number;
    contract_active: number;
    billing_active: number;
    approved_exception_json: string | null;
    effective_at: number;
    recorded_by: string;
    created_at: number;
}
export interface SavePolicyOsManifestVersionInput {
    accountId: string;
    policyId: string;
    constraintPolicy: ConstraintPolicy;
    commitSha: string;
    createdBy: string;
    status?: PolicyOsStatus;
    description?: string;
    version?: number;
    rolloutDefaults?: PolicyOsRolloutDefaults;
}
export interface SavePolicyOsJudgmentPackVersionInput {
    accountId: string;
    packId: string;
    label: string;
    createdBy: string;
    sandboxPolicy: PolicyOsSandboxPolicy;
    approvalPolicy: PolicyOsApprovalPolicy;
    nonInteractiveDecision: PolicyOsNonInteractiveDecision;
    status?: PolicyOsStatus;
    description?: string;
    version?: number;
    autoApprove?: PolicyOsAutoApproveRules;
    developerInstructions?: string;
}
export interface UpsertPolicyOsBindingInput {
    accountId: string;
    authzPolicyVersionId: string;
    judgmentPackVersionId: string;
    updatedBy: string;
    bindingId?: string;
    environment?: PolicyOsEnvironment;
    workflowId?: string | null;
    toolPrefix?: string | null;
    resourceKind?: string | null;
    accessType?: AuthorizationAccessType | null;
    riskLevel?: PolicyOsRiskLevel | null;
    serviceTier?: PolicyOsServiceTier | null;
    priority?: number;
    active?: boolean;
    createdBy?: string;
}
export interface ResolvePolicyOsBindingInput {
    accountId: string;
    environment?: PolicyOsEnvironment;
    workflowId?: string | null;
    toolName?: string | null;
    resourceKind?: string | null;
    accessType?: AuthorizationAccessType | null;
    riskLevel?: PolicyOsRiskLevel | null;
    serviceTier?: PolicyOsServiceTier | null;
}
export interface CreatePolicyOsApprovalCaseInput {
    accountId: string;
    actionName: string;
    resourceKind: string;
    reason: string;
    correlationId?: string | null;
    actorId?: string | null;
    agentId?: string | null;
    resourceId?: string | null;
    requestPayload?: Record<string, unknown>;
    bindingId?: string | null;
    status?: PolicyOsApprovalState;
    expiresAt?: number | null;
}
export interface RecordPolicyOsDecisionEventInput {
    accountId: string;
    actionName: string;
    resourceKind: string;
    finalDecision: PolicyOsDecisionType;
    reason: string;
    correlationId?: string | null;
    actorId?: string | null;
    agentId?: string | null;
    resourceId?: string | null;
    resourceAccessType?: AuthorizationAccessType | null;
    bindingId?: string | null;
    authzPolicyVersionId?: string | null;
    judgmentPackVersionId?: string | null;
    approvalId?: string | null;
    matchedRuleIds?: string[];
    policyHash?: string | null;
    evaluationPath?: 'legacy' | 'primary' | 'fallback';
    fallbackReason?: string | null;
    latencyMs?: number | null;
    metadata?: Record<string, unknown>;
}
export interface RecordPolicyOsAndonEventInput {
    accountId: string;
    source: PolicyOsAndonSource;
    severity: PolicyOsSeverity;
    question: string;
    context: string;
    proposedAction: string;
    correlationId?: string | null;
    confidence?: number | null;
    approvalId?: string | null;
    resolvedBy?: string | null;
    resolvedAt?: number | null;
}
export interface RecordPolicyOsEntitlementSnapshotInput {
    accountId: string;
    serviceTier: PolicyOsServiceTier;
    serviceEntitled: boolean;
    policyAccepted: boolean;
    contractActive: boolean;
    billingActive: boolean;
    recordedBy: string;
    tenantId?: string | null;
    approvedException?: Record<string, unknown> | null;
    effectiveAt?: number;
}
export declare function savePolicyOsManifestVersion(db: D1Database | undefined, input: SavePolicyOsManifestVersionInput): Promise<PolicyOsManifestVersionRow>;
export declare function savePolicyOsJudgmentPackVersion(db: D1Database | undefined, input: SavePolicyOsJudgmentPackVersionInput): Promise<PolicyOsJudgmentPackVersionRow>;
export declare function upsertPolicyOsBinding(db: D1Database | undefined, input: UpsertPolicyOsBindingInput): Promise<PolicyOsBindingRow>;
export declare function resolvePolicyOsBinding(db: D1Database | undefined, input: ResolvePolicyOsBindingInput): Promise<PolicyOsBindingRow | null>;
export declare function createPolicyOsApprovalCase(db: D1Database | undefined, input: CreatePolicyOsApprovalCaseInput): Promise<PolicyOsApprovalCaseRow>;
export declare function recordPolicyOsDecisionEvent(db: D1Database | undefined, input: RecordPolicyOsDecisionEventInput): Promise<PolicyOsDecisionEventRow>;
export declare function recordPolicyOsAndonEvent(db: D1Database | undefined, input: RecordPolicyOsAndonEventInput): Promise<PolicyOsAndonEventRow>;
export declare function recordPolicyOsEntitlementSnapshot(db: D1Database | undefined, input: RecordPolicyOsEntitlementSnapshotInput): Promise<PolicyOsEntitlementSnapshotRow>;
export declare function getLatestPolicyOsEntitlementSnapshot(db: D1Database | undefined, accountId: string): Promise<PolicyOsEntitlementSnapshotRow | null>;
//# sourceMappingURL=policy-os.d.ts.map