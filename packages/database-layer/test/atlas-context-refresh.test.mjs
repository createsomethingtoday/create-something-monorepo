import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { setTimeout as wait } from 'node:timers/promises';
import { searchContext } from '../scripts/atlas-context.mjs';

function fixture() {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'atlas-refresh-'));
  const pkg=path.join(root,'packages/database-layer');
  fs.mkdirSync(path.join(pkg,'scripts'),{recursive:true});
  fs.mkdirSync(path.join(pkg,'data'),{recursive:true});
  fs.writeFileSync(path.join(pkg,'data/source.json'),JSON.stringify({text:'Original approval policy'}));
  fs.writeFileSync(path.join(pkg,'scripts/generate-agent-wiki.mjs'), `import fs from 'node:fs';
const value=JSON.parse(fs.readFileSync('packages/database-layer/data/source.json'));
if(value.fail) process.exit(1);
const files=Object.fromEntries(['README','operating-loop','business-recommendations','topology-inventory','management-surface','operating-slices','agent-routes'].map(name=>[name+'.md','# '+name+'\\n\\n> Source snapshot range (UTC): 2026-01-01T00:00:00.000Z to 2026-01-01T00:00:00.000Z.\\n\\n'+value.text+'\\n']));
console.log(JSON.stringify({files}));`);
  return {root,pkg,source:path.join(pkg,'data/source.json')};
}

test('automatic refresh changes local projection on new inputs without touching tracked wiki',async()=>{
 const f=fixture();
 try {
  const first=searchContext('approval',{root:f.root});
  assert.equal(first.refresh.status,'refreshed');
  assert.equal(first.freshness.liveVerified,false);
  assert.equal(first.freshness.stale,true);
  const warm=searchContext('approval',{root:f.root});
  assert.equal(warm.refresh.status,'current');
  fs.writeFileSync(f.source,JSON.stringify({text:'Revised approval policy'}));
  const pending=searchContext('Revised',{root:f.root});
  assert.equal(pending.refresh.status,'debounced');
  assert.equal(pending.freshness.projectionConsistency,'stale_local_projection');
  await wait(220);
  const next=searchContext('Revised',{root:f.root});
  assert.equal(next.refresh.status,'refreshed');
  assert.match(next.results[0].excerpt,/Revised/);
  assert.equal(fs.existsSync(path.join(f.pkg,'docs/agent-wiki')),false);
  assert.ok(fs.existsSync(path.join(f.root,next.results[0].path)));
 } finally {fs.rmSync(f.root,{recursive:true,force:true});}
});

import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { repoRoot } from '../scripts/atlas-context.mjs';
const moduleUrl=new URL('../scripts/atlas-context.mjs',import.meta.url).href;
const childSearch=root=>new Promise((resolve,reject)=>{
 const child=spawn(process.execPath,['--input-type=module','-e',`import {searchContext} from ${JSON.stringify(moduleUrl)}; console.log(JSON.stringify(searchContext('approval',{root:process.argv[1]})));`,root]);
 let output='',error=''; child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>error+=b);
 child.on('error',reject);child.on('exit',code=>{try{code===0?resolve(JSON.parse(output)):reject(new Error(error));}catch(e){reject(e);}});
});

test('one refresh publishes atomically while concurrent readers receive a marked last-good snapshot',async()=>{
 const f=fixture();
 try {
  searchContext('approval',{root:f.root});
  const script=path.join(f.pkg,'scripts/generate-agent-wiki.mjs');
  fs.appendFileSync(script,"\nawait new Promise(r=>setTimeout(r,350));\n");
  fs.writeFileSync(f.source,JSON.stringify({text:'Revised approval policy'}));
  await wait(220);
  const results=await Promise.all(Array.from({length:6},()=>childSearch(f.root)));
  assert.equal(results.filter(r=>r.refresh.status==='refreshed').length,1);
  const pending=results.filter(r=>r.refresh.status==='refresh_in_progress');
  assert.ok(pending.length>0);
  for(const result of pending) {
   assert.equal(result.freshness.projectionConsistency,'stale_local_projection');
   assert.match(result.results[0].excerpt,/Original/);
   assert.equal(result.refresh.serving,'last_good');
  }
  const final=searchContext('Revised',{root:f.root});
  assert.equal(final.refresh.status,'current');
  assert.match(final.results[0].excerpt,/Revised/);
  for(const result of results) for(const hit of result.results) {
   const lines=fs.readFileSync(path.join(f.root,hit.path),'utf8').split('\n');
   assert.equal(hit.excerpt,hit.sourceLines.map(n=>lines[n-1]).join('\n'));
  }
 }finally{fs.rmSync(f.root,{recursive:true,force:true});}
});

