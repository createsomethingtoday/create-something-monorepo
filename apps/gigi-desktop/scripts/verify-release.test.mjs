import test from 'node:test';
import assert from 'node:assert/strict';
import { chmod, cp, mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { verifyRelease } from './verify-release.mjs';

const team='ABCDE12345';
const developerId=`Developer ID Application: CREATE SOMETHING (${team})`;
const signed=`Identifier=agency.createsomething.gigi\nAuthority=${developerId}\nAuthority=Developer ID Certification Authority\nAuthority=Apple Root CA\nTeamIdentifier=${team}\nTimestamp=Sep 30, 2026 at 1:00:00 PM\nCodeDirectory flags=0x10000(runtime)\nCDHash=${'a'.repeat(40)}\n`;
const upstream=signed.replaceAll(team,'6JJ2TTFB9A').replace('CREATE SOMETHING','ctx engineering inc');

async function fixture(t) {
 const root=await mkdtemp(join(tmpdir(),'gigi-release-verifier-'));
 t.after(()=>rm(root,{recursive:true,force:true}));
 const appPath=join(root,'GiGi.app'),dmgPath=join(root,'GiGi.dmg');
 await mkdir(join(appPath,'Contents','MacOS'),{recursive:true});
 await mkdir(join(appPath,'Contents','Resources'),{recursive:true});
 await writeFile(join(appPath,'Contents','Info.plist'),'test fixture');
 await writeFile(join(appPath,'Contents','MacOS','gigi'),'main',{mode:0o755});
 for(const name of ['gigi-mcp','gigi-integrations','ctx'])await writeFile(join(appPath,'Contents','Resources',name),name,{mode:0o755});
 await writeFile(dmgPath,'disk image fixture');
 return {root,appPath,dmgPath};
}

function commands({appPath,adHoc=false,alterMount=false,unlaunchableMount=false,override}) {
 const calls=[];
 async function run(command,args) {
  calls.push([command,...args]);
  const path=args.at(-1);
  const substituted=await override?.(command,args);
  if(substituted)return substituted;
  if(command==='plutil')return {exitCode:0,stdout:'agency.createsomething.gigi\n',stderr:''};
  if(command==='hdiutil'&&args[0]==='attach'){
   const mount=args[args.indexOf('-mountpoint')+1];
   const mounted=join(mount,basename(appPath));
   await cp(appPath,mounted,{recursive:true});
   if(alterMount)await writeFile(join(mounted,'Contents','Resources','gigi-mcp'),'changed');
   if(unlaunchableMount)await chmod(join(mounted,'Contents','Resources','gigi-mcp'),0o644);
   return {exitCode:0,stdout:`${mount}\n`,stderr:''};
  }
  if(command==='hdiutil'&&args[0]==='detach'){
   await rm(join(path,basename(appPath)),{recursive:true,force:true});
   return {exitCode:0,stdout:'detached\n',stderr:''};
  }
  if(command==='hdiutil')return {exitCode:0,stdout:'verified CRC32\n',stderr:''};
  if(command==='codesign'&&args.includes('-dv')){
   if(path.endsWith('/ctx'))return {exitCode:0,stdout:'',stderr:upstream};
   if(adHoc&&path===appPath)return {exitCode:0,stdout:'',stderr:'Signature=adhoc\nTeamIdentifier=not set\n'};
   return {exitCode:0,stdout:'',stderr:signed};
  }
  if(command==='spctl')return {exitCode:0,stdout:'',stderr:`${path}: accepted\nsource=Notarized Developer ID\norigin=${developerId}\n`};
  if(command==='xcrun')return {exitCode:0,stdout:'The validate action worked!\n',stderr:''};
  return {exitCode:0,stdout:'valid on disk\n',stderr:''};
 }
 return {run,calls};
}

test('a complete signed and stapled pair qualifies only when the mounted app matches',async(t)=>{
 const {appPath,dmgPath}=await fixture(t);
 const {run,calls}=commands({appPath});
 const result=await verifyRelease({appPath,dmgPath,sourceSha:'1'.repeat(40),run});
 assert.equal(result.qualified,true);
 assert.equal(result.teamIdentifier,team);
 assert.equal(result.assertedSourceSha,'1'.repeat(40));
 assert.match(result.appExecutableSha256,/^[a-f0-9]{64}$/);
 assert.match(result.dmgSha256,/^[a-f0-9]{64}$/);
 assert.equal(result.appBundleSha256,result.dmgAppBundleSha256);
 assert.ok(calls.some(call=>call[0]==='hdiutil'&&call[1]==='attach'&&call.includes('-readonly')));
 assert.ok(calls.some(call=>call[0]==='hdiutil'&&call[1]==='detach'));
});

test('ad-hoc app signature fails closed before Gatekeeper or mount',async(t)=>{
 const {appPath,dmgPath}=await fixture(t);
 const {run,calls}=commands({appPath,adHoc:true});
 const result=await verifyRelease({appPath,dmgPath,run});
 assert.equal(result.qualified,false);
 assert.equal(result.reason,'app_identity');
 assert.ok(!calls.some(call=>call[0]==='hdiutil'&&call[1]==='attach'));
});

test('different app bytes inside the DMG fail and the owned mount is detached',async(t)=>{
 const {appPath,dmgPath}=await fixture(t);
 const {run,calls}=commands({appPath,alterMount:true});
 const result=await verifyRelease({appPath,dmgPath,run});
 assert.equal(result.qualified,false);
 assert.equal(result.reason,'dmg_app_mismatch');
 assert.ok(calls.some(call=>call[0]==='hdiutil'&&call[1]==='detach'));
});

test('a byte-identical mounted app with a nonexecutable companion is unqualified',async(t)=>{
 const {appPath,dmgPath}=await fixture(t);
 const {run,calls}=commands({appPath,unlaunchableMount:true});
 const result=await verifyRelease({appPath,dmgPath,run});
 assert.equal(result.qualified,false);
 assert.equal(result.reason,'dmg_app_unlaunchable');
 assert.ok(calls.some(call=>call[0]==='hdiutil'&&call[1]==='detach'));
});

test('wrong bundle identifier and unsigned first-party companion cannot qualify',async(t)=>{
 const {appPath,dmgPath}=await fixture(t);
 const wrongBundle=commands({appPath,override:(command)=>command==='plutil'?{exitCode:0,stdout:'other.app\n',stderr:''}:null});
 assert.equal((await verifyRelease({appPath,dmgPath,run:wrongBundle.run})).reason,'app_identifier');
 const unsigned=commands({appPath,override:(command,args)=>command==='codesign'&&args.includes('-dv')&&args.at(-1).endsWith('/gigi-mcp')?{exitCode:0,stdout:'',stderr:'Signature=adhoc\nTeamIdentifier=not set\n'}:null});
 assert.equal((await verifyRelease({appPath,dmgPath,run:unsigned.run})).reason,'companion_identity');
});

test('Gatekeeper and stapler failures remain distinct from signed identity',async(t)=>{
 const {appPath,dmgPath}=await fixture(t);
 const gatekeeper=commands({appPath,override:(command,args)=>command==='spctl'&&args.includes('execute')?{exitCode:3,stdout:'',stderr:'rejected'}:null});
 assert.equal((await verifyRelease({appPath,dmgPath,run:gatekeeper.run})).reason,'app_gatekeeper');
 const stapler=commands({appPath,override:(command,args)=>command==='xcrun'&&args.at(-1)===dmgPath?{exitCode:1,stdout:'',stderr:'not stapled'}:null});
 assert.equal((await verifyRelease({appPath,dmgPath,run:stapler.run})).reason,'dmg_staple');
});

test('failed image attach does not detach another mount and removes only an empty owned directory',async(t)=>{
 const {appPath,dmgPath}=await fixture(t);
 const fixtureCommands=commands({appPath,override:(command,args)=>command==='hdiutil'&&args[0]==='attach'?{exitCode:1,stdout:'',stderr:'attach failed'}:null});
 const result=await verifyRelease({appPath,dmgPath,run:fixtureCommands.run});
 assert.equal(result.reason,'dmg_mount');
 assert.ok(fixtureCommands.calls.some(call=>call[0]==='hdiutil'&&call[1]==='info'));
 assert.ok(!fixtureCommands.calls.some(call=>call[0]==='hdiutil'&&call[1]==='detach'));
});
