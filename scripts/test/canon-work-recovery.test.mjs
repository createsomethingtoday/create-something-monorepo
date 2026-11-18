import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, realpathSync, appendFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const script=path.resolve('.agents/skills/canon-work/scripts/workspace-check.mjs');
const quote=s=>"'"+s.replaceAll("'","'\\''")+"'";
function observed(command,args,options={}) {
 const startedAt=new Date().toISOString();
 const result=spawnSync(command,args,{encoding:'utf8',...options});
 if(process.env.CANON_REPAIR_EVIDENCE) appendFileSync(process.env.CANON_REPAIR_EVIDENCE,JSON.stringify({startedAt,finishedAt:new Date().toISOString(),command,args,cwd:options.cwd??process.cwd(),status:result.status,signal:result.signal,error:result.error?.message,stdout:result.stdout,stderr:result.stderr,helperSha256:createHash('sha256').update(readFileSync(script)).digest('hex')})+'\n');
 return result;
}
function recoveryFixture(t,name="checkout ' $() ü") {
 const parent=mkdtempSync(path.join(tmpdir(),'canon recovery cases '));
 t.after(()=>rmSync(parent,{recursive:true,force:true}));
 const directory=path.join(parent,name); mkdirSync(directory);
 const realGit=spawnSync('/bin/sh',['-c','command -v git'],{encoding:'utf8'}).stdout.trim();
 const git=(...args)=>{const result=observed(realGit,['-C',directory,...args]); assert.equal(result.status,0,result.stderr); return result.stdout.replace(/\n$/,'');};
 git('init','-b','working'); git('config','user.email','fixture@example.test'); git('config','user.name','Fixture');
 writeFileSync(path.join(directory,'package.json'),JSON.stringify({scripts:{test:'touch EXECUTED'}}));
 git('add','.'); git('commit','-m','fixture');
 const head=git('rev-parse','HEAD');
 const check=(args=['--json'],options={})=>observed(process.execPath,[script,...args],options);
 const checkTarget=(args=['--json'],options={})=>check([directory,...args],options);
 const wrapper=body=>{const bin=path.join(parent,'bin');mkdirSync(bin,{recursive:true});writeFileSync(path.join(bin,'git'),`#!/bin/sh\n${body}\nexec ${quote(realGit)} "$@"\n`,{mode:0o755});return {...process.env,PATH:`${bin}:${process.env.PATH}`};};
 return {directory,git,head,check,checkTarget,wrapper,realGit};
}

test('Git root preserves trailing filename whitespace for explicit and current directories',t=>{
 const {directory,check,checkTarget,git}=recoveryFixture(t,"checkout ' $() ü \t ");
 const before=git('status','--porcelain=v1','-z');
 for(const [result,cwd] of [[checkTarget(),process.cwd()],[check(['--json'],{cwd:directory}),directory]]) {
  assert.equal(result.status,0,result.stdout);
  const data=JSON.parse(result.stdout);
  assert.equal(data.root,realpathSync(directory));assert.equal(data.directory,realpathSync(directory));
  const next=observed('/bin/sh',['-c',data.nextCommand],{cwd});assert.equal(next.status,0,next.stderr);
  const details=observed('/bin/sh',['-c',data.detailsCommand],{cwd});assert.equal(details.status,0,details.stderr);assert.equal(JSON.parse(details.stdout).root,data.root);
 }
 assert.equal(git('status','--porcelain=v1','-z'),before);
 assert.equal(existsSync(path.join(directory,'EXECUTED')),false);
});

