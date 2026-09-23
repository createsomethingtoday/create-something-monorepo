import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  seal,
  prepareJudgment,
  recordJudgment,
  replayJudgment,
  verifyEvaluationSet
} from '../dist/judgment-data.js';

export function fixture() {
  return {
    schemaVersion: 'judgment-input.v1',
    caseId: 'exception:synthetic-1',
    groupId: 'synthetic-app-1',
    evidence: {
      cutoff: '2026-09-01T12:00:00Z',
      certification: 'synthetic',
      sources: [
        {
          id: 'finding',
          entityId: 'exception:synthetic-1',
          sourceRef: 'fixture:finding',
          capturedAt: '2026-09-01T11:00:00Z',
          kind: 'pre_decision',
          text: 'Only the naming finding is in scope. The developer acknowledges it.'
        }
      ]
    },
    policy: {
      id: 'exception-advisory',
      version: '1',
      scope: 'complete',
      mandatoryHumanReview: false,
      constraints: [
        {
          id: 'acknowledgment',
          applicability: 'applicable',
          evidenceIds: ['finding'],
          evaluator: 'semantic',
          question: 'Does the developer explicitly acknowledge the naming finding?',
          questionVersion: '1',
          minimumProbability: 0.8
        },
        {
          id: 'cors',
          applicability: 'not_applicable',
          evidenceIds: [],
          evaluator: 'deterministic',
          result: 'unknown'
        }
      ]
    }
  };
}
const answers = [{ constraintId: 'acknowledgment', value: 'yes', probability: 0.9 }];
const provider = {
  provider: 'typesafe',
  model: 'test-fixture',
  requestId: 'fixture-1',
  completedAt: '2026-09-01T12:01:00Z',
  latencyMs: 10
};

test('applicable predicates compose; irrelevant unknown does not block; receipt is advisory', () => {
  const input = seal(fixture());
  const request = prepareJudgment(input);
  assert.deepEqual(
    request.questions.map((q) => q.id),
    ['acknowledgment']
  );
  const receipt = recordJudgment(input, answers, provider);
  assert.equal(receipt.payload.result, 'prerequisites_supported');
  assert.equal(receipt.payload.authority, 'advisory_only');
  assert.deepEqual(replayJudgment(input, receipt), receipt.payload);
});

test('tampered evidence and wrong input receipt are rejected', () => {
  const input = seal(fixture());
  const receipt = recordJudgment(input, answers, provider);
  input.payload.evidence.sources[0].text += ' altered';
  assert.throws(() => replayJudgment(input, receipt), /integrity/);
  const changed = fixture();
  changed.policy.version = '2';
  assert.throws(() => replayJudgment(seal(changed), receipt), /input/);
});

for (const state of [
  'missing',
  'unknown-applicability',
  'incomplete-scope',
  'mandatory',
  'negative',
  'uncertain'
]) {
  test(`routes ${state} to human review`, () => {
    const f = fixture();
    let a = answers;
    if (state === 'missing') f.policy.constraints[0].evidenceIds = [];
    if (state === 'unknown-applicability') f.policy.constraints[1].applicability = 'unknown';
    if (state === 'incomplete-scope') f.policy.scope = 'incomplete';
    if (state === 'mandatory') f.policy.mandatoryHumanReview = true;
    if (state === 'negative') a = [{ ...answers[0], value: 'no' }];
    if (state === 'uncertain') a = [{ ...answers[0], probability: 0.55 }];
    const input = seal(f);
    const requested = prepareJudgment(input).questions;
    const receipt = recordJudgment(
      input,
      requested.length ? a : [],
      requested.length ? provider : null
    );
    assert.equal(receipt.payload.result, 'needs_human');
  });
}

test('rejects malformed, omitted, duplicate or unsolicited answers', () => {
  for (const a of [
    [],
    [...answers, ...answers],
    [{ ...answers[0], probability: 2 }],
    [{ ...answers[0], constraintId: 'cors' }]
  ]) {
    assert.throws(() => recordJudgment(seal(fixture()), a, provider));
  }
});

