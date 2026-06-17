function matchesRule(rule, input) {
    const when = rule.when;
    if (when.toolNames && when.toolNames.length > 0 && !when.toolNames.includes(input.toolName))
        return false;
    if (typeof when.hasWriteIntent === 'boolean' && when.hasWriteIntent !== Boolean(input.hasWriteIntent))
        return false;
    if (typeof when.hasHumanReviewStep === 'boolean' && when.hasHumanReviewStep !== Boolean(input.hasHumanReviewStep))
        return false;
    if (typeof when.introspectionOk === 'boolean' && when.introspectionOk !== input.introspectionOk)
        return false;
    if (when.accountIds && when.accountIds.length > 0 && !when.accountIds.includes(input.accountId))
        return false;
    return true;
}
function atlasSignals(input) {
    return {
        touchpoint: 'mcp_server',
        aiTask: input.toolName === 'mcp_map_to_workflow' ? 'analyze' : 'orchestrate',
        humanOversight: input.hasHumanReviewStep ? 'recommended' : 'optional',
        constraint: input.hasWriteIntent ? 'compliance' : 'permission',
    };
}
export function evaluateJudgment(input, policy) {
    // Structural hard guard remains in place even when policy is operator-edited.
    if (input.readOnly && input.hasWriteIntent) {
        return {
            decision: 'block',
            reason: 'Read-only account cannot execute write-intent workflow path.',
            matchedRuleIds: ['hard_guard_readonly_write'],
            engine: 'legacy_v1',
            evaluationPath: 'legacy',
            atlasSignals: atlasSignals(input),
        };
    }
    const ordered = [...policy.rules].sort((a, b) => a.priority - b.priority);
    const match = ordered.find((rule) => matchesRule(rule, input));
    if (match) {
        return {
            decision: match.then.decision,
            reason: match.then.reason,
            matchedRuleIds: [match.id],
            engine: 'legacy_v1',
            evaluationPath: 'legacy',
            atlasSignals: atlasSignals(input),
        };
    }
    return {
        decision: 'allow',
        reason: 'No policy rule matched; default allow.',
        matchedRuleIds: ['policy_default_allow'],
        engine: 'legacy_v1',
        evaluationPath: 'legacy',
        atlasSignals: atlasSignals(input),
    };
}
//# sourceMappingURL=evaluate.js.map