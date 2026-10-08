import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { mkdtemp, chmod, writeFile, readFile, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
const gateway=new URL('./provider-read-only-gateway.mjs',import.meta.url).pathname;
const ascii=v=>JSON.stringify(v).replace(/[\u0080-\uffff]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0'));
function run(env,args=[],messages=[]){return new Promise(resolve=>{const p=spawn(process.execPath,[gateway,...args],{env:{...process.env,...env},stdio:['pipe','pipe','pipe']});let out='',err='';p.stdout.on('data',v=>out+=v);p.stderr.on('data',v=>err+=v);p.on('close',code=>resolve({code,out,err}));p.stdin.end(messages.map(v=>JSON.stringify(v)+'\n').join(''));});}
test('only the exact synthetic document crosses the read-only gateway; uncertainty is not denial',async()=>{
 const dir=await mkdtemp('/tmp/draw-gateway-test-');await chmod(dir,0o700);
 const doc={id:'canvas-manual-synthetic',objects:[{id:'synthetic-note',text:'Synthetic — 😀'}],title:'Synthetic'};
 const receipt=dir+'/approval.json',socket=dir+'/agent.sock',proof=dir+'/proof.json';
 await writeFile(receipt,JSON.stringify({preflight:{syntheticContentSha256:createHash('sha256').update(ascii(doc)).digest('hex')}}));
 let mode='valid',calls=0;
 const server=createServer(c=>{let data='';c.on('data',chunk=>{data+=chunk;if(!data.includes('\n'))return;calls++;const request=JSON.parse(data);assert.equal(request.method,'inspect');assert.equal(request.token,'synthetic-test-token');c.end(mode==='invalid'?'not-json\n':JSON.stringify(mode==='denied'?{error:'Grant unavailable'}:{result:{revision:3,document:mode==='mismatch'?{...doc,title:'Private mismatch'}:doc}})+'\n');});});
 await new Promise(resolve=>server.listen(socket,resolve));await chmod(socket,0o600);
 const env={DRAW_AGENT_SOCKET:socket,DRAW_AGENT_TOKEN:'synthetic-test-token',DRAW_ACCEPTANCE_RECEIPT:receipt,DRAW_ACCEPTANCE_READ_PROOF:proof};
 try{
  assert.equal((await run(env,['--check'])).code,0);
  doc.viewport={x:30,y:-40,zoom:1};doc.updatedAt='later';
  assert.equal((await run(env,['--check'])).code,0);
  const messages=[{id:1,method:'tools/list'},{id:2,method:'tools/call',params:{name:'draw_native_propose'}},{id:3,method:'tools/call',params:{name:'draw_native_inspect'}}];
  const accepted=await run(env,[],messages);assert.equal(accepted.code,0);
  const responses=accepted.out.trim().split('\n').map(JSON.parse);
  assert.deepEqual(responses[0].result.tools.map(t=>t.name),['draw_native_inspect']);assert.equal(responses[1].result.isError,true);assert.match(responses[2].result.content[0].text,/Synthetic/);
  assert.equal(JSON.parse(await readFile(proof,'utf8')).authenticatedSyntheticRead,true);assert.equal(calls,3);
  mode='mismatch';const mismatch=await run(env,[],[{id:1,method:'tools/call',params:{name:'draw_native_inspect'}}]);assert.doesNotMatch(mismatch.out,/Private mismatch/);assert.match(mismatch.out,/isError/);
  mode='invalid';assert.notEqual((await run(env,['--denied'])).code,0);
  mode='denied';assert.equal((await run(env,['--denied'])).code,0);
 } finally {await new Promise(resolve=>server.close(resolve));await rm(dir,{recursive:true,force:true});}
});
