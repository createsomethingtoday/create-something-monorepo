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
test('maximum eligible batches are bounded and preserve every URL including duplicates', async () => {
  const urls = Array.from({ length: 32 }, (_, i) => `https://example.test/a${i % 10}`);
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

test('batches outside the evaluated size retain incumbent routing as a whole', async () => {
  const urls = Array.from({ length: 40 }, (_, i) => `https://example.test/page${i}`);
  let jevCalls = 0;
  const actual = await classifyUrls(urls, 'https://example.test/', {
    jev: {
      apiKey: 'key',
      fetchImpl: async () => {
        jevCalls++;
        return new Response('', { status: 500 });
      }
    }
  });
  assert.equal(jevCalls, 0);
  assert.deepEqual(
    actual.map((row) => row.url),
    urls
  );
});

test('general legal pages do not satisfy the template-license discovery hint', async () => {
  const paths = [
    '/terms',
    '/legal',
    '/privacy-policy',
    '/cookie-policy',
    '/terms-of-service',
    '/templates/licensing',
    '/legal/licenses'
  ];
  const urls = paths.map((path) => `https://example.test${path}`);
  const rows = await classifyUrls(urls, 'https://example.test/', { useLLM: false });
  assert.deepEqual(
    rows.map((row) => row.classification),
    [
      'utility:other',
      'utility:other',
      'utility:other',
      'utility:other',
      'utility:other',
      'utility:license',
      'utility:license'
    ]
  );
  assert.deepEqual(
    rows.map((row) => row.url),
    urls
  );
});

test('receipts distinguish provider failure from valid abstention without exposing paths', async () => {
  const failures = [
    {
      response: () => new Response('sensitive-provider-body', { status: 429 }),
      reason: 'rate_limited'
    },
    {
      response: () => new Response('sensitive-provider-body', { status: 529 }),
      reason: 'overloaded'
    },
    {
      response: () => Response.json({ ...answer(), model: 'wrong-version' }),
      reason: 'model_mismatch'
    },
    {
      response: () => Response.json({ model: 'jev-1.13.0', answers: {} }),
      reason: 'invalid_response'
    }
  ];
  for (const scenario of failures) {
    const receipts: any[] = [];
    await classifyUrls(input, input[0], {
      jev: {
        apiKey: 'key',
        fetchImpl: async () => scenario.response(),
        onReceipt: (r) => receipts.push(r)
      }
    });
    assert.equal(receipts[0].failureReason, scenario.reason);
    assert.doesNotMatch(JSON.stringify(receipts), /sensitive-provider-body|example.test|ayuda/);
  }
  for (const [choice, confidence, field] of [
    ['no_match', 1, 'abstained'],
    ['content', 0.4, 'lowConfidence']
  ] as const) {
    const receipts: any[] = [];
    await classifyUrls(input, input[0], {
      jev: {
        apiKey: 'key',
        fetchImpl: async () => Response.json(answer(choice, confidence)),
        onReceipt: (r) => receipts.push(r)
      }
    });
    assert.equal(receipts[0].status, 'ok');
    assert.equal(receipts[0][field], 1);
    assert.equal(receipts[0].failureReason, undefined);
  }
});

test('legacy inference preserves exact legal routes and uses the narrower license rubric', async (t) => {
  const urls = ['https://example.test/legal/terms', 'https://example.test/legal/licenses'];
  let prompt = '';
  t.mock.method(globalThis, 'fetch', async (_url: unknown, init?: RequestInit) => {
    prompt = JSON.parse(String(init?.body)).messages[1].content;
    return new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                urls: urls.map((url) => ({ url, classification: 'utility:license', confidence: 1 }))
              })
            }
          }
        ]
      })
    );
  });
  const results = await classifyUrls(urls, 'https://example.test/', { apiKey: 'test-key' });
  assert.deepEqual(
    results.map((row) => row.classification),
    ['utility:other', 'utility:license']
  );
  assert.doesNotMatch(prompt, /License\/terms\/legal pages/);
  assert.match(prompt, /asset licensing/);
});
