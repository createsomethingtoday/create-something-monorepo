import assert from 'node:assert/strict';
import test from 'node:test';
import { createJevDecisionSelector, createOpenAIDecisionSelector } from '../src/decision-providers.js';

const request = {
  id: 'decision-1', scope: 'tenant-1', policyVersion: 'policy-1', stateVersion: 'state-1',
  question: 'Which candidate should handle this request?',
  candidates: [{ id: 'inspect', description: 'Inspect evidence' }, { id: 'verify', description: 'Run checks' }],
  fallbackId: 'inspect', mode: 'fresh' as const
};
const signal = new AbortController().signal;
const jevResponse = () => ({ model: 'jev-1.13.0', answers: { selection: {
  type: 'choice', choice: 'verify', confidence: 0.8,
  probabilities: { inspect: 0.1, verify: 0.8, no_match: 0.1 }
} } });
const openaiResponse = () => ({ model: 'gpt-6-luna', answers: [{
  name: 'selection', type: 'choice', choice: 'verify', confidence: 0.8,
  probabilities: [{ value: 'inspect', probability: 0.1 }, { value: 'verify', probability: 0.8 },
    { value: 'no_match', probability: 0.1 }]
}] });

test('Jev sends fixed choices and full question, preserves signal and normalizes choice', async () => {
  let calls = 0;
  const selector = createJevDecisionSelector(async (body, options) => {
    calls++;
    assert.equal(options.signal, signal);
    assert.equal(body.model, 'jev-1.13.0');
    assert.deepEqual(Object.keys(body.questions.selection.criteria), ['inspect', 'verify', 'no_match']);
    assert.ok(body.questions.selection.instructions.includes(request.question));
    return jevResponse();
  });
  assert.deepEqual(await selector.select(request, signal), { choice: 'verify' });
  assert.equal(calls, 1);
});

test('OpenAI uses documented Decisions request shape and disables SDK retries', async () => {
  const selector = createOpenAIDecisionSelector({ decisions: { async create(body, options) {
    assert.equal(options.signal, signal);
    assert.equal(options.maxRetries, 0);
    assert.equal(body.model, 'gpt-6-luna');
    assert.equal(body.questions[0].name, 'selection');
    assert.equal(body.questions[0].type, 'choice');
    assert.deepEqual(body.questions[0].choices.map(item => item.value), ['inspect', 'verify', 'no_match']);
    assert.ok(body.questions[0].instructions.includes(request.question));
    return openaiResponse();
  } } });
  assert.deepEqual(await selector.select(request, signal), { choice: 'verify' });
});

test('Jev no_match and ties abstain', async () => {
  for (const answer of [
    { choice: 'no_match', confidence: 0.9, probabilities: { inspect: 0.05, verify: 0.05, no_match: 0.9 } },
    { choice: 'verify', confidence: 0.5, probabilities: { inspect: 0.5, verify: 0.5, no_match: 0 } }
  ]) {
    const response = jevResponse();
    response.answers.selection = { type: 'choice', ...answer };
    assert.deepEqual(await createJevDecisionSelector(async () => response).select(request, signal), { choice: null });
  }
});

test('OpenAI refusal, no_match and ties abstain', async () => {
  for (const response of [
    { model: 'gpt-6-luna', answers: [{ type: 'refusal', name: 'selection' }] },
    { model: 'gpt-6-luna', answers: [{ name: 'selection', type: 'choice', choice: 'no_match', confidence: 0.8,
      probabilities: [{ value: 'inspect', probability: 0.1 }, { value: 'verify', probability: 0.1 }, { value: 'no_match', probability: 0.8 }] }] },
    { model: 'gpt-6-luna', answers: [{ name: 'selection', type: 'choice', choice: 'verify', confidence: 0.5,
      probabilities: [{ value: 'inspect', probability: 0.5 }, { value: 'verify', probability: 0.5 }, { value: 'no_match', probability: 0 }] }] }
  ]) {
    assert.deepEqual(await createOpenAIDecisionSelector({ decisions: { create: async () => response } }).select(request, signal), { choice: null });
  }
});

