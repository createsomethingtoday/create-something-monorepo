import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, realpathSync, cpSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'../..');
const skill=path.join(root,'.agents/skills/canon-work');
const run=(cmd,args,cwd)=>spawnSync(cmd,args,{cwd,encoding:'utf8'});
function fixture(t){const dir=mkdtempSync(path.join(tmpdir(),'canon work ')); t.after(()=>rmSync(dir,{recursive:true,force:true})); for(const args of [['init'],['config','user.email','fixture@example.test'],['config','user.name','Fixture']]) assert.equal(run('git',args,dir).status,0); writeFileSync(path.join(dir,'package.json'),JSON.stringify({scripts:{test:'node -e "require(\'fs\').writeFileSync(\'EXECUTED\',\'bad\')"',check:'exit 1',dev:'exit 0'}})); run('git',['add','.'],dir); assert.equal(run('git',['commit','-m','fixture'],dir).status,0); mkdirSync(path.join(dir,'.agents/skills'),{recursive:true}); cpSync(skill,path.join(dir,'.agents/skills/canon-work'),{recursive:true}); mkdirSync(path.join(dir,'nested dir')); return dir;}
const readConfig=()=>JSON.parse(readFileSync(path.join(root,'t3.json'),'utf8'));
test('workspace action is unique and worktree bootstrap remains blocking', () => {
  const current = readConfig();
  assert.deepEqual(current.scripts.filter(action => action.name === 'Check workspace'), [{
    name: 'Check workspace',
    command: 'node .agents/skills/canon-work/scripts/workspace-check.mjs',
    icon: 'test',
  }]);
  const bootstrap = current.scripts.find(action => action.name === 'Bootstrap worktree');
  assert.ok(bootstrap, 'the existing bootstrap action must remain available');
  assert.equal(bootstrap.command, 'bash scripts/bootstrap-worktree.sh');
  assert.equal(bootstrap.runOnWorktreeCreate, true);
  assert.equal(bootstrap.async, false);
});
test('exact adopted action reads fixture without mutations or package execution',t=>{const dir=fixture(t); const before=run('git',['status','--porcelain=v1','-z'],dir).stdout; const action=readConfig().scripts.find(x=>x.name==='Check workspace'); const result=run('/bin/sh',['-c',action.command],dir); assert.equal(result.status,0,result.stderr); assert.equal(existsSync(path.join(dir,'EXECUTED')),false); assert.match(result.stdout,/Checks: not run; 2 candidates/); assert.doesNotMatch(result.stdout,/validation (passed|successful)/i); assert.equal(run('git',['status','--porcelain=v1','-z'],dir).stdout,before); const script=path.join(dir,'.agents/skills/canon-work/scripts/workspace-check.mjs'); const nested=path.join(dir,'nested dir'); const data=JSON.parse(run(process.execPath,[script,'.','--json'],nested).stdout); assert.equal(data.root,realpathSync(dir)); assert.deepEqual(data.validationCandidates,['test','check']); assert.equal(JSON.parse(run(process.execPath,[script,nested,'--json'],root).stdout).head,data.head); assert.equal(run(process.execPath,[script,path.join(dir,'missing')],root).status,1); assert.equal(run('git',['status','--porcelain=v1','-z'],dir).stdout,before);});
test('planner preserves fields, is idempotent and rejects conflicts/malformed/capacity',t=>{const dir=fixture(t); const file=path.join(dir,'t3.json'); const planner=path.join(dir,'.agents/skills/canon-work/scripts/plan-actions.mjs'); const plan=value=>{writeFileSync(file,JSON.stringify(value)); const before=readFileSync(file,'utf8'); const result=run(process.execPath,[planner,file],path.join(dir,'nested dir')); assert.equal(readFileSync(file,'utf8'),before); return result;}; const initial={future:{keep:true},scripts:[{name:'Existing',command:'echo keep',async:false}]}; const first=plan(initial); assert.equal(first.status,0,first.stderr); const proposed=JSON.parse(first.stdout); assert.deepEqual(proposed.future,initial.future); assert.deepEqual(proposed.scripts[0],initial.scripts[0]); assert.deepEqual(JSON.parse(plan(proposed).stdout),proposed); for(const bad of [{scripts:[{name:'Check workspace',command:'wrong'}]},{scripts:[{name:'x',command:'x'},{name:'x',command:'x'}]},{scripts:'bad'},{scripts:[null]},{scripts:[{name:'x',command:'x',async:'false'}]}]) assert.equal(plan(bad).status,1); const many=Array.from({length:49},(_,i)=>({name:`a${i}`,command:'true'})); assert.equal(plan({scripts:many}).status,0); assert.equal(plan({scripts:[...many,{name:'last',command:'true'}]}).status,1); const full=JSON.parse(plan({scripts:many}).stdout); assert.equal(plan(full).status,0); writeFileSync(file,'{'); assert.equal(run(process.execPath,[planner,file],dir).status,1);});
