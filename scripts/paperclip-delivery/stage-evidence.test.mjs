import test from 'node:test';
import assert from 'node:assert/strict';
import { POLICY_VERSION, validateStageEvidence, validateRecovery, validateDelegation } from './stage-evidence.mjs';
function fixture(target='complete') {
 const sourceSha='a'.repeat(40), mergedSha='b'.repeat(40);
 const packet={policyVersion:POLICY_VERSION,linearIssue:'CRE-2125',paperclipCaseId:'pilot',companyId:'company',workspace:'/private/tmp/pilot',releaseRunbook:'/repo/release.md',targetEnvironment:'production',targetSurface:'https://example.test',allowedPaths:['packages/pilot'],acceptanceCriteria:['navigation works'],requiredCiChecks:['test'],productionAuthorized:true,authorization:{source:'user',reference:'explicit pilot authorization'},maxRepairRounds:3,maxResumeAttempts:2,boundaries:{identityChanges:false,payments:false,destructiveActions:false,externalMessages:false},delegation:{createAgents:true,createSkills:true,parallel:true,scope:'parent-assignment'},roles:{coordinator:'c',engineering:'e',reviewer:'r',releaseQa:'q'}};
 const native={source:'paperclip-api',caseId:'pilot',companyId:'company',readAtMs:1000,revision:'rev1',pendingStage:target,activeWriterRunIds:[],unresolvedOutcomes:0,recoveryRequired:false};
 const evidence={nativeRevision:'rev1',sourceSha,tests:{passed:true,sourceSha,receipts:['test.log']},review:{outcome:'approved',sourceSha,agentId:'r',receipts:['review.md']},ci:[{name:'test',status:'success',sourceSha,runUrl:'https://example.test/run'}],merge:{sha:mergedSha,reviewedHeadSha:sourceSha,status:'merged',treeMatchesReviewed:true},build:{sourceSha:mergedSha,passed:true,receipts:['build.log']},rollback:{versionId:'prior'},deployment:{sourceSha:mergedSha,targetSurface:packet.targetSurface,status:'active',versionId:'new',providerReceipts:['provider.json']},live:{versionId:'new',targetSurface:packet.targetSurface,passed:true,receipts:['browser.json'],criteriaPassed:['navigation works']}};
 return {packet,native,evidence};
}
function check(f){return validateStageEvidence(f.packet,f.native,f.evidence,f.native.pendingStage,1000);}
test('explicit authorized production with exact verified evidence succeeds',()=>assert.equal(check(fixture()).allowed,true));
test('stable case permits different routine execution issues across stages',()=>{const f=fixture();for(const executionIssueId of ['implementation-issue','review-issue','release-issue']){f.native.issueId=executionIssueId;assert.equal(check(f).allowed,true);}});
test('different case cannot inherit stage approval',()=>{const f=fixture();f.native.caseId='other-case';assert.throws(()=>check(f),/Matching native/);});
test('different case cannot inherit recovery evidence',()=>{const f=fixture('implement');f.native.caseId='other-case';assert.throws(()=>validateRecovery(f.packet,f.native,{nativeRevision:'rev1',attempt:1},1000),/Matching native/);});
for(const [name,mutate,error] of [
 ['stale reviewed SHA',f=>f.evidence.review.sourceSha='c'.repeat(40),/approval/],
 ['missing CI',f=>f.evidence.ci=[],/CI/],
 ['unresolved outcome',f=>f.native.unresolvedOutcomes=1,/reconciliation/],
 ['duplicate writer',f=>f.native.activeWriterRunIds=['run1','run2'],/writer/],
 ['missing live readback',f=>delete f.evidence.live,/Live/],
 ['missing task authorization',f=>delete f.packet.productionAuthorized,/authorization/],
 ['stale native state',f=>f.native.readAtMs=-40000,/Fresh/],
 ['wrong native revision',f=>f.evidence.nativeRevision='old',/revision/],
 ['self-review',f=>f.evidence.review.agentId='e',/approval/],
 ['wrong merged build',f=>f.evidence.build.sourceSha=f.evidence.sourceSha,/merged build/],
 ['wrong deployment target',f=>f.evidence.deployment.targetSurface='https://other.test',/readback/],
 ['missing provider readback',f=>f.evidence.deployment.providerReceipts=[],/readback/],
 ['missing acceptance result',f=>f.evidence.live.criteriaPassed=[],/acceptance/],
 ['permission expansion',f=>f.packet.boundaries.identityChanges=true,/boundaries/],
 ['missing rollback',f=>delete f.evidence.rollback,/rollback/],
 ['non-native workflow authority',f=>f.native.source='checkpoint',/native/],
 ['out-of-stage request',f=>f.native.pendingStage='arbitrary',/Unknown/],
]) test(`reject ${name}`,()=>{const f=fixture();mutate(f);assert.throws(()=>check(f),error);});
test('changes requested never promotes to CI',()=>{const f=fixture('ci');f.evidence.review.outcome='changes_requested';assert.throws(()=>check(f),/approval/);});
test('settled interrupted work may resume within bounds',()=>{const f=fixture('implement');assert.equal(validateRecovery(f.packet,f.native,{nativeRevision:'rev1',attempt:1,predecessorStopped:true,checkpointVerified:true,sameScope:true,causeCorrected:true,receipts:['recovery.json']},1000).allowed,true);});
test('interruption cannot resume a live predecessor',()=>{const f=fixture();f.native.activeWriterRunIds=['old'];assert.throws(()=>validateRecovery(f.packet,f.native,{nativeRevision:'rev1',attempt:1},1000),/predecessor/);});
test('recovery cannot clear an uncertain outcome by assertion',()=>{const f=fixture();f.native.unresolvedOutcomes=1;assert.throws(()=>validateRecovery(f.packet,f.native,{nativeRevision:'rev1',attempt:1},1000),/Reconcile/);});
test('exhausted recovery escalates',()=>{const f=fixture();assert.throws(()=>validateRecovery(f.packet,f.native,{nativeRevision:'rev1',attempt:3},1000),/exhausted/);});
test('stale native recovery snapshot cannot authorize resume',()=>{const f=fixture();assert.throws(()=>validateRecovery(f.packet,f.native,{nativeRevision:'rev1',attempt:1},40000),/Fresh/);});

