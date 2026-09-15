import assert from 'node:assert/strict';
import test from 'node:test';
import type { FrozenControlActivation } from '../src/control.js';
import { issueControlSchedulerToken } from '../src/control-scheduler-token.js';

test('scheduler issuance fixes resource and activation, bounds replies, and sanitizes failures', async () => {
  const activation = { id: 'activation', accountId: 'account', tenantId: 'tenant',
    workspaceAccountId: 'workspace' } as FrozenControlActivation;
  const reply = { access_token: 'test-jwt', token_type: 'Bearer', expires_in: 300,
    audience: 'https://create-something-agent-runtime.createsomething.workers.dev/mcp',
    activation_id: 'activation', account_id: 'account', tenant_id: 'tenant', workspace_account_id: 'workspace' };
  let calls = 0;
  const send = async (url: RequestInfo | URL, init?: RequestInit) => {
    calls++;
    assert.equal(url, 'https://id.createsomething.space/v1/control/scheduler-tokens/admin-issue');
    assert.equal(init?.redirect, 'manual');
    assert.equal(new Headers(init?.headers).get('X-API-Key'), 'test-key');
    assert.deepEqual(JSON.parse(String(init?.body)), { activation_id: 'activation', account_id: 'account',
      tenant_id: 'tenant', workspace_account_id: 'workspace', resource: reply.audience, ttl_seconds: 300 });
    return Response.json(reply);
  };
  assert.equal(await issueControlSchedulerToken('test-key', activation, send as typeof fetch), 'test-jwt');
  assert.equal(calls, 1);
  for (const body of [{ ...reply, activation_id: 'other' }, { ...reply, audience: 'other' },
    { ...reply, account_id: 'other' }, { ...reply, expires_in: 0 }, { ...reply, access_token: '' }])
    await assert.rejects(issueControlSchedulerToken('test-key', activation,
      (async () => Response.json(body)) as typeof fetch), /control_scheduler_token_issuance_unavailable/);
  let redirectedCalls = 0;
  await assert.rejects(issueControlSchedulerToken('test-key', activation, (async () => {
    redirectedCalls++;
    return new Response(null, { status: 302, headers: { location: 'https://other.example' } });
  }) as typeof fetch), /control_scheduler_token_issuance_unavailable/);
  assert.equal(redirectedCalls, 1);
  await assert.rejects(issueControlSchedulerToken('test-key', activation,
    (async () => new Response('x'.repeat(16_385))) as typeof fetch), /control_scheduler_token_issuance_unavailable/);
  await assert.rejects(issueControlSchedulerToken('test-key', activation,
    (async () => { throw new Error('sensitive upstream detail test-key'); }) as typeof fetch),
    error => error instanceof Error && error.message === 'control_scheduler_token_issuance_unavailable');
});