test('provider failures remain separate from semantic negatives', () => {
  const receipt = recordJudgment(seal(fixture()), [], null, 'unavailable');
  assert.equal(receipt.payload.result, 'needs_human');
  assert.equal(receipt.payload.providerStatus, 'unavailable');
  assert.deepEqual(receipt.payload.answers, []);
});

test('source identity conflicts, duplicate IDs and post-cutoff evidence fail closed', () => {
  const mutations = [
    (f) => (f.evidence.sources[0].entityId = 'exception:other'),
    (f) => f.evidence.sources.push(f.evidence.sources[0]),
    (f) => (f.evidence.sources[0].capturedAt = '2026-09-02T00:00:00Z'),
    (f) => f.policy.constraints.push(f.policy.constraints[0]),
    (f) => (f.policy.constraints[0].evidenceIds = ['absent']),
    (f) => (f.expectedLabel = 'approve'),
    (f) => (f.evidence.sources[0].kind = 'later_resolution')
  ];
  for (const mutate of mutations) {
    const f = fixture();
    mutate(f);
    assert.throws(() => prepareJudgment(seal(f)));
  }
});

test('evaluation refuses synthetic/proxy labels and creator/app leakage', () => {
  const input = seal(fixture());
  assert.throws(() => verifyEvaluationSet([input], []), /certified/);
  const f = fixture();
  f.evidence.certification = 'reviewer_verified';
  const certified = seal(f);
  const review = {
    inputDigest: certified.digest,
    reviewer: 'reviewer:fixture',
    reviewedAt: '2026-09-02T00:00:00Z',
    independent: true,
    split: 'held_out',
    label: 'prerequisites_supported'
  };
  assert.throws(() => verifyEvaluationSet([certified], [review]), /development/);
  const second = structuredClone(f);
  second.caseId = 'exception:synthetic-2';
  second.evidence.sources[0].entityId = second.caseId;
  const secondInput = seal(second);
  const secondReview = { ...review, inputDigest: secondInput.digest, split: 'development' };
  assert.throws(
    () => verifyEvaluationSet([certified, secondInput], [review, secondReview]),
    /group/
  );
});

test('valid independent split is eligible without claiming effectiveness', () => {
  const inputs = ['development', 'held_out'].map((split, index) => {
    const f = fixture();
    f.caseId += index;
    f.groupId += index;
    f.evidence.sources[0].entityId = f.caseId;
    f.evidence.certification = 'reviewer_verified';
    return seal(f);
  });
  const reviews = inputs.map((input, i) => ({
    inputDigest: input.digest,
    reviewer: 'reviewer:fixture',
    reviewedAt: '2026-09-02T00:00:00Z',
    independent: true,
    split: i ? 'held_out' : 'development',
    label: 'needs_human'
  }));
  assert.deepEqual(verifyEvaluationSet(inputs, reviews), {
    eligibleCases: 2,
    groups: 2,
    effectiveness: 'not_established'
  });
  assert.throws(() => verifyEvaluationSet(inputs, [reviews[0], reviews[0]]), /duplicate/);
});

test('request excludes unused evidence and threshold metadata', () => {
  const f = fixture();
  f.evidence.sources.push({
    ...f.evidence.sources[0],
    id: 'unrelated',
    text: 'Unrelated evidence'
  });
  const request = prepareJudgment(seal(f));
  assert.deepEqual(
    request.evidence.map((e) => e.id),
    ['finding']
  );
  assert.equal(JSON.stringify(request).includes('minimumProbability'), false);
  assert.equal(JSON.stringify(request).includes('certification'), false);
});

test('forged composed result is rejected even if attacker recomputes receipt hash', () => {
  const input = seal(fixture());
  const receipt = recordJudgment(input, answers, provider);
  receipt.payload.result = 'needs_human';
  assert.throws(() => replayJudgment(input, seal(receipt.payload)), /replay/);
});
