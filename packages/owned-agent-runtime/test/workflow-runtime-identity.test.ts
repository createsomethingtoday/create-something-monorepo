import assert from 'node:assert/strict';
import test from 'node:test';
import { workflowRuntimeIdentity } from '../src/workflow-runtime-identity.js';
import type { ControlRequestContext } from '../src/control-identity.js';

test('runtime identity preserves verified scope, approval role and scheduler activation', async () => {
  const scope = { accountId: 'account', tenantId: 'tenant', workspaceAccountId: 'workspace' };
  const context: ControlRequestContext = { scope, actor: { subject: 'owner', role: 'account_owner' }, credentialSource: 'bearer' };
  const identity = workflowRuntimeIdentity({ context, activationId: 'activation', approvalPolicies: { owner: ['account_owner'] } });
  assert.deepEqual(await identity.assert(scope, 'owner', 'owner'), context.actor);
  await assert.rejects(identity.assert(scope, 'other', 'owner'));
  await assert.rejects(identity.assert({ ...scope, tenantId: 'other' }, 'owner', 'owner'));
  await assert.rejects(identity.assert(scope, 'owner', 'unknown'));
  await assert.rejects(identity.assert(scope, 'owner', '__proto__'));
  await assert.rejects(identity.assert(scope, null, null));
  context.actor.role = 'agency_operator';
  assert.deepEqual(await identity.assert(scope, 'owner', 'owner'), { subject: 'owner', role: 'account_owner' }, 'verified snapshot is not mutable');
  const scheduler = { ...context, actor: { subject: 'scheduler', role: 'control_scheduler' as const }, schedulerActivationId: 'activation' };
  const automatic = workflowRuntimeIdentity({ context: scheduler, activationId: 'activation', approvalPolicies: { owner: ['control_scheduler'] } });
  assert.equal(await automatic.assert(scope, null, null), null);
  await assert.rejects(automatic.assert(scope, 'scheduler', 'owner'), /does not authorize/, 'scheduler never grants approval');
  await assert.rejects(workflowRuntimeIdentity({ context: scheduler, activationId: 'other', approvalPolicies: {} }).assert(scope, null, null));
});
