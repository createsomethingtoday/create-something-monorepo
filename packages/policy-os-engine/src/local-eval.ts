import type {
  ConstraintEvaluationInput,
  ConstraintEvaluationResult,
  ConstraintPolicy,
  ConstraintRule,
} from './types.js';

function matchesRule(rule: ConstraintRule, input: ConstraintEvaluationInput): boolean {
  const when = rule.when;
  if (when.actionNames && when.actionNames.length > 0 && !when.actionNames.includes(input.actionName ?? '')) return false;
  if (when.resourceKinds && when.resourceKinds.length > 0 && !when.resourceKinds.includes(input.resourceKind ?? '')) return false;
  if (when.accessTypes && when.accessTypes.length > 0 && !when.accessTypes.includes(input.accessType ?? '')) return false;
  if (typeof when.oauthRequired === 'boolean' && when.oauthRequired !== Boolean(input.oauthRequired)) return false;
  if (when.serviceTiers && when.serviceTiers.length > 0 && !when.serviceTiers.includes(input.serviceTier ?? '')) return false;
  if (when.actorRoles && when.actorRoles.length > 0 && !when.actorRoles.includes(input.actorRole ?? '')) return false;
  if (when.toolModes && when.toolModes.length > 0 && !when.toolModes.includes(input.toolMode ?? '')) return false;
  if (
    when.identitySources &&
    when.identitySources.length > 0 &&
    !when.identitySources.includes(input.identitySource ?? '')
  ) {
    return false;
  }
  if (
    when.resourceTags &&
    when.resourceTags.length > 0 &&
    !when.resourceTags.some((tag) => (input.resourceTags ?? []).includes(tag))
  ) {
    return false;
  }
  if (when.toolNames && when.toolNames.length > 0 && !when.toolNames.includes(input.toolName)) return false;
  if (typeof when.hasWriteIntent === 'boolean' && when.hasWriteIntent !== Boolean(input.hasWriteIntent)) return false;
  if (
    typeof when.hasHumanReviewStep === 'boolean' &&
    when.hasHumanReviewStep !== Boolean(input.hasHumanReviewStep)
  ) {
    return false;
  }
  if (typeof when.introspectionOk === 'boolean' && when.introspectionOk !== Boolean(input.introspectionOk)) return false;
  if (typeof when.serviceEntitled === 'boolean' && when.serviceEntitled !== Boolean(input.serviceEntitled)) return false;
  if (typeof when.policyAccepted === 'boolean' && when.policyAccepted !== Boolean(input.policyAccepted)) return false;
  if (typeof when.contractActive === 'boolean' && when.contractActive !== Boolean(input.contractActive)) return false;
  if (typeof when.billingActive === 'boolean' && when.billingActive !== Boolean(input.billingActive)) return false;
  if (
    typeof when.approvedExceptionPresent === 'boolean' &&
    when.approvedExceptionPresent !== Boolean(input.approvedExceptionPresent)
  ) {
    return false;
  }
  if (when.accountIds && when.accountIds.length > 0 && !when.accountIds.includes(input.accountId)) return false;
  return true;
}

export function evaluateConstraintPolicyLocal(
  input: ConstraintEvaluationInput,
  policy: ConstraintPolicy,
): ConstraintEvaluationResult {
  const started = Date.now();

  if (input.readOnly && input.hasWriteIntent) {
    return {
      decision: 'block',
      reason: 'Read-only account cannot execute write-intent workflow path.',
      matchedRuleIds: ['hard_guard_readonly_write'],
      engine: 'legacy_v1',
      evaluationPath: 'legacy',
      latencyMs: Date.now() - started,
    };
  }

  const ordered = [...policy.rules].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.id.localeCompare(b.id);
  });

  const match = ordered.find((rule) => matchesRule(rule, input));
  if (match) {
    return {
      decision: match.then.decision,
      reason: match.then.reason,
      matchedRuleIds: [match.id],
      engine: 'legacy_v1',
      evaluationPath: 'legacy',
      latencyMs: Date.now() - started,
    };
  }

  return {
    decision: 'allow',
    reason: 'No policy rule matched; default allow.',
    matchedRuleIds: ['policy_default_allow'],
    engine: 'legacy_v1',
    evaluationPath: 'legacy',
    latencyMs: Date.now() - started,
  };
}
