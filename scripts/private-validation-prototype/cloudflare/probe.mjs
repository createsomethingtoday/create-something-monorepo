// Owned provider probe only. Each network operation runs in a bounded child.
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
const results = { node: process.versions.node, platform: process.platform, arch: process.arch,
  uid: process.getuid(), fresh: !fs.existsSync('/tmp/private-owned-marker'), probes: [] };
fs.writeFileSync('/tmp/private-owned-marker', 'owned-fixture');
const probes = [
  ...[['1.1.1.1',443],['1.1.1.1',53],['169.254.169.254',80],['10.0.0.1',80]].map(([host,port]) => ({kind:'tcp',host,port,
    code:`const s=require('node:net').connect({host:${JSON.stringify(host)},port:${port}});s.on('connect',()=>{s.destroy();console.log('connected')});s.on('error',e=>console.log(e.code));`})),
  {kind:'https',code:"fetch('https://example.com',{redirect:'error'}).then(r=>{console.log('http-'+r.status);process.exit(0)},e=>{console.log(e.cause?.code??e.name);process.exit(0)})"},
  {kind:'dns',code:"require('node:dns').lookup('example.com',(e,v)=>console.log(e?.code??'resolved'))"},
];
for (const {code,...probe} of probes) {
  const child=spawnSync(process.execPath,['-e',code],{encoding:'utf8',timeout:600,killSignal:'SIGKILL',maxBuffer:4096});
  const result=child.error?.code==='ETIMEDOUT'?'timeout-inconclusive':child.status===0?child.stdout.trim():`probe-error:${child.error?.code??child.status}`;
  results.probes.push({...probe,result,childSignal:child.signal,childStatus:child.status});
}
console.log(JSON.stringify(results));