test('failure retains last good, reports failure/backoff, and changed corrected inputs recover',async()=>{
 const f=fixture();
 try {
  const first=searchContext('approval',{root:f.root});
  const before=fs.readFileSync(path.join(f.root,'.cache/atlas-context/projection.json'),'utf8');
  fs.writeFileSync(f.source,JSON.stringify({fail:true}));
  await wait(220);
  const failed=searchContext('approval',{root:f.root});
  assert.equal(failed.refresh.status,'failed');
  assert.equal(failed.refresh.reason,'generator_failed');
  assert.equal(failed.refresh.serving,'last_good');
  assert.deepEqual(failed.results,first.results);
  assert.equal(fs.readFileSync(path.join(f.root,'.cache/atlas-context/projection.json'),'utf8'),before);
  assert.equal(searchContext('approval',{root:f.root}).refresh.status,'debounced');
  fs.writeFileSync(f.source,JSON.stringify({text:'Recovered approval policy'}));
  assert.equal(searchContext('approval',{root:f.root}).refresh.status,'refreshed');
 }finally{fs.rmSync(f.root,{recursive:true,force:true});}
});

test('refresh off never creates a cache; generator timeouts are bounded and input races never publish',()=>{
 const f=fixture();
 try {
  assert.equal(searchContext('approval',{root:f.root,refresh:'off'}).refresh.status,'off');
  assert.equal(fs.existsSync(path.join(f.root,'.cache')),false);
  const script=path.join(f.pkg,'scripts/generate-agent-wiki.mjs');
  const original=fs.readFileSync(script,'utf8');
  fs.appendFileSync(script,"\nawait new Promise(r=>setTimeout(r,5000));\n");
  const start=performance.now();
  const timeout=searchContext('approval',{root:f.root});
  assert.equal(timeout.refresh.reason,'refresh_timeout');
  assert.ok(performance.now()-start<3500);
  assert.equal(fs.existsSync(path.join(f.root,'.cache/atlas-context/projection.json')),false);
  fs.writeFileSync(script,original+"\nfs.writeFileSync('packages/database-layer/data/source.json',JSON.stringify({text:'Changed during render'}));\n");
  const raced=searchContext('approval',{root:f.root});
  assert.equal(raced.refresh.reason,'inputs_changed_during_refresh');
  assert.equal(fs.existsSync(path.join(f.root,'.cache/atlas-context/projection.json')),false);
 }finally{fs.rmSync(f.root,{recursive:true,force:true});}
});

test('production render-only generator returns seven modules without modifying tracked projection',()=>{
 const directory=path.join(repoRoot,'packages/database-layer/docs/agent-wiki');
 const before=Object.fromEntries(fs.readdirSync(directory).map(n=>[n,fs.readFileSync(path.join(directory,n),'utf8')]));
 const output=spawnSync(process.execPath,['packages/database-layer/scripts/generate-agent-wiki.mjs','--json'],{cwd:repoRoot,encoding:'utf8'});
 assert.equal(output.status,0,output.stderr);
 assert.equal(Object.keys(JSON.parse(output.stdout).files).length,7);
 const after=Object.fromEntries(fs.readdirSync(directory).map(n=>[n,fs.readFileSync(path.join(directory,n),'utf8')]));
 assert.deepEqual(after,before);
});

test('unavailable cache falls back visibly and a dead lock owner is recoverable',()=>{
 const f=fixture();
 try {
  fs.writeFileSync(path.join(f.root,'.cache'),'blocked');
  const blocked=searchContext('approval',{root:f.root});
  assert.equal(blocked.refresh.status,'failed');
  assert.equal(blocked.refresh.reason,'cache_unavailable');
  assert.equal(blocked.refresh.serving,'tracked_wiki');
  fs.unlinkSync(path.join(f.root,'.cache'));
  const directory=path.join(f.root,'.cache/atlas-context');
  fs.mkdirSync(directory,{recursive:true});
  fs.writeFileSync(path.join(directory,'refresh.lock'),JSON.stringify({pid:2147483647,token:'dead'}));
  assert.equal(searchContext('approval',{root:f.root}).refresh.status,'refreshed');
  assert.equal(fs.existsSync(path.join(directory,'refresh.lock')),false);
 }finally{fs.rmSync(f.root,{recursive:true,force:true});}
});
