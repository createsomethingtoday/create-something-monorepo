import test from 'node:test';
import assert from 'node:assert/strict';
import { validateMacRelease } from './mac-release-receipt.mjs';
import { EventEmitter } from 'node:events';
import { launchOwned, trackOwned } from './owned-process.mjs';
function fixture() {
  const sourceSha = 'a'.repeat(40), digest = 'b'.repeat(64);
  const artifact = {sha256:digest,appSha256:digest,executableSha256:digest};
  return {sourceSha,version:'0.1.2',dmgName:'Draw.dmg',dmgSha256:digest,rollbackArtifactSha256:digest,rollbackProfileSha256:digest,
    providerReceipt:{schema:'create-something/draw-provider-readonly@1',sourceSha,executableSha256:digest,startedAt:'2026-10-09T00:30:00Z',completedAt:'2026-10-09T00:31:00Z',synthetic:true,providerStarted:true,authenticatedPreflightPassed:true,gatewayReadProofPresent:true,providerTerminated:true,nativeProcessExited:true,postRevocationDenied:true,syntheticContentUnchanged:true,providerExitCode:0,editsAllowed:false,persistentRegistration:false,scopeConfirmedByOwner:'read-only; 0 proposal layers'},
    installed:{buildInfo:{schema:'create-something/draw-build-info@1',sourceSha,sourceClean:true},schema:'create-something/draw-installed-acceptance@1',ok:true,sourceSha,completedAt:'2026-10-09T00:00:00Z',artifact,bundle:{version:'0.1.2',identifier:'agency.createsomething.draw'},state:{relaunchExact:true},evidence:{hdiutilVerify:true,readonlyMount:true,isolatedCopy:true,externalDylibCheck:true},gates:{installedLaunch:'performed',persistenceRelaunch:'performed',signing:{status:'performed',teamIdentifier:'PRP5VQQPPB',authority:'Developer ID Application: SYNTHETIC TEST'},notarization:{status:'performed'},gatekeeper:{status:'performed'}}},
    acceptance:{schema:'create-something/draw-mac-owner-acceptance@1',scope:'macos',sourceSha,artifact,nativeUI:{runs:['one','two'].map(id=>({id,status:'passed',physicalMac:true,completedAt:'2026-10-09T01:00:00Z',checks:Object.fromEntries(['canvasEdit','undoRedo','jsonSvgPngExport','importRecovery','persistenceRelaunch','composeSaveRestore','motionExport','agentProposalApproveRejectUndoRedo'].map(k=>[k,true]))}))},liveAgent:{status:'passed',scope:'read-only',ownerApproved:true,syntheticOnly:true,readbackVerified:true,revocationVerified:true,postRevocationDenied:true,receiptSha256:digest},rollback:{status:'passed',isolatedRestoreVerified:true,artifactSha256:digest,profileSha256:digest}}};
}
test('Mac scope can qualify without fabricating any iOS pass',()=>{
 const r=validateMacRelease(fixture()); assert.equal(r.scope,'macos');assert.equal(r.artifacts.ios,undefined);assert.match(r.iosAcceptance,/required-by-separate-ios/);
});
for (const [name, mutate] of [
 ['older executable source',f=>f.installed.buildInfo.sourceSha='c'.repeat(40)],
 ['dirty build source',f=>f.installed.buildInfo.sourceClean=false],
 ['legacy failed provider receipt',f=>f.providerReceipt={providerStarted:false,nativeProcessExited:true,blocker:'Token invalid/expired or synthetic scope mismatch; provider not started.'}],
 ['provider did not start',f=>f.providerReceipt.providerStarted=false],
 ['provider unsuccessful exit',f=>f.providerReceipt.providerExitCode=1],
 ['provider cleanup failed',f=>f.providerReceipt.cleanupBlocker='RuntimeError'],
 ['provider substituted binary',f=>f.providerReceipt.executableSha256='c'.repeat(64)],
 ['provider stale source',f=>f.providerReceipt.sourceSha='c'.repeat(40)],
 ['provider stale time',f=>f.providerReceipt.startedAt='2025-01-01'],
 ['provider unauthenticated',f=>f.providerReceipt.authenticatedPreflightPassed=false],
 ['provider no read evidence',f=>f.providerReceipt.gatewayReadProofPresent=false],
 ['provider no denial',f=>f.providerReceipt.postRevocationDenied=false],
 ['provider registration',f=>f.providerReceipt.persistentRegistration=true],
 ['wrong source',f=>f.installed.sourceSha='c'.repeat(40)],
 ['wrong version',f=>f.installed.bundle.version='0.1.1'],
 ['wrong artifact',f=>f.dmgSha256='c'.repeat(64)],
 ['wrong schema',f=>f.installed.schema='browser-mock'],
 ['failed receipt',f=>f.installed.ok=false],
 ['unsigned',f=>f.installed.gates.signing.status='development-only'],
 ['wrong team',f=>f.installed.gates.signing.teamIdentifier='OTHER'],
 ['not stapled',f=>f.installed.gates.notarization.status='unperformed'],
 ['Gatekeeper absent',f=>f.installed.gates.gatekeeper.status='unperformed'],
 ['relaunch absent',f=>f.installed.state.relaunchExact=false],
 ['missing mount verification',f=>f.installed.evidence.hdiutilVerify=false],
 ['wrong acceptance scope',f=>f.acceptance.scope='ios'],
 ['stale acceptance',f=>f.acceptance.sourceSha='c'.repeat(40)],
 ['substituted executable',f=>f.acceptance.artifact={...f.acceptance.artifact,executableSha256:'c'.repeat(64)}],
 ['one physical run',f=>f.acceptance.nativeUI.runs.pop()],
 ['reused run ID',f=>f.acceptance.nativeUI.runs[1].id='one'],
 ['mock UI',f=>f.acceptance.nativeUI.runs[0].physicalMac=false],
 ['old UI evidence',f=>f.acceptance.nativeUI.runs[0].completedAt='2025-01-01'],
 ['missing Compose acceptance',f=>f.acceptance.nativeUI.runs[0].checks.composeSaveRestore=false],
 ['provider not run',f=>f.acceptance.liveAgent.status='pending'],
 ['no owner consent',f=>f.acceptance.liveAgent.ownerApproved=false],
 ['no revocation proof',f=>f.acceptance.liveAgent.postRevocationDenied=false],
 ['no rollback',f=>f.acceptance.rollback.status='pending'],
 ['backup mismatch',f=>f.rollbackProfileSha256='c'.repeat(64)]
]) test(`rejects ${name}`,()=>{const f=fixture();mutate(f);assert.throws(()=>validateMacRelease(f));});
test('cleanup terminates only the directly owned child and leaves another child alive',async()=>{
 const first=launchOwned(process.execPath,process.env,['-e','setInterval(()=>{},1000)']);
 const second=launchOwned(process.execPath,process.env,['-e','setInterval(()=>{},1000)']);
 try {await first.stop();assert.equal(first.alive(),false);assert.equal(second.alive(),true);await first.stop();assert.equal(second.alive(),true);} finally {await first.stop();await second.stop();}
});

