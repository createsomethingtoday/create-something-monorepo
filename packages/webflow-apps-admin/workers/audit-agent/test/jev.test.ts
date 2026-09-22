import test from 'node:test';
import assert from 'node:assert/strict';
import { categorizeApp } from '../src/categorizer.js';
import type { Env } from '../src/types.js';
const app = {
  name: 'Metrics',
  slug: 'metrics',
  clientId: 'private-client',
  workspaceId: 'private-workspace',
  error: null,
  editUrl: 'private'
};
test('Jev categorization minimizes state and retains app identity', async () => {
  const result = await categorizeApp({} as Env, app, {
    apiKey: 'test',
    reserve: async () => true,
    fetchImpl: (async (_url: unknown, init: RequestInit) => {
      const request = JSON.parse(init.body as string);
      assert.deepEqual(request.state, { name: 'Metrics', slug: 'metrics' });
      return {
        ok: true,
        json: async () => ({
          model: 'jev-test',
          answers: {
            decision: {
              type: 'choice',
              choice: 'analytics',
              confidence: 1,
              probabilities: Object.fromEntries(
                Object.keys(request.questions.decision.criteria).map((k) => [
                  k,
                  k === 'analytics' ? 1 : 0
                ])
              )
            }
          }
        })
      };
    }) as typeof fetch
  });
  assert.equal(result.category, 'analytics');
  assert.equal(result.clientId, app.clientId);
});
test('provider outage returns other without hidden paid-provider fallback', async () => {
  const result = await categorizeApp(
    {
      AI: {
        run: () => {
          throw Error('must not call');
        }
      }
    } as unknown as Env,
    app,
    {
      apiKey: 'test',
      reserve: async () => true,
      fetchImpl: async () => {
        throw Error('private');
      }
    }
  );
  assert.equal(result.category, 'other');
  assert.equal(result.confidence, 0);
  assert.ok(!result.reasoning.includes('private'));
});