test('Jev rejects malformed/model-mismatched/incomplete/non-winning results', async () => {
  for (const mutate of [
    (r: any) => { r.model = 'other'; },
    (r: any) => { delete r.answers.selection.probabilities.no_match; },
    (r: any) => { r.answers.selection.probabilities.no_match = 0.7; },
    (r: any) => { r.answers.selection.probabilities.inspect = NaN; },
    (r: any) => { r.answers.selection.confidence = -1; },
    (r: any) => { r.answers.selection.choice = 'invented'; },
    (r: any) => { r.answers.selection.choice = 'inspect'; },
    (r: any) => { r.answers.extra = r.answers.selection; }
  ]) {
    const response = jevResponse(); mutate(response);
    await assert.rejects(createJevDecisionSelector(async () => response).select(request, signal));
  }
});

test('OpenAI rejects malformed/model-mismatched/incomplete/non-winning results', async () => {
  for (const mutate of [
    (r: any) => { r.model = 'other'; },
    (r: any) => { r.answers[0].name = 'wrong'; },
    (r: any) => { r.answers[0].probabilities.pop(); },
    (r: any) => { r.answers[0].probabilities[2] = r.answers[0].probabilities[0]; },
    (r: any) => { r.answers[0].probabilities[0].probability = Infinity; },
    (r: any) => { r.answers[0].confidence = 'high'; },
    (r: any) => { r.answers[0].choice = 'inspect'; },
    (r: any) => { r.answers.push(r.answers[0]); }
  ]) {
    const response = openaiResponse(); mutate(response);
    await assert.rejects(createOpenAIDecisionSelector({ decisions: { create: async () => response } }).select(request, signal));
  }
});

test('providers propagate failures without retry and do not invoke callbacks after cancellation', async () => {
  let calls = 0;
  const fail = async () => { calls++; throw new Error('provider unavailable'); };
  const selectors = [createJevDecisionSelector(fail), createOpenAIDecisionSelector({ decisions: { create: fail } })];
  for (const selector of selectors) await assert.rejects(selector.select(request, signal), /provider unavailable/);
  assert.equal(calls, 2);
  const aborted = AbortSignal.abort();
  for (const selector of selectors) await assert.rejects(selector.select(request, aborted));
  assert.equal(calls, 2);
});

test('providers reject a reserved or duplicate candidate before calling the transport', async () => {
  const fail = async () => { assert.fail('transport must not run'); };
  for (const selector of [createJevDecisionSelector(fail), createOpenAIDecisionSelector({ decisions: { create: fail } })]) {
    for (const candidates of [[{ id: 'no_match', description: 'Reserved' }], [request.candidates[0], request.candidates[0]]]) {
      await assert.rejects(selector.select({ ...request, candidates }, signal));
    }
  }
});

test('providers reject a response that arrives after cancellation', async () => {
  for (const provider of ['jev', 'openai']) {
    const controller = new AbortController();
    const callback = async () => {
      controller.abort();
      return provider === 'jev' ? jevResponse() : openaiResponse();
    };
    const selector = provider === 'jev' ? createJevDecisionSelector(callback) :
      createOpenAIDecisionSelector({ decisions: { create: callback } });
    await assert.rejects(selector.select(request, controller.signal));
  }
});

test('providers bound request payloads and omit tenant/run identifiers from evidence', async () => {
  const selectors = [
    createJevDecisionSelector(async body => {
      assert.ok(!JSON.stringify(body).includes(request.scope));
      assert.ok(!JSON.stringify(body).includes(request.id));
      return jevResponse();
    }),
    createOpenAIDecisionSelector({ decisions: { create: async body => {
      assert.ok(!JSON.stringify(body).includes(request.scope));
      assert.ok(!JSON.stringify(body).includes(request.id));
      return openaiResponse();
    } } })
  ];
  for (const selector of selectors) {
    assert.deepEqual(await selector.select(request, signal), { choice: 'verify' });
    await assert.rejects(selector.select({ ...request, question: 'x'.repeat(20_001) }, signal), /exceeds budget/);
  }
});
