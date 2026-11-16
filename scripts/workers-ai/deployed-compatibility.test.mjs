import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {patch,MODEL} from './patch-deployed-model.mjs';
const fixtures = '.model-fix-evidence/';
const prompts=[];
// Node test harness shim for the bundle's Cloudflare process compatibility probe.
globalThis.Cloudflare={compatibilityFlags:{enable_nodejs_process_v2:true}};
for(const name of ['scanner-worker','webflow-apps-audit-agent']) {
 const before=readFileSync(fixtures+name+'.before.js','utf8');
 const after=readFileSync(fixtures+name+'.after.js','utf8');
 test(name+' reproducible exact patch',()=>assert.equal(patch(name,before),after));
 const worker=(await import('../../'+fixtures+name+'.after.js')).default;
 for(const structured of [true,false])test(name+' full handler with '+(structured?'object':'string')+' response',async()=>{
  const value=name==='scanner-worker'?{verdict:'PASS',confidence:90,reasoning:'Fixed arithmetic.'}:{category:'analytics',confidence:0.9,reasoning:'Tracks visits.'};
  const env={AI:{run:async(m,p)=>{assert.equal(m,MODEL);if(structured)prompts.push({name,model:m,input:p});return {response:structured?value:JSON.stringify(value)}}},RATE_LIMIT:{get:async()=>null,put:async()=>{}},DB:{prepare:()=>({bind:()=>({run:async()=>({success:true})})})}};
  const data=name==='scanner-worker'?{findings:[{id:'synthetic-model-test',ruleId:'SYNTHETIC',filePath:'fixture.js',line:1,snippet:'const n=1+2;',tier:'BLOCKER',signalType:'SECURITY'}],context:{filesScanned:1},options:{enableMemory:false}}:{name:'Synthetic Analytics',slug:'synthetic-analytics'};
  const path=name==='scanner-worker'?'/v1/scan/verify':'/categorize';
  const r=await worker.fetch(new Request('https://synthetic.invalid'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}),env);
  const result=await r.json();assert.equal(r.status,200);
  if(name==='scanner-worker'){assert.equal(result.findings[0].verdict,'PASS');assert.equal(result.summary.verifiedByAI,1)}else assert.equal(result.result.category,'analytics');
 });
}
test.after(()=>writeFileSync(fixtures+'exact-prompts.json',JSON.stringify(prompts,null,2)));
