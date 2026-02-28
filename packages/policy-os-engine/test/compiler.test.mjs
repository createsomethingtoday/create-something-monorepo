import test from 'node:test';
import assert from 'node:assert/strict';
import {
  compileConstraintPolicy,
  evaluateConstraintPolicyLocal,
  shouldSampleCanary,
} from '../dist/index.js';

const basePolicy = {
  id: 'p1',
  name: 'Policy 1',
  rules: [
    {
      id: 'r2',
      priority: 20,
      when: { hasWriteIntent: true },
      then: { decision: 'require_human_review', reason: 'writes require review' },
    },
    {
      id: 'r1',
      priority: 10,
      when: { toolNames: ['workflow_get'] },
      then: { decision: 'allow', reason: 'safe read path' },
    },
  ],
};

test('compileConstraintPolicy is deterministic across rule ordering', () => {
  const a = compileConstraintPolicy(basePolicy);
  const b = compileConstraintPolicy({
    ...basePolicy,
    rules: [...basePolicy.rules].reverse(),
  });

  assert.equal(a.policyHash, b.policyHash);
  assert.equal(a.policyPolar, b.policyPolar);
});

test('evaluateConstraintPolicyLocal enforces hard read-only guard', () => {
  const result = evaluateConstraintPolicyLocal(
    {
      toolName: 'workflow_map_from_tool_sequence',
      accountId: 'public',
      readOnly: true,
      hasWriteIntent: true,
      hasHumanReviewStep: false,
      introspectionOk: true,
    },
    basePolicy,
  );

  assert.equal(result.decision, 'block');
  assert.equal(result.matchedRuleIds[0], 'hard_guard_readonly_write');
});

test('shouldSampleCanary is stable for same input', () => {
  const one = shouldSampleCanary('account:entity:tool', 35);
  const two = shouldSampleCanary('account:entity:tool', 35);
  assert.equal(one, two);
});
