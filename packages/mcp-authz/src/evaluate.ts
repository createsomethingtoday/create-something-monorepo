import {
  evaluateConstraintPolicyWithRollout,
  type HybridEvaluatorConfig,
  type RolloutConfig,
} from '@create-something/policy-os-engine';
import { getCompiledPolicy, getConstraintPolicy, getPolicyManifest } from './policies.js';
import type {
  AuthorizationDecision,
  AuthorizationEvaluationResult,
  AuthorizationRequest,
} from './types.js';

function normalizeToolMode(request: AuthorizationRequest): string | null {
  if (request.actor.toolMode) return request.actor.toolMode;
  if (request.actor.readOnly) return 'read_only';
  return null;
}

function toConstraintInput(request: AuthorizationRequest) {
  return {
    toolName:
      request.resource.toolName ??
      request.resource.downstreamToolName ??
      request.resource.id ??
      request.action.name,
    accountId: request.actor.accountId,
    readOnly: Boolean(request.actor.readOnly) || normalizeToolMode(request) === 'read_only',
    actionName: request.action.name,
    resourceKind: request.resource.kind,
    accessType: request.resource.accessType ?? undefined,
    oauthRequired: request.resource.oauthRequired,
    actorRole: request.actor.role ?? undefined,
    toolMode: normalizeToolMode(request) ?? undefined,
    identitySource: request.actor.identitySource ?? undefined,
    resourceTags: request.resource.tags ?? undefined,
    hasWriteIntent: request.action.writeIntent,
    hasHumanReviewStep: request.action.humanReviewStep,
    introspectionOk: request.action.introspectionOk,
  };
}

function toDecision(
  policyId: string,
  rollout: RolloutConfig,
  input: {
    decision: AuthorizationDecision['decision'];
    reason: string;
    matchedRuleIds: string[];
    policyHash?: string;
    compilerVersion?: string;
    evaluationPath: AuthorizationDecision['evaluationPath'];
    fallbackReason?: string | null;
    latencyMs: number;
  },
  sampledPolar: boolean,
  mismatch: boolean,
): AuthorizationDecision {
  return {
    decision: input.decision,
    reason: input.reason,
    matchedRuleIds: input.matchedRuleIds,
    policyId,
    policyHash: input.policyHash ?? null,
    compilerVersion: input.compilerVersion ?? null,
    evaluationPath: input.evaluationPath,
    fallbackReason: input.fallbackReason ?? null,
    latencyMs: Math.max(0, Math.floor(input.latencyMs)),
    rolloutMode: rollout.mode,
    canaryPercent: rollout.canaryPercent,
    sampledPolar,
    mismatch,
  };
}

export async function evaluateAuthorizationRequest(
  policyId: string,
  request: AuthorizationRequest,
  rollout: RolloutConfig,
  config: HybridEvaluatorConfig,
): Promise<AuthorizationEvaluationResult> {
  const manifest = getPolicyManifest(policyId);
  const policy = getConstraintPolicy(policyId);
  const compiled = getCompiledPolicy(policyId);
  const result = await evaluateConstraintPolicyWithRollout(
    toConstraintInput(request),
    policy,
    rollout,
    config,
  );

  return {
    final: toDecision(policyId, rollout, result.final, result.sampledPolar, result.mismatch),
    legacy: toDecision(policyId, rollout, result.legacy, false, result.mismatch),
    polar: toDecision(policyId, rollout, result.polar, true, result.mismatch),
    manifest,
    policy,
    compiled,
    request,
  };
}

export function blockedByPolicy(decision: AuthorizationDecision): string | null {
  return decision.decision === 'block' ? decision.policyId : null;
}

export function requiresHumanReview(decision: AuthorizationDecision): boolean {
  return decision.decision === 'require_human_review';
}
