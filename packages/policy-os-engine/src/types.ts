export type ConstraintDecisionType = 'allow' | 'require_human_review' | 'block';

export interface ConstraintRuleWhen {
  actionNames?: string[];
  resourceKinds?: string[];
  accessTypes?: string[];
  oauthRequired?: boolean;
  serviceTiers?: string[];
  actorRoles?: string[];
  toolModes?: string[];
  identitySources?: string[];
  resourceTags?: string[];
  toolNames?: string[];
  hasWriteIntent?: boolean;
  hasHumanReviewStep?: boolean;
  introspectionOk?: boolean;
  serviceEntitled?: boolean;
  policyAccepted?: boolean;
  contractActive?: boolean;
  billingActive?: boolean;
  approvedExceptionPresent?: boolean;
  accountIds?: string[];
}

export interface ConstraintRule {
  id: string;
  priority: number;
  when: ConstraintRuleWhen;
  then: {
    decision: ConstraintDecisionType;
    reason: string;
  };
}

export interface ConstraintPolicy {
  id: string;
  name: string;
  description?: string;
  guardrails?: {
    maxReviewDelta?: number;
    maxBlockDelta?: number;
  };
  rules: ConstraintRule[];
}

export interface ConstraintEvaluationInput {
  toolName: string;
  accountId: string;
  readOnly: boolean;
  actionName?: string;
  resourceKind?: string;
  accessType?: string;
  oauthRequired?: boolean;
  serviceTier?: string;
  actorRole?: string;
  toolMode?: string;
  identitySource?: string;
  resourceTags?: string[];
  hasWriteIntent?: boolean;
  hasHumanReviewStep?: boolean;
  introspectionOk?: boolean;
  serviceEntitled?: boolean;
  policyAccepted?: boolean;
  contractActive?: boolean;
  billingActive?: boolean;
  approvedExceptionPresent?: boolean;
}

export interface ConstraintEvaluationResult {
  decision: ConstraintDecisionType;
  reason: string;
  matchedRuleIds: string[];
  engine: 'legacy_v1' | 'polar_v1';
  policyHash?: string;
  compilerVersion?: string;
  evaluationPath: 'legacy' | 'primary' | 'fallback';
  fallbackReason?: string | null;
  latencyMs: number;
}

export type ContextFact = [string, ...Array<string | number | boolean>];

export interface CompiledConstraintPolicy {
  engine: 'polar_v1';
  compilerVersion: string;
  policyPolar: string;
  policyHash: string;
  fallbackIrJson: string;
  contextFacts: ContextFact[];
  runtimePolicyHash: string;
}

export interface OsoPrimaryConfig {
  url?: string;
  apiKey?: string;
  fetchTimeoutMillis?: number;
  bootstrapPolicy?: boolean;
}

export interface HybridEvaluatorConfig {
  mode?: 'legacy' | 'hybrid' | 'polar';
  fallbackEnabled?: boolean;
  oso?: OsoPrimaryConfig;
}

export interface RolloutConfig {
  mode: 'legacy_enforce' | 'shadow' | 'polar_enforce';
  canaryPercent: number;
}

export interface RolloutEvaluationResult {
  final: ConstraintEvaluationResult;
  legacy: ConstraintEvaluationResult;
  polar: ConstraintEvaluationResult;
  mismatch: boolean;
  sampledPolar: boolean;
}
