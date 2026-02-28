import type {
  ConstraintEvaluationInput,
  ConstraintEvaluationResult,
  ConstraintPolicy,
  ConstraintRule,
} from './types.js';

function matchesRule(rule: ConstraintRule, input: ConstraintEvaluationInput): boolean {
  const when = rule.when;
  if (when.toolNames && when.toolNames.length > 0 && !when.toolNames.includes(input.toolName)) return false;
  if (typeof when.hasWriteIntent === 'boolean' && when.hasWriteIntent !== Boolean(input.hasWriteIntent)) return false;
  if (
    typeof when.hasHumanReviewStep === 'boolean' &&
    when.hasHumanReviewStep !== Boolean(input.hasHumanReviewStep)
  ) {
    return false;
  }
  if (typeof when.introspectionOk === 'boolean' && when.introspectionOk !== Boolean(input.introspectionOk)) return false;
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
