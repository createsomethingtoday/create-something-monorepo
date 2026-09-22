import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyUrls } from './url-classifier.js';

test('Jev prioritizes ambiguous paths while preserving exact routing, order, and URLs', async () => {
  let calls = 0;
  const urls = [
    'https://example.test/',
    'https://example.test/licenses',
    'https://example.test/guia-de-inicio?token=private'
  ];
  const results = await classifyUrls(urls, urls[0], {
    jev: {
      apiKey: 'test-key',
      fetchImpl: async (_url, init) => {
        calls++;
        const body = JSON.parse(String(init?.body));
        assert.doesNotMatch(JSON.stringify(body), /example\.test|private|licenses/);
        assert.equal(Object.keys(body.questions).length, 1);
        const criteria = body.questions.u2.criteria;
        return Response.json({
          model: 'jev-1.13.0',
          answers: {
            u2: {
              type: 'choice',
              choice: 'utility:instructions',
              confidence: 0.95,
              probabilities: Object.fromEntries(
                Object.keys(criteria).map((k) => [k, k === 'utility:instructions' ? 1 : 0])
              )
            }
          }
        });
      }
    }
  });
  assert.equal(calls, 1);
  assert.deepEqual(
    results.map((r) => r.url),
    urls
  );
  assert.deepEqual(
    results.map((r) => r.classification),
    ['homepage', 'utility:license', 'utility:instructions']
  );
  assert.equal(results[2].priority, 'critical');
});

import { classifyUrlsDeterministic } from './url-classifier.js';
import { JEV_URL_CRITERIA } from './jev-url-classifier.js';
const input = ['https://example.test/', 'https://example.test/ayuda'];
function answer(choice = 'utility:instructions', confidence = 0.9) {
  return {
    model: 'jev-1.13.0',
    answers: {
      u1: {
        type: 'choice',
        choice,
        confidence,
        probabilities: Object.fromEntries(
          Object.keys(JEV_URL_CRITERIA).map((k) => [k, k === choice ? 1 : 0])
        )
      }
    }
  };
}
for (const [name, payload] of [
  ['unknown choice', answer('error-page')],
  ['low confidence', answer('utility:instructions', 0.4)],
  ['abstention', answer('no_match')],
  ['missing answer', { model: 'jev-1.13.0', answers: {} }],
  ['wrong model', { ...answer(), model: 'other' }],
  [
    'invalid distribution',
    {
      model: 'jev-1.13.0',
      answers: {
        u1: { type: 'choice', choice: 'content', confidence: 1, probabilities: { content: 1 } }
      }
    }
  ]
] as const) {
  test(`Jev ${name} preserves the deterministic result`, async () => {
    const actual = await classifyUrls(input, input[0], {
      jev: { apiKey: 'key', fetchImpl: async () => Response.json(payload) }
    });
    assert.deepEqual(actual, classifyUrlsDeterministic(input, input[0]));
  });
}
test('explicit disable and exact matches make no inference calls', async () => {
  let calls = 0;
  const jev = {
    apiKey: 'key',
    fetchImpl: async () => {
      calls++;
      throw new Error('unexpected');
    }
  };
  await classifyUrls(input, input[0], { jev, useLLM: false });
  await classifyUrls(
    [input[0], 'https://example.test/404', 'https://example.test/license'],
    input[0],
    { jev }
  );
  assert.equal(calls, 0);
});
test('provider error and timeout fall back without retries or secret logging', async () => {
  for (const timeout of [false, true]) {
    let calls = 0;
    const receipts: unknown[] = [];
    const actual = await classifyUrls(input, input[0], {
      jev: {
        apiKey: 'never-log-key',
        timeoutMs: 5,
        onReceipt: (r) => receipts.push(r),
        fetchImpl: async (_url, init) => {
          calls++;
          if (!timeout) return new Response('never-log-key', { status: 429 });
          return new Promise<Response>((_resolve, reject) =>
            init?.signal?.addEventListener('abort', () => reject(new Error('timeout')))
          );
        }
      }
    });
    assert.deepEqual(actual, classifyUrlsDeterministic(input, input[0]));
    assert.equal(calls, 1);
    assert.equal(receipts.length, 1);
    assert.doesNotMatch(JSON.stringify(receipts), /never-log-key|example.test|ayuda/);
  }
});
test('large inputs are bounded and preserve every URL including duplicates', async () => {
  const urls = Array.from({ length: 70 }, (_, i) => `https://example.test/a${i % 10}`);
  let calls = 0;
  const actual = await classifyUrls(urls, 'https://example.test/', {
    jev: {
      apiKey: 'key',
      fetchImpl: async (_url, init) => {
        calls++;
        const body = JSON.parse(String(init?.body));
        assert.ok(Object.keys(body.questions).length <= 8);
        assert.ok(String(init?.body).length < 20000);
        return Response.json({
          model: 'jev-1.13.0',
          answers: Object.fromEntries(
            Object.keys(body.questions).map((id) => [id, answer('content').answers.u1])
          )
        });
      }
    }
  });
  assert.equal(calls, 4);
  assert.deepEqual(
    actual.map((r) => r.url),
    urls
  );
});
