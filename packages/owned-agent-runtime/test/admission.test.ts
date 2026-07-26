import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { CloudflareAgentAdmission, CloudflareControlRunAdmission } from '../src/admission.js';

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

test('throttles all Control traffic per tenant but budgets only run admission and execution', async () => {
  const tenantKeys: string[] = [];
  const budgetKeys: string[] = [];
  const admission = new CloudflareControlRunAdmission(
    { async limit({ key }) { tenantKeys.push(key); return { success: true }; } },
    { async limit({ key }) { budgetKeys.push(key); return { success: true }; } }
  );
  const context = {
    scope: { accountId: 'account-a', tenantId: 'tenant-a', workspaceAccountId: 'workspace-a' },
    actor: { subject: 'owner-a', role: 'account_owner' as const },
    credentialSource: 'bearer' as const
  };
  const request = new Request('https://runtime.example/v1/control/runs/run-a');

  assert.equal(await admission.check({ request, context, operation: 'get' }), 'allowed');
  assert.equal(await admission.check({ request, context, operation: 'mcp:tools/list' }), 'allowed');
  assert.deepEqual(budgetKeys, []);
  assert.equal(await admission.check({ request, context, operation: 'start' }), 'allowed');
  assert.equal(await admission.check({ request, context, operation: 'process' }), 'allowed');
  assert.equal(await admission.check({ request, context, operation: 'mcp:control_run_start' }), 'allowed');
  assert.equal(tenantKeys.length, 5);
  assert.ok(tenantKeys.every((key) => key === 'account-a:tenant-a:workspace-a'));
  assert.equal(budgetKeys.length, 3);
  assert.ok(budgetKeys.every((key) => key === 'account-a:tenant-a:workspace-a'));
});

test('ships a Control execution budget that can trip before the tenant traffic throttle', () => {
  const config = readFileSync(new URL('../wrangler.jsonc', import.meta.url), 'utf8');
  const limit = (binding: string) => {
    const match = config.match(
      new RegExp(`"name":\\s*"${binding}"[\\s\\S]*?"simple":\\s*\\{\\s*"limit":\\s*(\\d+)`)
    );
    assert.ok(match, `${binding} must have a configured limit`);
    return Number(match[1]);
  };
  assert.ok(
    limit('CONTROL_BUDGET_RATE_LIMITER') < limit('CONTROL_TENANT_RATE_LIMITER'),
    'paid execution budget must be stricter than the all-traffic tenant throttle'
  );
});
