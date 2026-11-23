import test from 'node:test';
import assert from 'node:assert/strict';
import { rankVocabulary } from '../scripts/lib/vocabulary-decision.mjs';
const input = {subject: {id: 'type:delivery-partner', name: 'Delivery partner', description: 'Provider', excerpt: 'Delivers work'},
  candidates: [{id: 'type:vendor', name: 'Vendor', description: 'Provider', excerpt: 'Supplies work'}]};
function response(provider, choice = 'c1', probabilities = [0.9, 0.1]) {
  const answer = {type: 'choice', choice, confidence: 0.9};
  return provider === 'openai' ? {model: 'gpt-6-luna', answers: [{...answer, name: 'selection',
    probabilities: [{value: 'c1', probability: probabilities[0]}, {value: 'no_match', probability: probabilities[1]}]}]}
    : {model: 'jev-1.13.0', answers: {selection: {...answer, probabilities: {c1: probabilities[0], no_match: probabilities[1]}}}};
}
for (const provider of ['openai', 'jev']) {
  test(`${provider} sends one bounded advisory request and maps opaque ID back`, async () => {
    let calls = 0;
    const result = await rankVocabulary(input, {provider, apiKey: 'fake-key', fetch: async (url, options) => {
      calls++;
      assert.equal(options.redirect, 'manual');
      assert.equal(options.headers.authorization, 'Bearer fake-key');
      const body = JSON.parse(options.body);
      assert.equal(body.model, provider === 'openai' ? 'gpt-6-luna' : 'jev-1.13.0');
      assert.ok(JSON.stringify(body).includes('Delivery partner'));
      assert.equal(url, provider === 'openai' ? 'https://api.openai.com/v1/decisions' : 'https://api.typesafe.ai/v1/systemone');
      return Response.json(response(provider));
    }});
    assert.equal(calls, 1);
    assert.equal(result.choice, 'type:vendor');
    assert.equal(result.provider, provider);
  });
  test(`${provider} abstains on ties and validates provider output`, async () => {
    assert.equal((await rankVocabulary(input, {provider, apiKey: 'fake', fetch: async () => Response.json(response(provider, 'c1', [0.5, 0.5]))})).choice, 'no_match');
    await assert.rejects(rankVocabulary(input, {provider, apiKey: 'fake', fetch: async () => Response.json(response(provider, 'forged'))}), /Invalid decision/);
    await assert.rejects(rankVocabulary(input, {provider, apiKey: 'fake', fetch: async () => Response.json(response(provider, 'c1', [0.1, 0.1]))}), /Invalid decision/);
  });
}
test('fails closed on HTTP failure without retries or provider body exposure', async () => {
  let calls = 0;
  await assert.rejects(rankVocabulary(input, {apiKey: 'fake', fetch: async () => {calls++; return new Response('private body', {status: 429});}}), /Decision provider http failure/);
  assert.equal(calls, 1);
});
test('deadline bounds even a transport that ignores cancellation', async () => {
  await assert.rejects(rankVocabulary(input, {apiKey: 'fake', timeoutMs: 10, fetch: () => new Promise(() => {})}), /timed out/);
});
test('rejects invalid inputs before making requests', async () => {
  let calls = 0;
  const options = {apiKey: 'fake', fetch: async () => {calls++; throw Error('unexpected');}};
  await assert.rejects(rankVocabulary({...input, candidates: [input.subject]}, options), /exclude the subject/);
  await assert.rejects(rankVocabulary({...input, candidates: []}, options), /1 to 16/);
  await assert.rejects(rankVocabulary(input, {...options, provider: 'unknown'}), /Unsupported/);
  assert.equal(calls, 0);
});

test('already aborted callers perform no request and reject cleanly', async () => {
  const controller = new AbortController();
  controller.abort();
  let calls = 0;
  await assert.rejects(rankVocabulary(input, {apiKey: 'fake', signal: controller.signal,
    fetch: async () => {calls++; throw Error('unexpected');}}), /cancelled|aborted/);
  assert.equal(calls, 0);
});

test('uses Jev when a ranking caller omits the provider', async () => {
  const result = await rankVocabulary(input, {apiKey: 'fake', fetch: async url => {
    assert.equal(url, 'https://api.typesafe.ai/v1/systemone');
    return Response.json(response('jev'));
  }});
  assert.equal(result.provider, 'jev');
});