test('branch lookup errors and signals remain unknown with their own retry command',t=>{
 const {directory,head,git,checkTarget,wrapper}=recoveryFixture(t);
 const before=git('status','--porcelain=v1','-z');
 for(const [body,cause] of [
  ['echo "fatal: injected branch metadata I/O failure" >&2; exit 73',/exit 73.*injected branch metadata I\/O failure/],
  ['echo "fatal: injected branch read failure" >&2; exit 1',/exit 1.*injected branch read failure/],
  ['kill -TERM "$$"',/SIGTERM/],
 ]) {
  const env=wrapper(`if [ "$3" = symbolic-ref ]; then ${body}; fi`);
  const result=checkTarget(['--json'],{env}),human=checkTarget([],{env});
  assert.equal(result.status,1,result.stdout);assert.equal(human.status,1,human.stdout);
  const data=JSON.parse(result.stdout);
  assert.equal(data.root,realpathSync(directory));assert.equal(data.head,head);
  assert.equal(Object.hasOwn(data,'branch'),false);
  assert.match(data.finding,/branch lookup failed/i);assert.match(data.finding,cause);
  assert.match(data.unknowns.join('\n'),/branch.*unavailable/i);
  assert.doesNotMatch(human.stdout,/detached|Git status failed|Supply an existing Git directory/i);
  assert.match(human.stdout,/Branch unavailable/);
  assert.match(data.nextCommand,/symbolic-ref --quiet --short HEAD$/);
  const retry=observed('/bin/sh',['-c',data.nextCommand]);assert.equal(retry.status,0,retry.stderr);assert.equal(retry.stdout.trim(),'working');
 }
 git('checkout','--detach');
 const detached=checkTarget(),data=JSON.parse(detached.stdout);
 assert.equal(detached.status,0,detached.stdout);assert.equal(data.branch,null);assert.match(data.finding,/detached HEAD/);
 git('checkout','working');assert.equal(git('status','--porcelain=v1','-z'),before);
});

test('HEAD lookup failure preserves root and offers a HEAD diagnostic',t=>{
 const {directory,head,checkTarget,wrapper}=recoveryFixture(t);
 const env=wrapper('if [ "$3" = rev-parse ] && [ "$4" = HEAD ]; then echo "fatal: injected HEAD read failure" >&2; exit 74; fi');
 const result=checkTarget(['--json'],{env});assert.equal(result.status,1);
 const data=JSON.parse(result.stdout);
 assert.equal(data.root,realpathSync(directory));assert.equal(Object.hasOwn(data,'head'),false);
 assert.match(data.finding,/HEAD lookup failed.*exit 74.*injected HEAD read failure/);
 assert.doesNotMatch(data.nextStep,/status failed|existing Git directory/i);
 assert.match(data.nextCommand,/rev-parse HEAD$/);
 const retry=observed('/bin/sh',['-c',data.nextCommand]);assert.equal(retry.status,0);assert.equal(retry.stdout.trim(),head);
});

for(const [label,pkg,available] of [
 ['string',{scripts:'check'},false],['array',{scripts:['test']},false],['number',{scripts:42},false],['null',{scripts:null},false],
 ['absent',{},true],['empty',{scripts:{}},true],
]) test(`scripts inventory ${label} is ${available?'available':'unavailable'}`,t=>{
 const {directory,git,head,checkTarget}=recoveryFixture(t);
 writeFileSync(path.join(directory,'package.json'),JSON.stringify(pkg));
 const before=git('status','--porcelain=v1','-z'), result=checkTarget(), human=checkTarget([]);
 assert.equal(result.status,0,result.stdout);assert.equal(human.status,0,human.stdout);
 const data=JSON.parse(result.stdout);
 assert.equal(data.head,head);assert.equal(data.branch,'working');assert.deepEqual(data.validationCandidates,[]);
 if(available){
  assert.match(human.stdout,/0 candidates \(inventory available as JSON\)/);
  assert.doesNotMatch(data.unknowns.join('\n'),/package\.json/);
 }else{
  assert.match(human.stdout,/candidate inventory unavailable/);
  assert.doesNotMatch(human.stdout,/0 candidates/);
  assert.match(data.unknowns.join('\n'),/Root package\.json unavailable or malformed/);
 }
 assert.equal(git('status','--porcelain=v1','-z'),before);
 assert.equal(existsSync(path.join(directory,'EXECUTED')),false);
});

test('large real status fails bounded capture with accurate stage and usable recovery',t=>{
 const {directory,head,checkTarget,realGit}=recoveryFixture(t);
 for(let i=0;i<6500;i++)writeFileSync(path.join(directory,`${String(i).padStart(5,'0')}-${'x'.repeat(169)}`),'');
 const direct=observed(realGit,['-C',directory,'status','--porcelain=v1','-z'],{maxBuffer:2*1024*1024});
 assert.equal(direct.status,0,direct.stderr);assert.ok(Buffer.byteLength(direct.stdout)>1024*1024);
 const result=checkTarget(),human=checkTarget([]);assert.equal(result.status,1);assert.equal(human.status,1);
 const data=JSON.parse(result.stdout);
 assert.equal(data.root,realpathSync(directory));assert.equal(data.head,head);assert.equal(data.branch,'working');
 assert.equal(data.trackedChanges,null);assert.equal(data.untracked,null);assert.equal(Object.hasOwn(data,'changes'),false);
 assert.match(data.finding,/Git status failed.*ENOBUFS/);assert.match(data.finding,/capture|buffer|limit/i);
 assert.doesNotMatch(human.stdout,/Git unavailable|Tracked changes: 0|0 candidates/);
 assert.match(data.nextCommand,/status --short --untracked-files=normal$/);
 const retry=observed('/bin/sh',['-c',data.nextCommand],{maxBuffer:2*1024*1024});assert.equal(retry.status,0,retry.stderr);assert.equal(retry.stdout.split('\n').filter(Boolean).length,6500);
 const after=observed(realGit,['-C',directory,'status','--porcelain=v1','-z'],{maxBuffer:2*1024*1024});assert.equal(after.status,0);assert.equal(after.stdout,direct.stdout);
 assert.equal(existsSync(path.join(directory,'EXECUTED')),false);
});

