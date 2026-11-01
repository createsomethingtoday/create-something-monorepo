import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const cli = new URL('./cli.mjs', import.meta.url);
const packet = {paperclipCaseId:'case',companyId:'company',workspace:'/private/tmp/owned',releaseRunbook:'/repo/release.md',targetSurface:'company skill',policyVersion:'create-something.paperclip-delivery.v1',linearIssue:'CRE-2128',targetEnvironment:'production',productionAuthorized:true,maxRepairRounds:3,maxResumeAttempts:2,allowedPaths:['scripts/pack'],acceptanceCriteria:['verified'],requiredCiChecks:['delivery-policy'],authorization:{source:'user',reference:'test fixture only'},boundaries:{identityChanges:false,payments:false,destructiveActions:false,externalMessages:false},roles:{coordinator:'c',engineering:'e',reviewer:'r',releaseQa:'q'},delegation:{createAgents:true,createSkills:true,parallel:true,scope:'parent-assignment'}};
function run(...args) { return spawnSync(process.execPath, [cli.pathname, ...args], {encoding:'utf8'}); }
function temp(t) {const dir=mkdtempSync(join(process.env.PAPERCLIP_RUN_SCRATCH_DIR || tmpdir(),'delivery-test-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));return dir;}
function json(dir,name,value){const path=join(dir,name);writeFileSync(path,JSON.stringify(value));return path;}
test('CLI validates complete assignment and rejects scope expansion',t=>{
 const dir=temp(t), file=json(dir,'assignment.json',packet);
 let r=run('assignment',file);assert.equal(r.status,0,r.stderr);assert.equal(JSON.parse(r.stdout).caseId,'case');
 json(dir,'assignment.json',{...packet,payments:true});r=run('assignment',file);assert.equal(r.status,1);assert.equal(r.stdout,'');
});
test('CLI stage validation requires current exact evidence, and does not certify provider truth',t=>{
 const dir=temp(t),a=json(dir,'a.json',packet),sourceSha='a'.repeat(40);
 const native={source:'paperclip-api',caseId:'case',companyId:'company',readAtMs:Date.now(),revision:'1',pendingStage:'review',activeWriterRunIds:[],unresolvedOutcomes:0,recoveryRequired:false};
 const n=json(dir,'n.json',native), evidence={nativeRevision:'1',sourceSha,tests:{sourceSha,passed:true,receipts:['fixture-only']}};
 const e=json(dir,'e.json',evidence);let r=run('stage',a,n,e,'review');assert.equal(r.status,0,r.stderr);assert.equal(JSON.parse(r.stdout).providerVerified,false);
 json(dir,'e.json',{...evidence,nativeRevision:'old'});r=run('stage',a,n,e,'review');assert.equal(r.status,1);
 json(dir,'e.json',evidence);json(dir,'n.json',{...native,readAtMs:1});r=run('stage',a,n,e,'review');assert.equal(r.status,1);
});
test('CLI recovery preserves uncertain-outcome holds',t=>{
 const dir=temp(t),a=json(dir,'a.json',packet),n=json(dir,'n.json',{source:'paperclip-api',caseId:'case',companyId:'company',readAtMs:Date.now(),revision:'1',activeWriterRunIds:[],unresolvedOutcomes:1,recoveryRequired:true});
 const e=json(dir,'e.json',{nativeRevision:'1',attempt:1,predecessorStopped:true,checkpointVerified:true,sameScope:true,causeCorrected:true,receipts:['fixture-only']});
 const r=run('recovery',a,n,e);assert.equal(r.status,1);assert.match(r.stderr,/Reconcile/);
});
test('manifest is deterministic, inventories exact bytes and detects added or changed content',t=>{
 const dir=temp(t);writeFileSync(join(dir,'SKILL.md'),'reviewed bytes\n');
 const first=run('manifest',dir);assert.equal(first.status,0,first.stderr);assert.equal(first.stdout,run('manifest',dir).stdout);
 const manifest=json(dir,'manifest.json',JSON.parse(first.stdout));
 assert.equal(run('verify-manifest',dir,manifest).status,0);
 writeFileSync(join(dir,'SKILL.md'),'different bytes\n');assert.equal(run('verify-manifest',dir,manifest).status,1);
 writeFileSync(join(dir,'SKILL.md'),'reviewed bytes\n');writeFileSync(join(dir,'extra.md'),'unexpected');assert.equal(run('verify-manifest',dir,manifest).status,1);
 assert.equal(JSON.parse(first.stdout).files[0].bytes,Buffer.byteLength('reviewed bytes\n'));
});
test('manifest refuses symlinks instead of packaging files outside owned source',t=>{
 const dir=temp(t);symlinkSync(new URL('./assignment.schema.json',import.meta.url).pathname,join(dir,'linked.json'));
 const r=run('manifest',dir);assert.equal(r.status,1);assert.match(r.stderr,/regular file|symbolic/i);
});
test('CLI rejects missing inputs, unknown commands and extra arguments',()=>{
 for(const args of [[],['other'],['assignment'],['assignment','absent','extra']])assert.equal(run(...args).status,1);
});
