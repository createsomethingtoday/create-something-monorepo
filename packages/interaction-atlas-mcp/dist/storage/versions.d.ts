import type { D1Database } from '@create-something/mcp-core';
export type AtlasEntityType = 'mcp' | 'agent';
export type VersionSelectionSource = 'request_override' | 'account_default' | 'latest';
export interface AtlasVersionRow {
    id: string;
    account_id: string;
    entity_type: AtlasEntityType;
    entity_id: string;
    commit_sha: string;
    runtime_ref: string | null;
    policy_version_id: string;
    parent_version_id: string | null;
    created_at: number;
}
export interface ResolvedVersion {
    versionId: string;
    selectionSource: VersionSelectionSource;
    commitSha: string;
    policyVersionId: string;
}
export interface VersionResolutionInput {
    accountId: string;
    entityType: AtlasEntityType;
    entityId: string;
    policyVersionId: string;
    defaultCommitSha: string;
    runtimeRef?: string;
    overrideVersionId?: string;
    overrideCommitSha?: string;
    allowOverride: boolean;
}
export declare function ensureVersion(db: D1Database | undefined, input: Omit<VersionResolutionInput, 'overrideVersionId' | 'overrideCommitSha' | 'allowOverride'>): Promise<AtlasVersionRow>;
export declare function getVersionById(db: D1Database | undefined, accountId: string, versionId: string): Promise<AtlasVersionRow | null>;
export declare function getVersionByCommit(db: D1Database | undefined, accountId: string, entityType: AtlasEntityType, entityId: string, commitSha: string): Promise<AtlasVersionRow | null>;
export declare function getLatestVersion(db: D1Database | undefined, accountId: string, entityType: AtlasEntityType, entityId: string): Promise<AtlasVersionRow | null>;
export declare function getDefaultSelectedVersionId(db: D1Database | undefined, accountId: string, entityType: AtlasEntityType, entityId: string): Promise<string | null>;
export declare function setDefaultSelectedVersion(db: D1Database | undefined, input: {
    accountId: string;
    entityType: AtlasEntityType;
    entityId: string;
    versionId: string;
    updatedBy: string;
}): Promise<void>;
export declare function bindPolicyToVersion(db: D1Database | undefined, input: {
    versionId: string;
    policyVersionId: string;
    policySnapshot: Record<string, unknown>;
    enforcementMode: 'hard_gate';
}): Promise<void>;
export declare function resolveActiveVersion(db: D1Database | undefined, input: VersionResolutionInput): Promise<ResolvedVersion>;
//# sourceMappingURL=versions.d.ts.map