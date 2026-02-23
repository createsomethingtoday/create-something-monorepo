import test from 'node:test';
import assert from 'node:assert/strict';

import { routeProblem } from '../dist/problem-routing.js';

function getClassification(result) {
  return result.classification ?? {};
}

function getRouting(result) {
  return result.routing ?? {};
}

test('routes pure logic task to pure_reasoner', () => {
  const result = routeProblem({
    task: 'Prove whether this optimization conjecture is valid using first principles.',
    context: 'No external tools required; produce a defensible logical argument.',
    requiresToolOrchestration: false,
    stakeholderCount: 1,
    expectedDurationMinutes: 45,
    riskLevel: 'medium',
    domainCriticality: 'medium',
    isCodeTask: false,
  });

  const classification = getClassification(result);
  const routing = getRouting(result);

  assert.equal(classification.primaryAxis, 'reasoning');
  assert.equal(routing.profile, 'pure_reasoner');
  assert.ok(Array.isArray(routing.stagePlan));
  assert.equal(routing.stagePlan[0]?.mode, 'naked_reasoner');
});

test('routes sustained coding execution to specialist_coder', () => {
  const result = routeProblem({
    task: 'Migrate a multi-repo backend service and close 80 issues with tool automation.',
    context: 'Needs API calls, file edits, tests, and dependency coordination across teams.',
    requiresToolOrchestration: true,
    stakeholderCount: 7,
    expectedDurationMinutes: 600,
    riskLevel: 'high',
    domainCriticality: 'medium',
    isCodeTask: true,
  });

  const classification = getClassification(result);
  const routing = getRouting(result);

  assert.ok(['effort', 'coordination'].includes(classification.primaryAxis));
  assert.equal(routing.profile, 'specialist_coder');
  assert.ok(
    routing.guardrails.includes('Gate merge on tests + static checks + rollback path.'),
    'expected code safety guardrail',
  );
});

test('routes ambiguity-heavy problem to human_judgment_first', () => {
  const result = routeProblem({
    task: 'Customer asks for better reporting but signals are contradictory and strategy is unclear.',
    context: 'Need to define what problem to solve before committing roadmap.',
    requiresToolOrchestration: false,
    stakeholderCount: 5,
    expectedDurationMinutes: 120,
    riskLevel: 'high',
    domainCriticality: 'high',
    isCodeTask: false,
  });

  const classification = getClassification(result);
  const routing = getRouting(result);

  assert.ok(typeof classification.primaryAxis === 'string');
  assert.equal(routing.profile, 'human_judgment_first');
  assert.equal(routing.stagePlan[0]?.mode, 'human_gate');
  assert.ok(
    routing.guardrails.includes('Require human checkpoint before irreversible actions.'),
    'expected human checkpoint guardrail',
  );
});
