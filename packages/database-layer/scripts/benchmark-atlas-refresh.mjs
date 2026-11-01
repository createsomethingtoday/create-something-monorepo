#!/usr/bin/env node
// Exercise the real renderer with an isolated ignored cache, never edit source artifacts.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { repoRoot } from './atlas-context.mjs';
const moduleUrl=pathToFileURL(path.join(repoRoot,'packages/database-layer/scripts/atlas-context.mjs')).href;
const workspace=fs.mkdtempSync(path.join(os.tmpdir(),'atlas-refresh-benchmark-'));
const samples={cold:[],warm:[],forcedRefresh:[]};
const measure=(root,operation)=>{
 const start=performance.now();
 const program=`import {searchContext,indexContext} from ${JSON.stringify(moduleUrl)}; const root=process.argv[1]; console.log(JSON.stringify(${operation}));`;
 const run=spawnSync(process.execPath,['--input-type=module','-e',program,root],{encoding:'utf8'});
 if(run.status!==0) throw new Error(run.stderr);
 return {ms:+(performance.now()-start).toFixed(2),bytes:Buffer.byteLength(run.stdout),value:JSON.parse(run.stdout)};
};
try {
 for(let i=0;i<5;i++) {
  const root=path.join(workspace,String(i));fs.mkdirSync(root);
  for(const name of ['packages','docs']) fs.symlinkSync(path.join(repoRoot,name),path.join(root,name),'dir');
  const cold=measure(root,"searchContext('client delivery packets',{root})");
  const warm=measure(root,"searchContext('client delivery packets',{root})");
  const forced=measure(root,'indexContext({root})');
  if(cold.value.refresh.status!=='refreshed'||warm.value.refresh.status!=='current'||forced.value.refresh.status!=='refreshed') throw new Error('Unexpected refresh state');
  for(const r of [cold,warm]) if(r.value.results[0].sourceId!=='atlas-context:business-recommendations'||r.value.freshness.liveVerified!==false) throw new Error('Wrong source or authority');
  for(const [mode,result] of [['cold',cold],['warm',warm],['forcedRefresh',forced]]) samples[mode].push({ms:result.ms,bytes:result.bytes});
 }
 const statistics=Object.fromEntries(Object.entries(samples).map(([mode,rows])=>{
  const times=rows.map(r=>r.ms).sort((a,b)=>a-b);
  return [mode,{medianMs:times[2],p95Ms:times[4],contextBytes:rows[0].bytes}];
 }));
 console.log(JSON.stringify({node:process.version,platform:process.platform,arch:process.arch,trials:5,definition:'Separate Node processes; cold uses a fresh cache, warm validates content, forcedRefresh runs the real render/publish path. OS cache is not flushed. Inputs are symlinked read-only by convention; only temporary cache outputs are written.',statistics,samples},null,2));
}finally{fs.rmSync(workspace,{recursive:true,force:true});}
