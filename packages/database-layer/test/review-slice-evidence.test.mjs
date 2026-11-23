import test from 'node:test';
import assert from 'node:assert/strict';
import {
  prepareEvidenceReview,
  reviewEvidence,
  selectEvidence
} from '../scripts/review-slice-evidence.mjs';
const fixtures = {
  review: { slices: [{ id: 'slice', evidence: ['b.md', 'a.md'] }] },
  topology: {
    nodes: [
      {
        path: 'b.md',
        title: 'B',
        summary: 'secret=abc https://private.test',
        extra: 'never disclose'
      },
      { path: 'a.md', title: 'A' }
    ]
  }
};
const prepare = (id = 'slice', question = 'Which evidence?') =>
  prepareEvidenceReview(id, question, fixtures);
const answer = (choice) => async (input) => ({
  model: input.model,
  answers: {
    selection: {
      type: 'choice',
      choice,
      confidence: 1,
      probabilities: Object.fromEntries(
        Object.keys(input.questions.selection.criteria).map((id) => [id, Number(id === choice)])
      )
    }
  }
});
test('preview preserves every evidence path in original order and only sanitized metadata', async () => {
  const packet = prepare();
  assert.deepEqual(
    packet.candidates.map((c) => c.path),
    ['b.md', 'a.md']
  );
  const output = JSON.stringify(packet);
  assert.ok(!output.includes('abc'));
  assert.ok(!output.includes('private.test'));
  assert.ok(!output.includes('never disclose'));
  assert.equal((await reviewEvidence(packet)).status, 'preview');
});
test('selection uses shared validation and preserves full candidate list', async () => {
  const packet = prepare();
  const result = await reviewEvidence(packet, {
    live: true,
    prepare,
    evaluate: answer('evidence-2')
  });
  assert.equal(result.selectedPath, 'a.md');
  assert.deepEqual(
    result.orderedCandidates.map((c) => c.path),
    ['a.md', 'b.md']
  );
  assert.deepEqual(result.candidates, packet.candidates);
  assert.equal(
    await selectEvidence('Which?', packet.candidates, { evaluate: answer('no_match') }),
    'no_match'
  );
});
test('invalid provider responses throw; review retains baseline as fallback', async () => {
  const packet = prepare();
  const evaluate = async () => ({ model: 'wrong' });
  await assert.rejects(selectEvidence('Which?', packet.candidates, { evaluate }));
  assert.equal(
    (await reviewEvidence(packet, { live: true, prepare, evaluate })).reason,
    'provider_failure'
  );
  await assert.rejects(selectEvidence('Which?', packet.candidates, { provider: 'unknown' }));
});
test('stale and tampered packets never call provider', async () => {
  let called = false;
  const evaluate = async () => {
    called = true;
    throw Error();
  };
  const packet = prepare();
  packet.question = 'changed';
  assert.equal(
    (await reviewEvidence(packet, { live: true, prepare, evaluate })).reason,
    'stale_packet'
  );
  assert.equal(called, false);
});
test('timeout fails boundedly', async () => {
  await assert.rejects(
    selectEvidence('Which?', prepare().candidates, {
      evaluate: () => new Promise(() => {}),
      timeoutMs: 5
    })
  );
});
test('empty evidence stays fallback and singleton permits abstention', async () => {
  const emptyFixtures = {
    review: { slices: [{ id: 'empty', evidence: [] }] },
    topology: { nodes: [] }
  };
  const emptyPrepare = (id, question) => prepareEvidenceReview(id, question, emptyFixtures);
  const empty = emptyPrepare('empty', 'Where?');
  assert.equal(
    (await reviewEvidence(empty, { live: true, prepare: emptyPrepare })).reason,
    'no_candidates'
  );
  assert.equal(
    await selectEvidence('Where?', prepare().candidates.slice(0, 1), {
      evaluate: answer('no_match')
    }),
    'no_match'
  );
});
test('shared HTTP transport uses exact bounded offered IDs and rejects bad choice', async () => {
  const packet = prepare();
  let bytes = 0;
  await assert.rejects(
    selectEvidence('Where?', packet.candidates, {
      apiKey: 'fixture-key',
      fetch: async (url, options) => {
        assert.equal(url, 'https://api.typesafe.ai/v1/systemone');
        bytes = Buffer.byteLength(options.body);
        const input = JSON.parse(options.body);
        return new Response(JSON.stringify(await answer('foreign-id')(input)), { status: 200 });
      }
    })
  );
  assert.ok(bytes > 0 && bytes < 20000);
});
