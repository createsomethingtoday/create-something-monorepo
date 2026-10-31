import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateAssignment, validateRecovery, validateParallelWriters } from './stage-evidence.mjs';
const schema = JSON.parse(readFileSync(new URL('./assignment.schema.json', import.meta.url)));
function packet() {
 return {paperclipCaseId:'case',companyId:'company',workspace:'/private/tmp/owned',releaseRunbook:'/repo/release.md',targetSurface:'company skill',policyVersion:schema.properties.policyVersion.const,linearIssue:'CRE-2128',targetEnvironment:'production',productionAuthorized:true,maxRepairRounds:3,maxResumeAttempts:2,allowedPaths:['scripts/pack'],acceptanceCriteria:['verified'],requiredCiChecks:['delivery-policy'],authorization:{source:'user',reference:'test fixture only'},boundaries:{identityChanges:false,payments:false,destructiveActions:false,externalMessages:false},roles:{coordinator:'c',engineering:'e',reviewer:'r',releaseQa:'q'},delegation:{createAgents:true,createSkills:true,parallel:true,scope:'parent-assignment'}};
}
for (const [name, mutate] of [
 ['unknown authority property', p=>p.unbounded=true],
 ['unknown nested authority', p=>p.authorization.admin=true],
 ['duplicate paths', p=>p.allowedPaths.push(p.allowedPaths[0])],
 ['traversing paths', p=>p.allowedPaths=['scripts/../outside']],
 ['absolute repository paths', p=>p.allowedPaths=['/scripts/pack']],
 ['noncanonical workspace', p=>p.workspace='/private/tmp/owned/../shared'],
 ['root workspace', p=>p.workspace='/'],
 ['noncanonical slash aliases', p=>p.allowedPaths=['scripts//pack']],
 ['NUL path', p=>p.allowedPaths=['scripts/pack\0']],
]) test(`assignment rejects ${name}`,()=>{const p=packet();mutate(p);assert.throws(()=>validateAssignment(p));});
test('recovery cannot pass without a native revision',()=>{
 const p=packet(); const n={source:'paperclip-api',caseId:'case',companyId:'company',readAtMs:1000,activeWriterRunIds:[],unresolvedOutcomes:0,recoveryRequired:false};
 assert.throws(()=>validateRecovery(p,n,{attempt:1,predecessorStopped:true,checkpointVerified:true,sameScope:true,causeCorrected:true,receipts:['test']},1000),/revision/);
});
test('parallel writer public API validates parent authority',()=>{
 const p=packet();delete p.productionAuthorized;
 assert.throws(()=>validateParallelWriters(p,[{runId:'a',workspace:'/private/tmp/a',paths:['scripts/pack/a']}],['a']));
});
test('parallel workspaces cannot be nested',()=>{
 assert.throws(()=>validateParallelWriters(packet(),[{runId:'a',workspace:'/private/tmp/a',paths:['scripts/pack/a']},{runId:'b',workspace:'/private/tmp/a/child',paths:['scripts/pack/b']}],['a','b']),/workspace/i);
});
