import type {
  CompiledConstraintPolicy,
  ConstraintDecisionType,
  ConstraintPolicy,
  RolloutConfig,
} from '@create-something/policy-os-engine';

export type AuthorizationDecisionType = ConstraintDecisionType;
export type AuthorizationRolloutMode = RolloutConfig['mode'];

export type AuthorizationAccessType =
  | 'read'
  | 'write'
  | 'destructive'
  | 'auth_admin'
  | 'control_plane'
  | (string & {});

export interface PolicyManifest {
  policyId: string;
  version: number;
  commitSha: string;
  description?: string;
  status?: 'draft' | 'active' | 'archived';
  polar: string;
  fallbackIrJson: string;
  compilerVersion: string;
  policyHash: string;
  rolloutDefaults?: {
    mode: AuthorizationRolloutMode;
    canaryPercent: number;
    mismatchThreshold?: number;
    fallbackRateThreshold?: number;
  };
}

export interface AuthorizationActor {
  accountId: string;
  tenantId?: string | null;
  userId?: string | null;
  actorId?: string | null;
  role?: string | null;
  sessionId?: string | null;
  readOnly?: boolean;
  toolMode?: string | null;
  identitySource?: string | null;
  allowedToolPrefixes?: string[] | null;
}

export interface AuthorizationAction {
  name: string;
  writeIntent: boolean;
  humanReviewStep?: boolean;
  introspectionOk?: boolean;
}

export interface AuthorizationResource {
  kind: string;
  id?: string | null;
  toolName?: string | null;
  serverName?: string | null;
  downstreamToolName?: string | null;
  accessType?: AuthorizationAccessType | null;
  oauthRequired?: boolean;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface AuthorizationRequest {
  actor: AuthorizationActor;
  action: AuthorizationAction;
  resource: AuthorizationResource;
  context?: Record<string, unknown>;
}

export interface AuthorizationDecision {
  decision: AuthorizationDecisionType;
  reason: string;
  matchedRuleIds: string[];
  policyId: string;
  policyHash: string | null;
  compilerVersion: string | null;
  evaluationPath: 'legacy' | 'primary' | 'fallback';
  fallbackReason: string | null;
  latencyMs: number;
  rolloutMode: AuthorizationRolloutMode;
  canaryPercent: number;
  sampledPolar: boolean;
  mismatch: boolean;
}

export interface AuthorizationEvaluationResult {
  final: AuthorizationDecision;
  legacy: AuthorizationDecision;
  polar: AuthorizationDecision;
  manifest: PolicyManifest;
  policy: ConstraintPolicy;
  compiled: CompiledConstraintPolicy;
  request: AuthorizationRequest;
}

export interface AuthzPolicyDefinition {
  policy: ConstraintPolicy;
  manifest: Omit<PolicyManifest, 'polar' | 'fallbackIrJson' | 'compilerVersion' | 'policyHash'>;
}

export interface SqlStatement {
  bind(...values: unknown[]): SqlStatement;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<{ results: T[] }>;
  run(): Promise<unknown>;
}

export interface SqlDatabase {
  prepare(query: string): SqlStatement;
}

export type AuthzScope =
  | {
      scopeType: 'policy';
      policyId: string;
      accountId?: string | null;
    }
  | {
      scopeType: 'entity';
      policyId: string;
      accountId: string;
      entityType: string;
      entityId: string;
    };

export interface AuthzRolloutRow {
  scopeKey: string;
  scopeType: AuthzScope['scopeType'];
  policyId: string;
  accountId: string | null;
  entityType: string | null;
  entityId: string | null;
  mode: AuthorizationRolloutMode;
  canaryPercent: number;
  mismatchThreshold: number;
  fallbackRateThreshold: number;
  updatedBy: string;
  updatedAt: number;
}

export interface AuthzMetricsSummary {
  total24h: number;
  fallbackRate: number;
  mismatchRate: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  byFinalDecision: Record<AuthorizationDecisionType, number>;
}

export interface AuthzDecisionEventRecord {
  id: string;
  scopeKey: string;
  scopeType: AuthzScope['scopeType'];
  policyId: string;
  accountId: string | null;
  tenantId: string | null;
  entityType: string | null;
  entityId: string | null;
  actorId: string | null;
  actorRole: string | null;
  actionName: string;
  resourceKind: string;
  resourceId: string | null;
  resourceAccessType: string | null;
  rolloutMode: AuthorizationRolloutMode;
  canaryPercent: number;
  sampledPolar: number;
  mismatch: number;
  evaluationPath: 'legacy' | 'primary' | 'fallback';
  fallbackUsed: number;
  fallbackReason: string | null;
  legacyDecision: AuthorizationDecisionType;
  polarDecision: AuthorizationDecisionType;
  finalDecision: AuthorizationDecisionType;
  matchedRuleIdsJson: string;
  reason: string;
  policyHash: string | null;
  compilerVersion: string | null;
  correlationId: string | null;
  metadataJson: string;
}

export interface AuthzRolloutCompat {
  readLegacyRollout?: (db: SqlDatabase, scope: AuthzScope) => Promise<AuthzRolloutRow | null>;
  writeLegacyRollout?: (db: SqlDatabase, row: AuthzRolloutRow) => Promise<void>;
}

export interface AuthzEventCompat {
  writeLegacyEvent?: (db: SqlDatabase, event: AuthzDecisionEventRecord) => Promise<void>;
}
