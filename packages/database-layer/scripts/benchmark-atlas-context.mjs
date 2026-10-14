#!/usr/bin/env node
// Explicit local benchmark: creates/replaces only the ignored context index.
import { spawnSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { indexContext, repoRoot, searchContext } from './atlas-context.mjs';
import { prepareWikiRoute } from './agent-wiki-route.mjs';
const cases = [
  ['production approval operations', 'management-surface'],
  ['client delivery packets', 'business-recommendations'],
  ['source snapshot freshness', 'README'],
  ['Substrate record truth Atlas canvas', 'operating-loop'],
  ['database_layer_get_topology_record_context', 'management-surface'],
];
const stats = values => {
  values.sort((a,b) => a-b);
  return { median: +values[Math.floor(values.length/2)].toFixed(2), p95: +values[Math.min(values.length-1, Math.ceil(values.length*.95)-1)].toFixed(2) };
};
const start = performance.now();
const indexed = indexContext();
const indexMs = performance.now()-start;
const results = [];
for (const [query, expected] of cases) {
  const row = { query, expectedSource: `atlas-context:${expected}` };
  for (const mode of ['cold','warm']) {
    const core=[], cli=[];
    for(let i=0;i<5;i++) {
      let start=performance.now();
      const r=searchContext(query,{ignoreCache:mode==='cold'});
      core.push(performance.now()-start);
      if(r.results[0]?.sourceId !== row.expectedSource) throw new Error(`Wrong top source: ${query}`);
      row.contextBytes=Buffer.byteLength(JSON.stringify(r));
      start=performance.now();
      const processResult=spawnSync(process.execPath,['packages/database-layer/scripts/atlas-context.mjs','search',query,...(mode==='cold'?['--no-cache']:[])],{cwd:repoRoot,encoding:'utf8'});
      cli.push(performance.now()-start);
      if(processResult.status!==0) throw new Error(processResult.stderr);
      if(JSON.parse(processResult.stdout).results[0]?.sourceId!==row.expectedSource) throw new Error('CLI source mismatch');
    }
    row[mode]={coreMs:stats(core),cliMs:stats(cli)};
  }
  const before=performance.now();
  const baseline=prepareWikiRoute(query);
  row.previousRouterMs=+(performance.now()-before).toFixed(2);
  row.previousRouterBytes=Buffer.byteLength(JSON.stringify(baseline));
  const previousCli=[];
  for(let i=0;i<5;i++) {
    const start=performance.now();
    const output=spawnSync(process.execPath,['packages/database-layer/scripts/agent-wiki-route.mjs','--query',query],{cwd:repoRoot,encoding:'utf8'});
    if(output.status!==0) throw new Error(output.stderr);
    previousCli.push(performance.now()-start);
  }
  row.previousRouterCliMs=stats(previousCli);
  results.push(row);
}
console.log(JSON.stringify({node:process.version,platform:process.platform,arch:process.arch,trialsPerQueryMode:5,
  coldDefinition:'Bypass parsed index; OS file cache is not flushed. CLI timings include Node startup.',
  warmDefinition:'Persisted checked index; source bytes and upstream evidence are fingerprinted on each read.',
  indexMs:+indexMs.toFixed(2),indexed,results},null,2));
