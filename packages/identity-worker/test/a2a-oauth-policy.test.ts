import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveOAuthApplicationAccessPolicy, resolveOAuthTokenAccessMode } from '../src/index';
test('A2A inbox uses its exact resource with no control entitlement expansion',()=>{
  const resource='https://a2a.createsomething.agency/mcp';
  assert.deepEqual(resolveOAuthApplicationAccessPolicy(resource),{applicationId:'a2a-inbox',resource,expiresIn:3600});
  assert.equal(resolveOAuthApplicationAccessPolicy('https://a2a.createsomething.agency'),null);
  assert.equal(resolveOAuthApplicationAccessPolicy('https://a2a.createsomething.agency/mcp/other'),null);
  assert.equal(resolveOAuthApplicationAccessPolicy('https://attacker.example/mcp'),null);
  assert.equal(resolveOAuthTokenAccessMode(resource,undefined).type,'application');
});
