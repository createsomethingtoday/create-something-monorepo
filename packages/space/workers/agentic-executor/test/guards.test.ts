import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readPolicy, validateTask } from '../src/guards.ts';
import { policyEnv } from './fixtures.ts';
test('unconfigured and non-finite budgets fail closed before work', () => {
  assert.throws(() => readPolicy({}));
  const policy = readPolicy(policyEnv);
  for (const budget of [NaN, Infinity, -1, 0, '1', 3]) {
    assert.throws(() => validateTask({ issueId: 'a', epicId: 'e', budget }, policy));
  }
  assert.equal(validateTask({issueId:'a', epicId:'e', budget:1}, policy).budget, 1);
});
test('reservation must cover byte-bounded input and maximum output at configured rates',()=>{
 assert.throws(()=>readPolicy({...policyEnv,AGENTIC_CALL_RESERVATION_USD:'0.01'}));
 assert.throws(()=>readPolicy({...policyEnv,AGENTIC_INPUT_USD_PER_MILLION:'NaN'}));
 assert.throws(()=>readPolicy({...policyEnv,AGENTIC_LIFETIME_TASK_LIMIT:'1.5'}));
});
