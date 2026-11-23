import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evidenceCases,
  frozenPackets,
  evaluateEvidence,
  firstListed
} from '../scripts/evaluate-slice-evidence.mjs';
import { prepareEvidenceReview } from '../scripts/review-slice-evidence.mjs';

test('frozen public slice retains original packet ordering and answer paths exist', async () => {
  const packets = await frozenPackets(prepareEvidenceReview);
  assert.equal(packets.length, 8);
  for (const { testCase, packet } of packets) {
    assert.equal(packet.candidates.length, 6);
    assert.equal(packet.candidates[0].path, 'docs/CANON_DATABASE_LAYER_DESIGN.md');
    for (const expected of testCase.expected)
      assert.ok(expected === 'no_match' || packet.candidates.some((x) => x.path === expected));
    assert.ok(packet.candidates.every((x) => x.path.startsWith('docs/')));
  }
  const baseline = await evaluateEvidence(packets, firstListed);
  assert.equal(baseline.correct, 2);
  assert.equal(baseline.mistakes, 6);
});
test('errors remain separate from abstention and labels never reach ranker', async () => {
  const packets = await frozenPackets(prepareEvidenceReview);
  const abstain = await evaluateEvidence(packets, (input) => {
    assert.deepEqual(Object.keys(input).sort(), ['candidates', 'question']);
    assert.ok(!JSON.stringify(input).includes('expectedPaths'));
    return 'no_match';
  });
  assert.equal(abstain.correctNoMatch, 2);
  assert.equal(abstain.missedEvidence, 6);
  const failed = await evaluateEvidence(packets, () => {
    throw Object.assign(new Error('secret diagnostic'), { status: 429 });
  });
  assert.equal(failed.providerErrors, evidenceCases.length);
  assert.equal(failed.scoredCases, 0);
  assert.equal(failed.abstentions, 0);
  assert.ok(!JSON.stringify(failed).includes('secret diagnostic'));
});
