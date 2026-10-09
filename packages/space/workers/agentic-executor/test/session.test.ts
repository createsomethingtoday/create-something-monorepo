import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AgenticSession } from '../src/session.ts';
import { policyEnv } from './fixtures.ts';
class Storage {
 data = new Map(); alarms = 0;
 async get(k) { return structuredClone(this.data.get(k)); }
 async put(k,v) { this.data.set(k,structuredClone(v)); }
 async setAlarm() { this.alarms++; }
 async deleteAlarm() { this.alarms=0; }
}
function fixture(storage=new Storage()) {
 let ready=Promise.resolve();
 const state={storage,id:{toString:()=> 'session'},blockConcurrencyWhile:fn => ready=ready.then(fn)};
 const db={prepare:()=>({bind(){return this},run:async()=>({})})};
 const env={...policyEnv,ANTHROPIC_API_KEY:'mock-only',DB:db,AGENTIC_QUOTA:{idFromName:x=>x,get:()=>({fetch:async()=>Response.json({deadline:Date.now()+60000})})}};
 const session=new AgenticSession(state,env);
 return {session,storage,ready:()=>ready,env};
}
const task={issueId:'one',epicId:'e',budget:2};
test('duplicate starts and completed replay do not arm more work',async()=>{
 const f=fixture();await f.ready();
 await Promise.all([f.session.start(task),f.session.start(task)]);
 assert.equal(f.storage.alarms,1);
 await f.session.pause();
 await f.session.start(task);
 assert.equal(f.storage.alarms,0);
});
test('unsettled model reservation on restart stops without retry',async()=>{
 const f=fixture();await f.ready();await f.session.start(task);
 const saved=f.storage.data.get('session');saved.context.callPending=true; saved.context.costReserved=.5;
 const restored=fixture(f.storage);await restored.ready();
 assert.equal((await restored.session.status().json()).status,'error');
 await restored.session.alarm();
 assert.equal((await restored.session.status().json()).iteration,0);
});
const modelResponse = () => Response.json({id:'test', type:'message',role:'assistant',model:'claude-sonnet-4-5-20250929',content:[{type:'text',text:'continue'}],stop_reason:'end_turn',stop_sequence:null,usage:{input_tokens:1,output_tokens:1}});
test('durable reservations stop repeated cheap calls at allocated budget', async t => {
 let calls=0;
 t.mock.method(globalThis,'fetch',async()=>{calls++;return modelResponse();});
 const f=fixture();await f.ready();await f.session.start(task);await f.session.alarm();
 const status=await f.session.status().json();
 assert.equal(calls,4);assert.equal(status.status,'budget_exhausted');assert.equal(status.costReserved,2);
 const restored=fixture(f.storage);await restored.ready();await restored.session.alarm();
 assert.equal(calls,4);
});
test('provider failure is attempted once and uncertain reservation survives restart', async t => {
 let calls=0;
 t.mock.method(globalThis,'fetch',async()=>{calls++;return Response.json({error:{message:'unavailable'}},{status:503});});
 const f=fixture();await f.ready();await f.session.start(task);await f.session.alarm();
 assert.equal(calls,1);assert.equal((await f.session.status().json()).status,'error');
 const restored=fixture(f.storage);await restored.ready();await restored.session.alarm();assert.equal(calls,1);
});
test('pause aborts an in-flight request and prevents resumed or duplicate spending',async t=>{
 let called; const started=new Promise(resolve=>called=resolve);let calls=0;
 t.mock.method(globalThis,'fetch',async(_url,init)=>{
  calls++;called();
  return new Promise((_resolve,reject)=>init.signal.addEventListener('abort',()=>reject(new Error('aborted')),{once:true}));
 });
 const f=fixture();await f.ready();await f.session.start(task);
 const execution=f.session.alarm();await started;await f.session.pause();await execution;
 assert.equal((await f.session.status().json()).status,'paused');
 assert.equal((await f.session.resume()).status,409);
 await f.session.start(task);await f.session.alarm();assert.equal(calls,1);
});
test('legacy running sessions and expired admissions fail closed', async()=>{
 const f=fixture();await f.ready();await f.session.start(task);
 const saved=f.storage.data.get('session'); delete saved.context.guardVersion;
 const restored=fixture(f.storage);await restored.ready();await restored.session.alarm();
 assert.equal((await restored.session.status().json()).status,'error');
 const expired=fixture();await expired.ready();expired.env.AGENTIC_QUOTA.get=()=>({fetch:async()=>Response.json({deadline:1})});
 assert.equal((await expired.session.start(task)).status,410);assert.equal(expired.storage.alarms,0);
});
test('expired sessions stop and duplicate alarm delivery cannot overlap model calls',async t=>{
 let calls=0;
 t.mock.method(globalThis,'fetch',async()=>{calls++;return modelResponse();});
 const f=fixture();await f.ready();await f.session.start(task);
 await Promise.all([f.session.alarm(),f.session.alarm()]);assert.equal(calls,4);
 const expired=fixture();await expired.ready();await expired.session.start(task);
 const stored=expired.storage.data.get('session');stored.context.deadline=1;
 const restored=fixture(expired.storage);await restored.ready();await restored.session.alarm();assert.equal(calls,4);
 assert.equal((await restored.session.status().json()).status,'error');
});
test('model payload cap prevents external work and pause before work can resume once',async t=>{
 let calls=0;t.mock.method(globalThis,'fetch',async()=>{calls++;return modelResponse();});
 const f=fixture();await f.ready();await f.session.start(task);await f.session.pause();
 assert.equal((await f.session.resume()).status,200);
 f.env.AGENTIC_MAX_REQUEST_BYTES='1';await f.session.alarm();
 assert.equal(calls,0);assert.equal((await f.session.status().json()).status,'error');
});
