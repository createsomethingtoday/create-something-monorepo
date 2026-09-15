import assert from 'node:assert/strict';
import test from 'node:test';
import { validateTemplateReviewHandoffObservation } from '../src/template-review-handoff-observation.js';

const digest = `sha256:${'1'.repeat(64)}`;
const observation = {
  schema: 'create-something/template-handoff-observation@1',
  dataClassification: 'minimized_status_evidence',
  requestSha256: digest,
  observedAt: '2026-09-14T23:00:01.000Z',
  state: 'confirmed',
  reason: 'review_ready',
  nextAction: 'await_review',
  evidenceSha256: `sha256:${'2'.repeat(64)}`
};
const context = {
  requestSha256: digest,
  dispatchedAt: '2026-09-14T23:00:00.000Z',
  receivedAt: '2026-09-14T23:00:02.000Z',
  maximumAgeMs: 30_000
};

test('accepts a fresh exact source result and retains uncertainty without authorizing action', () => {
  assert.deepEqual(validateTemplateReviewHandoffObservation(observation, context), observation);
  const unknown = {
    ...observation,
    state: 'insufficient_evidence',
    reason: 'version_missing',
    nextAction: 'inspect_source_evidence'
  };
  assert.deepEqual(validateTemplateReviewHandoffObservation(unknown, context), unknown);
});

test('rejects wrong request, stale/pre-dispatch/future evidence, raw fields and mismatched disposition', () => {
  for (const change of [
    { requestSha256: `sha256:${'3'.repeat(64)}` },
    { observedAt: '2026-09-14T22:59:59.000Z' },
    { observedAt: '2026-09-14T23:00:03.000Z' },
    { assetId: 'recAAAAAAAAAAAAAA' },
    { nextAction: 'resubmit' },
    { reason: 'version_missing' },
    { evidenceSha256: 'unsigned' },
    { schema: 'create-something/template-handoff-observation@2' }
  ])
    assert.throws(() =>
      validateTemplateReviewHandoffObservation({ ...observation, ...change }, context)
    );
  assert.throws(() =>
    validateTemplateReviewHandoffObservation(observation, {
      ...context,
      receivedAt: '2026-09-14T23:00:32.000Z'
    })
  );
});

test('rejects invalid freshness policy or backwards host clock', () => {
  for (const maximumAgeMs of [0, -1, NaN, Infinity, 1.5])
    assert.throws(() =>
      validateTemplateReviewHandoffObservation(observation, { ...context, maximumAgeMs })
    );
  assert.throws(() =>
    validateTemplateReviewHandoffObservation(observation, {
      ...context,
      receivedAt: '2026-09-14T22:59:59.000Z'
    })
  );
});


test('clock skew is explicit, bounded, and does not extend the observation age budget', () => {
  const early = { ...observation, observedAt: '2026-09-14T22:59:59.500Z' };
  assert.throws(() => validateTemplateReviewHandoffObservation(early, context));
  assert.deepEqual(validateTemplateReviewHandoffObservation(early, { ...context, maximumClockSkewMs: 500 }), early);
  assert.throws(() => validateTemplateReviewHandoffObservation(early, { ...context, maximumClockSkewMs: 499 }));
  assert.throws(() => validateTemplateReviewHandoffObservation(early, { ...context, maximumClockSkewMs: 500, maximumAgeMs: 2000 }));
  for (const maximumClockSkewMs of [-1, 0.5, 60001, Infinity])
    assert.throws(() => validateTemplateReviewHandoffObservation(observation, { ...context, maximumClockSkewMs }));
});
