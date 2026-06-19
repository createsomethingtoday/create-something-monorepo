import type { D1Database } from '@create-something/mcp-core';
export type AccountAccessMode = 'normal' | 'read_only' | 'off';
export interface AccountAccessRow {
    account_id: string;
    mode: AccountAccessMode;
    reason: string | null;
    incident_id: string | null;
    updated_by: string;
    updated_at: number;
    expires_at: number | null;
}
export interface SecurityIncidentRow {
    id: string;
    account_id: string;
    incident_type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    action_mode: AccountAccessMode;
    reason: string;
    signal_json: string;
    status: 'open' | 'resolved';
    correlation_id: string | null;
    created_at: number;
    resolved_at: number | null;
    resolved_by: string | null;
}
export interface SecurityIncidentClaimRow {
    account_id: string;
    incident_id: string;
    claimed_by: string;
    claimed_at: number;
    claim_expires_at: number;
}
export interface AbuseMitigationConfig {
    enabled: boolean;
    windowSeconds: number;
    blockThreshold: number;
    distinctToolThreshold: number;
    responseMode?: 'auto_off' | 'review';
}
export type SecurityIncidentDecision = 'dismiss' | 'monitor' | 'enforce_read_only' | 'enforce_off';
export interface SecurityIncidentRecommendation {
    decision: SecurityIncidentDecision;
    disposition: 'act' | 'evaluate';
    confidence: number;
    rationale: string;
}
export interface ClaimedSecurityIncident {
    incident: SecurityIncidentRow;
    claim: SecurityIncidentClaimRow;
    recommendation: SecurityIncidentRecommendation;
}
export declare function resolveEffectiveToolAccessMode(globalMode: AccountAccessMode, accountMode: AccountAccessMode): AccountAccessMode;
export declare function getAccountAccess(db: D1Database | undefined, accountId: string): Promise<AccountAccessRow>;
export declare function setAccountAccess(db: D1Database | undefined, input: {
    accountId: string;
    mode: AccountAccessMode;
    reason?: string | null;
    incidentId?: string | null;
    updatedBy: string;
    expiresAt?: number | null;
}): Promise<AccountAccessRow>;
export declare function createSecurityIncident(db: D1Database | undefined, input: {
    accountId: string;
    incidentType: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    actionMode: AccountAccessMode;
    reason: string;
    signal: Record<string, unknown>;
    correlationId?: string | null;
}): Promise<SecurityIncidentRow>;
export declare function listRecentSecurityIncidents(db: D1Database | undefined, input: {
    accountId: string;
    limit?: number;
    status?: 'open' | 'resolved';
}): Promise<SecurityIncidentRow[]>;
export declare function getSecurityIncidentById(db: D1Database | undefined, input: {
    accountId: string;
    incidentId: string;
}): Promise<SecurityIncidentRow | null>;
export declare function resolveSecurityIncident(db: D1Database | undefined, input: {
    accountId: string;
    incidentId: string;
    decision: SecurityIncidentDecision;
    note?: string;
    decidedBy: string;
}): Promise<{
    incident: SecurityIncidentRow;
    accessMode: AccountAccessMode;
} | null>;
export declare function claimNextSecurityIncidentForReview(db: D1Database | undefined, input: {
    accountId: string;
    reviewerId: string;
    claimTtlSeconds?: number;
}): Promise<ClaimedSecurityIncident | null>;
export declare function evaluateAbusePatternAndMitigate(db: D1Database | undefined, input: {
    accountId: string;
    correlationId?: string | null;
    readOnly: boolean;
    currentDecision: 'allow' | 'require_human_review' | 'block';
    currentToolName: string;
    config: AbuseMitigationConfig;
}): Promise<{
    triggered: boolean;
    actionMode?: AccountAccessMode;
    incidentId?: string;
    reason?: string;
    blockedTotal?: number;
    distinctTools?: number;
}>;
//# sourceMappingURL=security.d.ts.map