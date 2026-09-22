import test from 'node:test';
import assert from 'node:assert/strict';
import { choose, selectCandidate, reviewEvidence } from './decisions.mjs';
const options = { apiKey: 'test', reserve: async () => true };
function transport(choice, confidence = 0.95) {
  return async (_url, init) => {
    const request = JSON.parse(init.body),
      keys = Object.keys(request.questions.decision.criteria);
    return {
      ok: true,
      json: async () => ({
        model: 'jev-test',
        answers: {
          decision: {
            type: 'choice',
            choice,
            confidence,
            probabilities: Object.fromEntries(keys.map((k) => [k, k === choice ? 1 : 0]))
          }
        }
      })
    };
  };
}
test('candidate routing only selects provided candidates and preserves model', async () => {
  const result = await selectCandidate({
    ...options,
    query: 'build failed',
    candidates: [{ id: 'diagnose', description: 'Diagnose a failure' }],
    fetchImpl: transport('diagnose')
  });
  assert.equal(result.choice, 'diagnose');
  assert.equal(result.model, 'jev-test');
  assert.equal(result.status, 'accepted');
});
test('low certainty returns explicit no-match with raw judgment retained', async () => {
  const result = await selectCandidate({
    ...options,
    query: 'ambiguous',
    candidates: [{ id: 'diagnose', description: 'Diagnosis' }],
    fetchImpl: transport('diagnose', 0.2)
  });
  assert.equal(result.choice, 'no_match');
  assert.equal(result.answer.choice, 'diagnose');
});
test('unavailable provider and denied budget preserve evidence escalation', async () => {
  for (const extra of [
    {
      fetchImpl: async () => {
        throw Error('secret');
      }
    },
    { reserve: async () => false }
  ]) {
    const result = await reviewEvidence({ ...options, ...extra, claim: 'done', evidence: {} });
    assert.equal(result.choice, 'insufficient');
    assert.equal(result.status, 'fallback');
    assert.ok(!JSON.stringify(result).includes('secret'));
  }
});
test('invented candidates fail validation and cannot become routes', async () => {
  const result = await selectCandidate({
    ...options,
    query: 'test',
    candidates: [{ id: 'known', description: 'Known' }],
    fetchImpl: transport('invented')
  });
  assert.equal(result.choice, 'no_match');
});
test('invalid thresholds and duplicate candidate IDs reject before inference', async () => {
  await assert.rejects(
    choose({ ...options, criteria: { unknown: '' }, fallback: 'unknown', minConfidence: NaN }),
    /threshold/
  );
  await assert.rejects(
    selectCandidate({
      ...options,
      candidates: [
        { id: 'x', description: '' },
        { id: 'x', description: '' }
      ]
    }),
    /candidate/
  );
});