test('build-info capture is bounded and isolated even when an old binary ignores the flag', async () => {
 const child = launchOwned(process.execPath, {...process.env, CREATE_SOMETHING_DRAW_HOME:'/synthetic-isolated-profile', CREATE_SOMETHING_DRAW_ENABLE_LAN:'0'}, ['-e', "console.log(process.env.CREATE_SOMETHING_DRAW_HOME);setInterval(()=>{},1000)"], true);
 try {await assert.rejects(child.result(100), /timed out/);assert.equal(child.alive(),true);} finally {await child.stop();}
 assert.equal(child.alive(),false);
});
test('build-info captures actual completed output', async () => {
 const child = launchOwned(process.execPath, {...process.env, CREATE_SOMETHING_DRAW_HOME:'/synthetic-isolated-profile'}, ['-e', 'console.log(JSON.stringify({sourceSha:"synthetic",home:process.env.CREATE_SOMETHING_DRAW_HOME}))'], true);
 try {const result=await child.result();assert.equal(result.code,0);assert.equal(JSON.parse(result.stdout).sourceSha,'synthetic');assert.equal(JSON.parse(result.stdout).home,'/synthetic-isolated-profile');} finally {await child.stop();}
});

test('a failed signal cannot authorize profile cleanup while the child remains alive', async () => {
 const child = new EventEmitter(); child.pid = 123;
 child.kill = () => { child.emit('error', Error('synthetic EPERM')); return false; };
 const owned = trackOwned(child);
 await assert.rejects(owned.stop(20), /preserve its profile/);
 assert.equal(owned.alive(),true);
 child.emit('close',0);
 await owned.stop(); assert.equal(owned.alive(),false);
});
