import assert from 'node:assert/strict';
import test from 'node:test';
import { replayDecisionScenarios, type DecisionScenario } from '../src/decision-replay.js';
import type { DecisionRequest, DecisionSelector } from '../src/decisions.js';

const request: DecisionRequest = { id: 'case-1', scope: 'workspace', policyVersion: 'policy-1',
  stateVersion: 'state-1', question: 'Which next step?', candidates: [
    { id: 'inspect', description: 'Inspect evidence' }, { id: 'verify', description: 'Run verifier' }
  ], fallbackId: 'inspect', mode: 'fresh' };
const scenario = (): DecisionScenario => ({ request, current: request, expectedChoiceId: 'verify' });
const candidate: DecisionSelector = { provider: 'fixture', model: 'fixture', version: '2',
  async select(value) {
    assert.equal('expectedChoiceId' in value, false);
    assert.equal('candidateOutcome' in value, false);
    return { choice: 'verify' };
  } };

test('replay compares identical inputs to explicit baseline and proposes review only', async () => {
  const result = await replayDecisionScenarios([scenario()], { candidate });
  assert.equal(result.improvements, 1);
  assert.equal(result.regressions, 0);
  assert.equal(result.proposal, 'review_candidate');
  assert.equal(result.requiresHumanReview, true);
  assert.equal(result.downstreamImprovement, 'not_established');
  assert.equal(result.baseline.missingOrUnknownOutcomes, 1);
  assert.equal(result.candidate.missingCosts, 1);
  assert.equal(result.rows[0].baseline.receipt.requestHash, result.rows[0].candidate.receipt.requestHash);
  assert.equal(result.suiteHash, (await replayDecisionScenarios([scenario()], { candidate })).suiteHash);
});

test('regression retains baseline even with an improvement elsewhere', async () => {
  const first = scenario();
  first.expectedChoiceId = 'inspect';
  const second = scenario();
  second.request = { ...request, id: 'case-2' };
  second.current = second.request;
  const result = await replayDecisionScenarios([first, second], { candidate });
  assert.equal(result.improvements, 1);
  assert.equal(result.regressions, 1);
  assert.equal(result.proposal, 'retain_baseline');
});

test('replay retains provider failures and separates supplied downstream observations', async () => {
  const value = scenario();
  value.candidateOutcome = { status: 'verified_failure', evidenceRef: 'fixture:failed-check',
    durationMs: 80, costUsd: 0.1, retries: 2, selectedId: 'inspect', selectorVersion: '2' };
  const result = await replayDecisionScenarios([value], { candidate: { ...candidate,
    async select() { throw new Error('provider unavailable'); } } });
  assert.equal(result.candidate.selectorFailures, 1);
  assert.equal(result.candidate.fallbacks, 1);
  assert.equal(result.candidate.verifiedFailures, 1);
  assert.equal(result.candidate.observedRetries, 2);
  assert.equal(result.candidate.observedCostUsd, 0.1);
  assert.equal(result.downstreamImprovement, 'not_established');
  assert.equal(result.proposal, 'retain_baseline');
});

test('rejects duplicate scenarios, unknown labels and outcomes for blocked choices', async () => {
  await assert.rejects(replayDecisionScenarios([scenario(), scenario()], { candidate }), /unique/);
  await assert.rejects(replayDecisionScenarios([{ ...scenario(), expectedChoiceId: 'approve' }], { candidate }));
  await assert.rejects(replayDecisionScenarios([{ ...scenario(),
    current: { ...request, stateVersion: 'changed' }, candidateOutcome: {
      status: 'verified_success', evidenceRef: 'fixture:bad-binding', durationMs: 0, retries: 0,
      selectedId: 'verify', selectorVersion: '2'
    } }], { candidate }), /match replayed/);
});
