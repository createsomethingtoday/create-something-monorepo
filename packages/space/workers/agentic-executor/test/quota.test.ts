import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AgenticQuota } from '../src/quota.ts';
import { policyEnv } from './fixtures.ts';
class Storage {
  data = new Map(); tail = Promise.resolve();
  async get(key) { return structuredClone(this.data.get(key)); }
  async put(key, value) { this.data.set(key, structuredClone(value)); }
  transaction(fn) { const run = this.tail.then(() => fn(this)); this.tail = run.catch(() => {}); return run; }
}
const task = (issueId = 'one', budget = 2) => ({issueId, epicId:'epic', budget});
const request = (body, path = '/admit') => new Request(`https://quota${path}`, {method:'POST', body:JSON.stringify(body)});
test('concurrent duplicate admission sends once, reserves once, and survives restart', async () => {
  const state = {storage:new Storage()}; const sent = [];
  const env = {...policyEnv, AGENTIC_QUEUE:{send:async body => { sent.push(body); }}};
  const quota = new AgenticQuota(state, env);
  const responses = await Promise.all(Array.from({length:20}, () => quota.fetch(request(task()))));
  assert.ok(responses.every(r => r.ok)); assert.equal(sent.length, 1);
  assert.equal((await new AgenticQuota(state, env).fetch(request(task()))).status, 200);
  assert.equal(sent.length, 1);
  assert.equal((await quota.fetch(request(task('one', 1)))).status, 409);
  assert.equal((await quota.fetch(request(task('two')))).status, 200);
  assert.equal((await quota.fetch(request(task('three')))).status, 429);
});
test('unknown queue outcome is not resent or refunded; unadmitted tasks fail closed', async () => {
 const state={storage:new Storage()}; let calls=0;
 const quota = new AgenticQuota(state, {...policyEnv, AGENTIC_QUEUE:{send:async()=>{calls++;throw Error('timeout');}}});
 assert.equal((await quota.fetch(request(task()))).status, 503);
 assert.equal((await quota.fetch(request(task()))).status, 200);
 assert.equal(calls,1);
 assert.equal((await quota.fetch(request(task('fresh'), '/verify'))).status,403);
});
test('many concurrent fresh IDs cannot race past aggregate count or spend',async()=>{
 let sends=0; const state={storage:new Storage()};
 const quota=new AgenticQuota(state,{...policyEnv,AGENTIC_QUEUE:{send:async()=>{sends++;}}});
 const replies=await Promise.all(Array.from({length:30},(_,i)=>quota.fetch(request(task(`fresh-${i}`,1)))));
 assert.equal(replies.filter(r=>r.ok).length,3);assert.equal(sends,3);
 assert.equal(replies.filter(r=>r.status===429).length,27);
});
test('concurrent distinct full allocations cannot exceed the dollar allowance',async()=>{
 let sends=0;const quota=new AgenticQuota({storage:new Storage()},{...policyEnv,AGENTIC_LIFETIME_TASK_LIMIT:'100',AGENTIC_QUEUE:{send:async()=>{sends++;}}});
 const responses=await Promise.all(Array.from({length:30},(_,i)=>quota.fetch(request(task(`usd-${i}`)))));
 assert.equal(responses.filter(r=>r.ok).length,2);assert.equal(sends,2);
});
