import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const [phase, expected, workerVersion] = process.argv.slice(2);
assert.ok(['baseline','isolation','memory','cgroup','memory-wrapped'].includes(phase));
assert.match(expected??'', /^sha256:[a-f0-9]{64}$/);
assert.match(workerVersion??'', /^[a-f0-9-]{36}$/);
const key=execFileSync('infisical',['secrets','get','CLOUDFLARE_WORKERS_API_TOKEN','--env=prod','--plain','--projectId=e1532079-2f2b-46b5-8972-cf7a025eb803'],{encoding:'utf8',stdio:['ignore','pipe','ignore'],timeout:15000}).trim();
const rolloutDeadline=Date.now()+180000;
let app;
do {
 const appResponse=await fetch('https://api.cloudflare.com/client/v4/accounts/9645bd52e640b8a4f40a3a55ff1dd75a/containers/applications/a03a0de4-bc04-4f6b-a183-32287814648f',{headers:{Authorization:`Bearer ${key}`},signal:AbortSignal.timeout(15000)});
 assert.equal(appResponse.status,200);app=await appResponse.json();
 if(app.result?.configuration?.image?.split('@')[1]===expected)break;
 await new Promise(resolve=>setTimeout(resolve,5000));
}while(Date.now()<rolloutDeadline);
assert.equal(app.result?.configuration?.image?.split('@')[1],expected,'Wait for provider image readback');
const token=(await readFile('.operator/token','utf8')).trim();
const url='https://private-validation-preview.createsomething.workers.dev';
async function call(route,body){const r=await fetch(url+route,{method:body?'POST':'GET',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)});return {status:r.status,data:await r.json()};}
const report={startedAt:new Date().toISOString(),expectedImage:expected,workerVersion,providerLimits:{memoryMiB:app.result.configuration.memory_mib,vcpu:app.result.configuration.vcpu},runs:[],authority:'owned-fixture-only',sourceSha256:{}};
for(const name of ['worker.mjs','policy.mjs','qualify.mjs','Dockerfile','isolate.sh','memory.mjs'])report.sourceSha256[name]=createHash('sha256').update(await readFile(name)).digest('hex');
const output=`../evidence/cloudflare-qualification-${phase}-v3.json`;
await writeFile(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
try{
 for(const [i,mode]of (phase==='baseline'?['control','restricted']:phase==='isolation'?['isolated','isolated']:['memory','isolated']).entries()){
  const id=`run-qualification-${i+(phase==='isolation'?2:phase==='memory'?4:phase==='cgroup'?6:phase==='memory-wrapped'?8:0)}`;const r=await call('/run',{id,mode});assert.equal(r.status,202,'Existing runs must not be relabeled with current source hashes; inspect their original receipt instead');
  let state;const deadline=Date.now()+110000;
  do{state=(await call('/status')).data;if(!state.active)break;await new Promise(r=>setTimeout(r,2000));}while(Date.now()<deadline);
  report.runs.push(state.runs[id]);await writeFile(output,JSON.stringify(report,null,2)+'\n');
  assert.equal(state.active,null,'Cleanup must release only reconciled runs');assert.equal(state.runs[id].status,'cleaned');
 }
 report.completed=true;
}catch(e){report.error=e.message;process.exitCode=1;}
finally{report.endedAt=new Date().toISOString();await writeFile(output,JSON.stringify(report,null,2)+'\n');}
