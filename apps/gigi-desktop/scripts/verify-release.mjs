import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { lstat, mkdtemp, readdir, readlink, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, isAbsolute, join, relative, resolve } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync=promisify(execFile);
const firstParty=['Contents/MacOS/gigi','Contents/Resources/gigi-mcp','Contents/Resources/gigi-integrations'];
const upstream='Contents/Resources/ctx';

class ReleaseError extends Error {constructor(reason){super(reason);this.reason=reason;}}
function fail(reason){throw new ReleaseError(reason);}
async function realCommand(command,args){
 try{const {stdout,stderr}=await execFileAsync(command,args,{encoding:'utf8',timeout:120_000,maxBuffer:64*1024});return {exitCode:0,stdout,stderr};}
 catch(error){return {exitCode:typeof error.code==='number'?error.code:1,stdout:String(error.stdout??''),stderr:String(error.stderr??'')};}
}
async function command(run,name,args,reason){
 let result;
 try{result=await run(name,args);}catch{fail(reason);}
 if(result?.exitCode!==0)fail(reason);
 return `${result.stdout??''}\n${result.stderr??''}`;
}
async function requiredPath(path,extension,directory){
 if(typeof path!=='string'||!isAbsolute(path)||!path.endsWith(extension))fail('invalid_path');
 let info;
 try{info=await lstat(path);}catch{fail('invalid_path');}
 if(info.isSymbolicLink()||(directory?!info.isDirectory():!info.isFile()))fail('invalid_path');
 return resolve(path);
}
async function executable(path,reason){
 const info=await lstat(path).catch(()=>fail(reason));
 if(!info.isFile()||info.isSymbolicLink()||(info.mode&0o111)===0)fail(reason);
}
async function sha256(path){
 const hash=createHash('sha256');
 for await(const chunk of createReadStream(path))hash.update(chunk);
 return hash.digest('hex');
}
async function bundleSha256(root){
 const hash=createHash('sha256');
 async function visit(folder){
  const names=(await readdir(folder)).sort();
  for(const name of names){
   const path=join(folder,name),entry=relative(root,path),info=await lstat(path);
   if(info.isDirectory()){hash.update(`dir\0${entry}\0${info.mode&0o777}\0`);await visit(path);}
   else if(info.isSymbolicLink())hash.update(`link\0${entry}\0${await readlink(path)}\0`);
   else if(info.isFile())hash.update(`file\0${entry}\0${info.mode&0o777}\0${await sha256(path)}\0`);
   else fail('unsupported_app_entry');
  }
 }
 await visit(root);
 return hash.digest('hex');
}
function identity(details,reason,expectedTeam,expectedIdentifier,requireRuntime){
 const authority=details.match(/^Authority=(Developer ID Application: .+ \(([A-Z0-9]{10})\))$/m);
 const team=details.match(/^TeamIdentifier=([A-Z0-9]{10})$/m)?.[1];
 const cdhash=details.match(/^CDHash=([a-fA-F0-9]{40})$/m)?.[1];
 if(!authority||!team||authority[2]!==team||!cdhash||!/^Timestamp=.+$/m.test(details)||(requireRuntime&&!/\(runtime\)/.test(details))||/Signature=adhoc|\(adhoc/.test(details))fail(reason);
 if(expectedTeam&&team!==expectedTeam)fail(reason);
 if(expectedIdentifier&&!details.includes(`Identifier=${expectedIdentifier}\n`))fail(reason);
 return {authority:authority[1],team,cdhash:cdhash.toLowerCase()};
}
function accepted(output,reason,authority,notarizedSource){
 if(!/: accepted\b/.test(output))fail(reason);
 if(notarizedSource){if(!/source=Notarized Developer ID\b/.test(output)||!output.includes(`origin=${authority}`))fail(reason);}
 else if(!/source=(?:Notarized )?Developer ID\b/.test(output))fail(reason);
}
async function signature(run,path,reason,team,identifier,requireRuntime=true){
 await command(run,'codesign',['--verify','--deep','--strict','--verbose=2',path],reason);
 const details=await command(run,'codesign',['-dv','--verbose=4',path],reason);
 return identity(details,reason,team,identifier,requireRuntime);
}
async function staple(run,path,reason){
 const output=await command(run,'xcrun',['stapler','validate',path],reason);
 if(!output.includes('The validate action worked!'))fail(reason);
}

export async function verifyRelease({appPath,dmgPath,sourceSha,run=realCommand}){
 const receipt={qualified:false,reason:'unverified'};
 try{
  if(sourceSha!==undefined){if(typeof sourceSha!=='string'||!/^[a-fA-F0-9]{40}$/.test(sourceSha))fail('invalid_source_sha');receipt.assertedSourceSha=sourceSha.toLowerCase();}
  const app=await requiredPath(appPath,'.app',true),dmg=await requiredPath(dmgPath,'.dmg',false);
  const main=join(app,'Contents/MacOS/gigi');
  for(const entry of [...firstParty,upstream]){await requiredPath(join(app,entry),'',false);await executable(join(app,entry),'app_executable');}
  const bundleId=(await command(run,'plutil',['-extract','CFBundleIdentifier','raw','-o','-',join(app,'Contents/Info.plist')],'app_identifier')).trim();
  if(bundleId!=='agency.createsomething.gigi')fail('app_identifier');
  receipt.appExecutableSha256=await sha256(main);
  receipt.dmgSha256=await sha256(dmg);
  const appIdentity=await signature(run,app,'app_identity',undefined,'agency.createsomething.gigi');
  receipt.teamIdentifier=appIdentity.team;
  receipt.appCodeDirectoryHash=appIdentity.cdhash;
  for(const entry of firstParty)await signature(run,join(app,entry),'companion_identity',appIdentity.team);
  await signature(run,join(app,upstream),'ctx_identity');
  accepted(await command(run,'spctl',['--assess','--type','execute','--verbose=4',app],'app_gatekeeper'),'app_gatekeeper',appIdentity.authority,true);
  await staple(run,app,'app_staple');
  await command(run,'hdiutil',['verify',dmg],'dmg_integrity');
  const dmgIdentity=await signature(run,dmg,'dmg_identity',appIdentity.team,undefined,false);
  accepted(await command(run,'spctl',['--assess','--type','open','--context','context:primary-signature','--verbose=4',dmg],'dmg_gatekeeper'),'dmg_gatekeeper',dmgIdentity.authority,false);
  await staple(run,dmg,'dmg_staple');
  const mount=await mkdtemp(join(tmpdir(),'gigi-release-mount-'));
  let attached=false;
  let mountUnknown=false;
  try{
   try{await command(run,'hdiutil',['attach','-readonly','-nobrowse','-mountpoint',mount,dmg],'dmg_mount');attached=true;}
   catch{
    const info=await run('hdiutil',['info','-plist']).catch(()=>null);
    if(info?.exitCode!==0){mountUnknown=true;fail('dmg_mount_uncertain');}
    attached=`${info.stdout??''}\n${info.stderr??''}`.includes(mount);
    fail('dmg_mount');
   }
   const mountedApp=join(mount,basename(app));
   await requiredPath(mountedApp,'.app',true);
   for(const entry of [...firstParty,upstream])await executable(join(mountedApp,entry),'dmg_app_unlaunchable');
   receipt.appBundleSha256=await bundleSha256(app);
   receipt.dmgAppBundleSha256=await bundleSha256(mountedApp);
   if(receipt.appBundleSha256!==receipt.dmgAppBundleSha256)fail('dmg_app_mismatch');
   await command(run,'codesign',['--verify','--deep','--strict','--verbose=2',mountedApp],'dmg_app_signature');
   accepted(await command(run,'spctl',['--assess','--type','execute','--verbose=4',mountedApp],'dmg_app_gatekeeper'),'dmg_app_gatekeeper',appIdentity.authority,true);
  }finally{
   if(attached)await command(run,'hdiutil',['detach',mount],'dmg_detach');
   if(!mountUnknown)await rmdir(mount).catch(()=>fail('dmg_cleanup'));
  }
  receipt.qualified=true;
  delete receipt.reason;
 }catch(error){receipt.reason=error instanceof ReleaseError?error.reason:'verification_error';}
 return receipt;
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [appPath,dmgPath,...rest]=process.argv.slice(2);
 const sourceSha=rest.length===2&&rest[0]==='--source-sha'?rest[1]:undefined;
 const receipt=rest.length&&!sourceSha?{qualified:false,reason:'usage'}:await verifyRelease({appPath,dmgPath,sourceSha});
 process.stdout.write(`${JSON.stringify(receipt)}\n`);
 if(!receipt.qualified)process.exitCode=1;
}