function delegate(f, parentAgentId='e') {return {parentAgentId,companyId:f.packet.companyId,paperclipCaseId:f.packet.paperclipCaseId,permissions:{createAgents:true,createSkills:true,parallel:true},boundaries:{identityChanges:false,payments:false,destructiveActions:false,externalMessages:false},allowedPaths:['packages/pilot/a'],reviewIndependence:true,noPurchases:true};}
test('delegation retains case identity across execution issues',()=>{const f=fixture(),d=delegate(f);d.paperclipCaseId='other-case';assert.throws(()=>validateDelegation(f.packet,d),/parent task scope/);});
for(const parent of ['c','e','r','q']) test(`role ${parent} may create scoped agents and skills in parallel`,()=>{const f=fixture();assert.equal(validateDelegation(f.packet,delegate(f,parent)).allowed,true);});
for(const boundary of ['identityChanges','payments','destructiveActions','externalMessages']) test(`delegation cannot expand ${boundary}`,()=>{const f=fixture(),d=delegate(f);d.boundaries[boundary]=true;assert.throws(()=>validateDelegation(f.packet,d),/boundaries/);});
test('parallel scoped writers allowed in separate workspaces',()=>{const f=fixture('implement');f.native.activeWriterRunIds=['a','b'];f.native.writerLeases=[{runId:'a',workspace:'/private/tmp/a',paths:['packages/pilot/a']},{runId:'b',workspace:'/private/tmp/b',paths:['packages/pilot/b']}];assert.equal(check(f).allowed,true);f.native.writerLeases[1].paths=['packages/pilot/a/nested'];assert.throws(()=>check(f),/Overlapping/);});
test('delegation cannot expand paths or traverse out of scope',()=>{const f=fixture(),d=delegate(f);for(const path of ['other','packages/pilot/../other']){d.allowedPaths=[path];assert.throws(()=>validateDelegation(f.packet,d),/scope/);}});
test('delegation cannot purchase or waive independence',()=>{const f=fixture(),d=delegate(f);d.noPurchases=false;assert.throws(()=>validateDelegation(f.packet,d),/purchases/);d.noPurchases=true;d.reviewIndependence=false;assert.throws(()=>validateDelegation(f.packet,d),/independence/);});
