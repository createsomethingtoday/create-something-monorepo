// Owned qualification fixture. No customer packages, credentials or arbitrary inputs.
import fs from 'node:fs';
import { spawnSync, spawn } from 'node:child_process';
const read = p => {try{return fs.readFileSync(p,'utf8').trim();}catch{return null;}};
const result={uid:process.getuid(),node:process.versions.node,arch:process.arch,
  limits:{memoryMax:read('/sys/fs/cgroup/memory.max'),pidsMax:read('/sys/fs/cgroup/pids.max'),cpuMax:read('/sys/fs/cgroup/cpu.max'),process:read('/proc/self/limits')},probes:[]};
const scripts=[
 ['owned-canary',"fetch('https://private-validation-preview.createsomething.workers.dev/qualification-canary').then(async r=>{console.log(JSON.stringify({status:r.status,body:await r.text()}));process.exit(0)})"],
 ['public-tcp',"const s=require('net').connect(443,'1.1.1.1');s.on('connect',()=>{console.log('connected');s.destroy()});s.on('error',e=>console.log(e.code))"],
 ['dns',"require('dns').lookup('example.com',(e,v)=>console.log(e?.code??'resolved'))"],
 ['local-management',"fetch('http://127.0.0.1:3000/api/ping').then(async r=>{console.log(JSON.stringify({status:r.status,body:(await r.text()).slice(0,256)}));process.exit(0)}).catch(e=>{console.log(e.cause?.code??e.name);process.exit(0)})"],
 ['local-root-execution',"fetch('http://127.0.0.1:3000/api/execute',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({command:'id -u'})}).then(async r=>{console.log(JSON.stringify({status:r.status,body:(await r.text()).slice(0,1024)}));process.exit(0)}).catch(e=>{console.log(e.cause?.code??e.name);process.exit(0)})"],
];
for(const [name,code]of scripts){const r=spawnSync(process.execPath,['-e',code],{encoding:'utf8',timeout:2500,killSignal:'SIGKILL',maxBuffer:4096});result.probes.push({name,status:r.status,signal:r.signal,result:r.error?.code==='ETIMEDOUT'?'timeout-inconclusive':r.stdout.trim(),error:r.error?.code});}
const namespace=spawnSync('unshare',['--user','--map-root-user','--net','true'],{encoding:'utf8',timeout:1000});
result.unprivilegedNetworkNamespace={status:namespace.status,stderr:namespace.stderr?.slice(0,256)};
try { fs.writeFileSync('/private-write-probe','owned'); result.readOnlyRoot = false; fs.unlinkSync('/private-write-probe'); } catch(e) { result.rootWriteError = e.code; }
try { for(let i=0;i<2;i++)fs.writeFileSync(`/tmp/scratch-${i}`,Buffer.alloc(10*1024*1024)); result.scratchBounded=false; } catch(e) { result.scratchError=e.code; }
finally { for(let i=0;i<2;i++)try{fs.unlinkSync(`/tmp/scratch-${i}`)}catch{} }
const children=[]; const errors=[]; const started=[];
for(let i=0;i<40;i++) { const child=spawn('sleep',['60'],{stdio:'ignore'}); const closed=new Promise(resolve=>child.once('close',resolve)); const ready=new Promise(resolve=>{child.once('spawn',()=>{started.push(i);resolve()});child.once('error',e=>{errors.push(e.code);resolve()})}); children.push({child,closed,ready}); await ready; }
try { await Promise.all(children.map(c=>c.ready)); } finally { for(const c of children)c.child.kill('SIGKILL'); await Promise.all(children.map(c=>c.closed)); }
result.processBound={attempted:40,started:started.length,errors};
try { fs.writeFileSync('/dev/shm/private-write-probe','owned'); result.sharedMemoryWritable=true; fs.unlinkSync('/dev/shm/private-write-probe'); } catch(e) { result.sharedMemoryWriteError=e.code; }
result.securityStatus = read('/proc/self/status')?.split('\n').filter(line=>/^(Cap|NoNewPrivs|Seccomp)/.test(line));
console.log(JSON.stringify(result));
