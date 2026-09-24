import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assessIsolation} from './qualification-policy.mjs';
test('missing evidence and cleanup errors cannot qualify an execution profile',()=>{
 for(const run of [null,{}, {status:'cleaned',execution:{exitCode:0,output:'{}'}}])assert.equal(assessIsolation(run,{}).passed,false);
});
test('timeouts are never treated as positive isolation evidence',()=>{
 const probe={uid:65534,probes:[{name:'public-tcp',result:'timeout-inconclusive'}]};
 const run={status:'cleaned',execution:{exitCode:0,output:JSON.stringify(probe)},stoppedState:{status:'stopped'}};
 const control={execution:{exitCode:0,output:JSON.stringify({probes:[{name:'owned-canary',result:JSON.stringify({status:200,body:'private-owned-canary-v1'})},{name:'public-tcp',result:'connected'}]})}};
 const r=assessIsolation(run,control);assert.equal(r.checks.directNetworkDenied,false);assert.equal(r.passed,false);assert.equal(r.productionReady,false);
});

test('a generic 137 exit or HTTP failure is not OOM proof',async()=>{
 const {assessMemory}=await import('./qualification-policy.mjs');
 for(const run of [{execution:{exitCode:137,output:''}},{error:'HTTP 500'}]){
  const result=assessMemory(run,{}, {},{memoryMiB:256});
  assert.equal(result.checks.kernelOomEvidence,false);assert.equal(result.passed,false);
 }
});
