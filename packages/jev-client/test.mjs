import test from 'node:test';
import assert from 'node:assert/strict';
import { askJev, validateAnswer } from './index.mjs';
const request = () => ({
  model: 'jev-latest',
  state: { text: 'test' },
  questions: { q: { type: 'noul', instructions: 'Is this test data?' } }
});
test('budget denied prevents network', async () => {
  let calls = 0;
  await assert.rejects(
    askJev({
      apiKey: 'test',
      request: request(),
      reserve: async () => false,
      fetchImpl: async () => {
        calls++;
      }
    }),
    /Budget denied/
  );
  assert.equal(calls, 0);
});
test('success preserves exact served revision', async () => {
  const r = await askJev({
    apiKey: 'test',
    request: request(),
    reserve: async () => true,
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({ model: 'jev-test', answers: { q: { type: 'noul', noul: 0.4 } } })
    })
  });
  assert.equal(r.status, 'ok');
  assert.equal(r.response.model, 'jev-test');
});
test('failure never retries or exposes provider errors', async () => {
  let calls = 0;
  const r = await askJev({
    apiKey: 'SECRET',
    request: request(),
    reserve: async () => true,
    fetchImpl: async () => {
      calls++;
      throw Error('SECRET');
    }
  });
  assert.equal(calls, 1);
  assert.equal(r.status, 'unavailable');
  assert.ok(!JSON.stringify(r).includes('SECRET'));
});
test('malformed output rejected', async () => {
  const r = await askJev({
    apiKey: 'test',
    request: request(),
    reserve: async () => true,
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({ model: 'jev', answers: { q: { type: 'noul', noul: '1' } } })
    })
  });
  assert.equal(r.status, 'unavailable');
});
test('choice must have matching normalized distribution and valid winner', () => {
  const q = { type: 'choice', criteria: { a: 'A', b: 'B' } };
  for (const p of [
    { a: 0.2, b: 0.8 },
    { a: 1, b: 1 },
    { a: NaN, b: 0 }
  ])
    assert.throws(() =>
      validateAnswer({ type: 'choice', choice: 'a', confidence: 1, probabilities: p }, q)
    );
});
test('payload and credential errors do not reserve', async () => {
  let reserves = 0;
  await assert.rejects(
    askJev({
      apiKey: 'test',
      request: { ...request(), state: 'x'.repeat(21000) },
      reserve: async () => {
        reserves++;
        return true;
      }
    }),
    /Payload/
  );
  assert.equal(reserves, 0);
});
