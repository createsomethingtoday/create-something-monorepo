import test from 'node:test';
import assert from 'node:assert/strict';
import { categorizeApp } from '../../packages/webflow-apps-admin/workers/audit-agent/src/categorizer';
import { runJudgePhase } from '../../packages/scanner-worker/src/services/judge';
const model='@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const app={name:'Synthetic Analytics',slug:'synthetic-analytics'};
for(const structured of [false,true]) {
 test(`categorizer accepts ${structured?'object':'string'} response`,async()=>{
   const value={category:'analytics',confidence:0.9,reasoning:'Tracks visits.'};
   const env={AI:{run:async(m:string)=>{assert.equal(m,model);return {response:structured?value:JSON.stringify(value)}}}};
   const result=await categorizeApp(env as any,app as any);
   assert.equal(result.category,'analytics'); assert.equal(result.confidence,0.9);
 });
 test(`scanner accepts ${structured?'object':'string'} response`,async()=>{
   const value={verdict:'PASS',confidence:90,reasoning:'Fixed arithmetic.'};let writes=0;
   const db={prepare:()=>({bind:()=>({run:async()=>{writes++;return {success:true}}})})};
   const env={DB:db,AI:{run:async(m:string)=>{assert.equal(m,model);return {response:structured?value:JSON.stringify(value)}}}};
   const result=await runJudgePhase(env as any,[{ruleId:'SYNTHETIC',filePath:'fixture.js',line:1,snippet:'const n=1+2;',tier:'BLOCKER',signalType:'SECURITY'}]);
   assert.equal(result.findings[0].verdict,'PASS');assert.equal(result.verifiedCount,1);assert.equal(writes,1);
 });
}
test('categorizer error keeps low-confidence fallback',async()=>{
 const result=await categorizeApp({AI:{run:async()=>{throw Error('synthetic failure')}}} as any,app as any);
 assert.equal(result.category,'other');assert.equal(result.confidence,0.1);
});
test('scanner invalid response does not verify or store',async()=>{
 const result=await runJudgePhase({AI:{run:async()=>({response:{verdict:'INVALID'}})},DB:{prepare:()=>{throw Error('unexpected write')}}} as any,[{ruleId:'SYNTHETIC',filePath:'fixture.js',line:1,snippet:'const n=1+2;',tier:'BLOCKER'}]);
 assert.equal(result.verifiedCount,0);assert.equal(result.findings[0].phase,undefined);
});