test('Git process startup error names root lookup and a copyable diagnostic',t=>{
 const {directory,checkTarget,wrapper}=recoveryFixture(t);
 const env=wrapper('');
 rmSync(path.join(env.PATH.split(':')[0],'git'));
 env.PATH=env.PATH.split(':')[0];
 const result=checkTarget(['--json'],{env});assert.equal(result.status,1);
 const data=JSON.parse(result.stdout);
 assert.match(data.finding,/Git root lookup failed.*ENOENT/);
 assert.match(data.nextCommand,/rev-parse --show-toplevel$/);
 assert.doesNotMatch(data.nextStep,/status failed/);
 const retry=observed('/bin/sh',['-c',data.nextCommand]);assert.equal(retry.status,0,retry.stderr);assert.equal(retry.stdout.replace(/\n$/,''),realpathSync(directory));
});
test('failed status preserves known identity and reports unavailable observations honestly', t => {
 const dir=mkdtempSync(path.join(tmpdir(),"canon recovery ' "));
 t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const realGit=spawnSync('/bin/sh',['-c','command -v git'],{encoding:'utf8'}).stdout.trim();
 const git=(...args)=>{const r=spawnSync(realGit,['-C',dir,...args],{encoding:'utf8'}); assert.equal(r.status,0,r.stderr); return r.stdout.trim();};
 git('init'); git('config','user.email','fixture@example.test'); git('config','user.name','Fixture');
 writeFileSync(path.join(dir,'package.json'),JSON.stringify({scripts:{test:'touch EXECUTED'}}));
 git('add','.'); git('commit','-m','fixture');
 writeFileSync(path.join(dir,'preserve'),'unchanged');
 const head=git('rev-parse','HEAD'), before=git('status','--porcelain=v1');
 const bin=path.join(dir,'wrapper'); mkdirSync(bin);
 const quote=s=>"'"+s.replaceAll("'","'\\''")+"'";
 writeFileSync(path.join(bin,'git'),`#!/bin/sh\nif [ "$3" = status ]; then echo 'injected status failure' >&2; exit 73; fi\nexec ${quote(realGit)} "$@"\n`,{mode:0o755});
 const check=(...args)=>spawnSync(process.execPath,[script,dir,...args],{encoding:'utf8',env:{...process.env,PATH:`${bin}:${process.env.PATH}`}});
 const human=check(), json=check('--json'), data=JSON.parse(json.stdout);
 assert.equal(human.status,1); assert.equal(json.status,1);
 assert.equal(data.root,realpathSync(dir)); assert.equal(data.head,head);
 assert.doesNotMatch(human.stdout,/undefined|NaN|Tracked changes: 0|0 candidates|Supply an existing Git directory/);
 assert.match(human.stdout,/Tracked changes: unavailable; untracked entries: unavailable/);
 assert.match(human.stdout,/Checks: not run; candidate inventory unavailable/);
 assert.match(human.stdout,/Upstream: not checked/);
 assert.match(data.nextStep,/status.*failed/i);
 assert.match(data.nextCommand,/status --short --untracked-files=normal$/);
 const retry=spawnSync('/bin/sh',['-c',data.nextCommand],{encoding:'utf8'});
 assert.equal(retry.status,0,retry.stderr); assert.match(retry.stdout,/preserve/);
 assert.equal(existsSync(path.join(dir,'EXECUTED')),false);
 assert.equal(readFileSync(path.join(dir,'preserve'),'utf8'),'unchanged');
 // The wrapper directory is the only fixture addition since the initial snapshot.
 assert.equal(git('status','--porcelain=v1').replace(/^\?\? wrapper\/\n?/m,'').trim(),before);
});
