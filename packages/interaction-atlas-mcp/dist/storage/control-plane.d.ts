import type { D1Database } from '@create-something/mcp-core';
type AutomationStatus = 'enabled' | 'disabled' | 'paused' | 'archived';
type ExecutionMode = 'direct' | 'guided' | 'autonomous';
type OwnerType = 'user' | 'service';
type ApprovalMode = 'untrusted' | 'on-failure' | 'on-request' | 'never';
type AssignmentMode = 'none' | 'pinned' | 'routed' | 'hybrid';
type ApprovalState = 'pending' | 'approved' | 'denied' | 'expired' | 'cancelled';
export interface AutomationContractRow {
    id: string;
    account_id: string;
    automation_id: string;
    version: number;
    status: AutomationStatus;
    name: string;
    owner_type: OwnerType;
    owner_id: string;
    execution_mode: ExecutionMode;
    policy_pack_id: string;
    policy_version_id: string;
    approval_mode: ApprovalMode;
    trigger_type: 'schedule' | 'event' | 'manual';
    trigger_cron: string | null;
    trigger_timezone: string | null;
    mcp_profile_id: string;
    spec_json: string;
    created_by: string;
    created_at: number;
    is_active: number;
}
export interface ApprovalInboxRow {
    approval_id: string;
    run_id: string;
    account_id: string;
    automation_id: string;
    state: ApprovalState;
    action_type: string;
    reason: string | null;
    proposed_change_json: string | null;
    requested_at: number;
    expires_at: number | null;
    decided_at: number | null;
    decided_by: string | null;
    decision_comment: string | null;
}
export interface UpsertAutomationInput {
    accountId: string;
    automationId: string;
    name: string;
    status: AutomationStatus;
    ownerType: OwnerType;
    ownerId: string;
    executionMode: ExecutionMode;
    policyPackId: string;
    policyVersionId: string;
    approvalMode: ApprovalMode;
    triggerType: 'schedule' | 'event' | 'manual';
    triggerCron?: string;
    triggerTimezone?: string;
    mcpProfileId: string;
    spec: Record<string, unknown>;
    labels?: string[];
    createdBy: string;
    isActive?: boolean;
    agentAssignment?: {
        mode: AssignmentMode;
        primaryAgentId?: string;
        routingPolicyId?: string;
        fallbackAgentIds?: string[];
    };
}
export declare function listActiveAutomationContracts(db: D1Database | undefined, accountId: string): Promise<AutomationContractRow[]>;
export declare function getActiveAutomationContract(db: D1Database | undefined, accountId: string, automationId: string): Promise<AutomationContractRow | null>;
export declare function upsertAutomationContract(db: D1Database | undefined, input: UpsertAutomationInput): Promise<AutomationContractRow>;
export declare function createAutomationRun(db: D1Database | undefined, input: {
    accountId: string;
    automationId: string;
    triggerSource?: 'schedule' | 'event' | 'manual' | 'retry';
    actorId: string;
}): Promise<{
    runId: string;
    state: string;
    contractVersion: number;
} | null>;
export declare function listPendingApprovals(db: D1Database | undefined, accountId: string): Promise<ApprovalInboxRow[]>;
export declare function decideApproval(db: D1Database | undefined, input: {
    accountId: string;
    approvalId: string;
    decision: 'approved' | 'denied';
    decidedBy: string;
    comment?: string;
}): Promise<{
    approvalId: string;
    state: string;
} | null>;
export {};
//# sourceMappingURL=control-plane.d.ts.map