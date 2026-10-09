import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.ts';
import { policyEnv } from './fixtures.ts';
test('HTTP admission authenticates before enqueue; invalid budgets cannot reach quota',async()=>{
 let admitted=0;const env={...policyEnv, AGENTIC_ADMISSION_TOKEN:'x'.repeat(32),AGENTIC_QUOTA:{idFromName:x=>x,get:()=>({fetch:async()=>{admitted++;return Response.json({status:'queued'});}})}};
 const request=(budget=1, token='')=>new Request('https://executor/submit',{method:'POST',headers:{Authorization:token},body:JSON.stringify({issueId:'one',epicId:'e',budget})});
 assert.equal((await worker.fetch(request(),env)).status,401);
 assert.equal((await worker.fetch(request(1,'Bearer incorrect'),env)).status,401);
 assert.equal((await worker.fetch(request('1',`Bearer ${env.AGENTIC_ADMISSION_TOKEN}`),env)).status,400);
 assert.equal(admitted,0);
 assert.equal((await worker.fetch(request(1,`Bearer ${env.AGENTIC_ADMISSION_TOKEN}`),env)).status,200);
 assert.equal(admitted,1);
 assert.equal((await worker.fetch(request(),{...env,AGENTIC_ADMISSION_TOKEN:undefined})).status,503);
});
test('transient quota verification retries finitely; permanent denial is acknowledged',async()=>{
 for(const status of [403,503]) for(const attempts of [1,3]) {
  let acks=0,retries=0,starts=0;
  const env={...policyEnv,DB:{prepare:()=>({bind(){return this},run:async()=>({})})},AGENTIC_QUOTA:{idFromName:x=>x,get:()=>({fetch:async()=>new Response(null,{status})})},AGENTIC_SESSION:{idFromName:x=>x,get:()=>({fetch:async()=>{starts++;throw Error('must not start')}})}};
  await worker.queue({messages:[{body:{issueId:'one',epicId:'e',budget:1},attempts,ack:()=>acks++,retry:()=>retries++}]},env);
  assert.equal(starts,0);
  assert.equal(retries,status===503&&attempts===1?1:0);
  assert.equal(acks,status===403||attempts===3?1:0);
 }
});
