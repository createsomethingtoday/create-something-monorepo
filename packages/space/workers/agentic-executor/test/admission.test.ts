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
