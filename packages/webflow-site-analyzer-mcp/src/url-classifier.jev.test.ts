import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyUrls } from './url-classifier.js';
const start = 'https://example.test/';
const makeJev = (selected = 'utility:license') => ({
  apiKey: 'test',
  reserve: async () => true,
  fetchImpl: (async (_url: unknown, init: RequestInit) => {
    const request = JSON.parse(init.body as string);
    assert.deepEqual(request.state, { path: '/conditions' });
    const criteria = request.questions.decision.criteria;
    return {
      ok: true,
      json: async () => ({
        model: 'jev-test',
        answers: {
          decision: {
            type: 'choice',
            choice: selected,
            confidence: 1,
            probabilities: Object.fromEntries(
              Object.keys(criteria).map((k) => [k, k === selected ? 1 : 0])
            )
          }
        }
      })
    };
  }) as typeof fetch
});
test('Jev classifies ambiguous paths without sending hostname or query and preserves exact URL', async () => {
  const url = `${start}conditions?token=private`;
  const [result] = await classifyUrls([url], start, { jev: makeJev() });
  assert.equal(result.url, url);
  assert.equal(result.classification, 'utility:license');
  assert.equal(result.priority, 'critical');
});
test('homepage and recognized utility paths never invoke Jev', async () => {
  const jev = makeJev();
  let calls = 0;
  jev.reserve = async () => {
    calls++;
    return true;
  };
  const results = await classifyUrls([start, `${start}license`], start, { jev });
  assert.equal(calls, 0);
  assert.equal(results[0].classification, 'homepage');
  assert.equal(results[1].priority, 'critical');
});
test('budget denial and explicit disable preserve deterministic result', async () => {
  const jev = makeJev();
  jev.reserve = async () => false;
  const [result] = await classifyUrls([`${start}conditions`], start, { jev });
  assert.equal(result.classification, 'content');
  const [disabled] = await classifyUrls([`${start}conditions`], start, {
    jev: makeJev(),
    useLLM: false
  });
  assert.equal(disabled.classification, 'content');
});
