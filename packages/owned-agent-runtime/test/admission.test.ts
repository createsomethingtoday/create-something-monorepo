import assert from 'node:assert/strict';
import test from 'node:test';

import { CloudflareAgentAdmission } from '../src/admission.js';

test('applies client admission before the shared agent budget', async () => {
  const clientKeys: string[] = [];
  const budgetKeys: string[] = [];
  const admission = new CloudflareAgentAdmission(
    {
      async limit({ key }) {
        clientKeys.push(key);
        return { success: true };
      }
    },
    {
      async limit({ key }) {
        budgetKeys.push(key);
        return { success: true };
      }
    }
  );

  assert.equal(
    await admission.check({
      request: new Request('https://agent.example', {
        headers: { 'cf-connecting-ip': '192.0.2.4' }
      }),
      agentId: 'guide'
    }),
    'allowed'
  );
  assert.deepEqual(clientKeys, ['guide:192.0.2.4']);
  assert.deepEqual(budgetKeys, ['guide']);

  const denied = new CloudflareAgentAdmission(
    { async limit() { return { success: false }; } },
    { async limit() { assert.fail('shared budget must not run after client denial'); } }
  );
  assert.equal(
    await denied.check({ request: new Request('https://agent.example'), agentId: 'guide' }),
    'rate_limited'
  );
});
