import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chmod, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

test('persistent companion routes managed login and exact workspace verification without an inference turn', {timeout:15_000}, async()=>{
  const root=await mkdtemp(join(tmpdir(),'gigi-login-stdin-'));
  const binary=join(root,'fixture-server.cjs'),log=join(root,'calls.jsonl');
  await writeFile(binary,`#!${process.execPath}
const fs=require('node:fs');let buffer='',signedIn=false;
const respond=(value)=>process.stdout.write(JSON.stringify(value)+'\\n');
process.stdin.setEncoding('utf8');process.stdin.on('data',chunk=>{buffer+=chunk;for(;;){const n=buffer.indexOf('\\n');if(n<0)break;const request=JSON.parse(buffer.slice(0,n));buffer=buffer.slice(n+1);if(request.id==null)continue;fs.appendFileSync(process.env.GIGI_FIXTURE_LOG,JSON.stringify({method:request.method,params:request.params})+'\\n');let result={};switch(request.method){
case 'config/read':result={config:{mcp_servers:{},model_provider:'openai',forced_login_method:'chatgpt',features:{shell_tool:false,unified_exec:false,browser_use:false,computer_use:false,apps:false}}};break;
case 'account/read':result={account:signedIn?{type:'chatgpt'}:null};break;
case 'account/login/start':signedIn=true;respond({method:'account/login/completed',params:{loginId:'provider-login',success:true,error:null}});result={type:'chatgpt',loginId:'provider-login',authUrl:'https://auth.openai.com/authorize?state=synthetic'};break;
case 'tools/list':result={tools:['gigi_workspace_get','gigi_schema_describe','gigi_records_list','gigi_records_get','gigi_gigs_summary','gigi_history_list','gigi_records_save'].map(name=>({name,inputSchema:{type:'object'}}))};break;
case 'tools/call':result={structuredContent:{id:request.params.arguments.workspaceId,name:'Synthetic tour crew'}};break;
}respond({jsonrpc:'2.0',id:request.id,result});}});
`);
  await chmod(binary,0o755);
  const child=spawn(process.execPath,['--import','tsx','src/codex-main.ts'],{cwd:new URL('..',import.meta.url),env:{...process.env,GIGI_DATA_DIR:root,GIGI_CODEX_BINARY:binary,GIGI_MCP_BINARY:binary,GIGI_SKILL_PATH:join(root,'SKILL.md'),GIGI_FIXTURE_LOG:log},stdio:['pipe','pipe','pipe']});
  let buffer='',stderr='',nextId=0;const pending=new Map<number,(value:any)=>void>();
  child.stderr.setEncoding('utf8');child.stderr.on('data',chunk=>{stderr+=chunk;});
  child.stdout.setEncoding('utf8');child.stdout.on('data',chunk=>{buffer+=chunk;for(;;){const n=buffer.indexOf('\n');if(n<0)break;const value=JSON.parse(buffer.slice(0,n));buffer=buffer.slice(n+1);pending.get(value.id)?.(value);}});
  const call=(operation:string,input:object)=>new Promise<any>((resolve,reject)=>{const id=nextId++;const timer=setTimeout(()=>reject(Error(`Fixture timed out: ${stderr}`)),5000);pending.set(id,value=>{clearTimeout(timer);pending.delete(id);resolve(value);});child.stdin.write(JSON.stringify({id,operation,input})+'\n');});
  try{
    const signedOut=await call('agent.chat.status',{workspaceId:'w'});assert.equal(signedOut.value.authenticated,false);
    assert.doesNotMatch(await readFile(log,'utf8'),/account\/login\/start/);
    const start=await call('agent.chat.login.start',{workspaceId:'w'});assert.equal(start.ok,true);assert.equal(start.value.authUrl,undefined);
    const completed=await call('agent.chat.login.read',{workspaceId:'w',loginId:start.value.loginId});assert.equal(completed.value.state,'completed');assert.equal(completed.value.authenticated,true);
    const checked=await call('agent.chat.status',{workspaceId:'w'});assert.equal(checked.value.workspaceVerified,true);assert.deepEqual(checked.value.workspace,{id:'w',name:'Synthetic tour crew'});
    const operations=(await readFile(log,'utf8')).split('\n').filter(Boolean).map(line=>JSON.parse(line).method);
    assert.equal(operations.filter(op=>op==='account/login/start').length,1);
    assert.equal(operations.some(op=>['thread/start','turn/start','account/logout'].includes(op)),false);
  }finally{child.stdin.end();await new Promise<void>(resolve=>child.once('close',()=>resolve()));await rm(root,{recursive:true,force:true});}
});
