import assert from 'node:assert/strict';
import {test} from 'node:test';
import {exportJWK,generateKeyPair,SignJWT} from 'jose';
import app from '../src/app';
import {createTestDatabase} from './sqlite';
import {hash,randomToken,seal} from '../src/crypto';
import type {RuntimeEnv} from '../src/env';
const origin='https://a2a.createsomething.agency',resource=origin+'/mcp';
async function fixture(){
 const storage=createTestDatabase(),{privateKey,publicKey}=await generateKeyPair('ES256'),jwk=await exportJWK(publicKey);jwk.kid='context-http';const jobs:unknown[]=[];
 const env={DB:storage.db,ENVIRONMENT:'test',BASE_URL:origin,AUTH_RESOURCE:resource,IDENTITY_ISSUER:'https://id.createsomething.space',AUTH_CLIENT_ID:'synthetic-owner',ALLOWED_EMAILS:'alice@example.test,bob@example.test,eve@example.test',SESSION_KEY:randomToken(),LOCAL_TEST_JWKS:JSON.stringify({keys:[jwk]}),BUILD_REVISION:'context-http-fixture',DELIVERIES:{async send(job:unknown){jobs.push(job);}}} as unknown as RuntimeEnv;
 async function token(who:string,scopes=['a2a:read','a2a:write','a2a:admin']){return new SignJWT({kind:'oauth_access_token',resource,scope:scopes.join(' '),email:who+'@example.test',email_verified:true,name:who==='alice'?'Alice':'Bob'}).setProtectedHeader({alg:'ES256',kid:jwk.kid}).setSubject(who).setIssuer(env.IDENTITY_ISSUER).setAudience(resource).setIssuedAt().setExpirationTime('5m').sign(privateKey);}
 async function api(who:string,path:string,method='GET',body?:unknown,options:{cookie?:boolean;origin?:string;scopes?:string[];rawBody?:ArrayBuffer}={}){
  const bearer=await token(who,options.scopes);const headers:Record<string,string>={};
  if(options.cookie){const raw=randomToken(),id=await hash(raw),now=Date.now(),cipher=await seal(env.SESSION_KEY,JSON.stringify({access_token:bearer,expires_in:300}),`session:${id}`);await storage.db.prepare('INSERT INTO auth_sessions(id_hash,owner_subject,token_ciphertext,access_expires_at,expires_at,created_at) VALUES(?,?,?,?,?,?)').bind(id,who,cipher,now+300000,now+86400000,now).run();headers.cookie='__Host-a2a_session='+raw;if(options.origin!=='omit')headers.origin=options.origin??origin;}else headers.authorization='Bearer '+bearer;
  if(body!==undefined)headers['content-type']='application/json';return app.fetch(new Request(origin+path,{method,headers,...(body===undefined?{}:{body:options.rawBody??JSON.stringify(body)})}),env);
 }
 async function data(who:string,path:string,method='GET',body?:unknown,options:Parameters<typeof api>[4]={}){const r=await api(who,path,method,body,options),b=await r.json() as any;assert.ok(r.ok,JSON.stringify(b));return b;}
 async function rpc(who:string,method:string,params?:unknown){return data(who,'/mcp','POST',{jsonrpc:'2.0',id:1,method,...(params===undefined?{}:{params})});}
 const a=(await data('alice','/api/v1/agents','POST',{name:'Canon'})).agent,b=(await data('bob','/api/v1/agents','POST',{name:'Six'})).agent;
 const grant=(await data('bob','/api/v1/grants','POST',{agentId:b.id,senderAgentId:a.id})).grant;await data('alice','/api/v1/grants','POST',{agentId:a.id,senderAgentId:b.id});
 const sent=await data('alice','/api/v1/owner-messages','POST',{fromAgentId:a.id,toAgentId:b.id,text:'Context sharing thread',idempotencyKey:'ctx-http-thread'},{cookie:true});
 const input={agentId:a.id,threadId:sent.message.threadId,title:'Project context',summary:'Only the shared project source',mimeType:'text/markdown',content:'\uFEFF# Brief\r\n'+'source text🙂\n'.repeat(3000),idempotencyKey:'ctx-http-share'};
 return{storage,env,jobs,a,b,grant,input,api,data,rpc};
}

test('context HTTP: owner-cookie sharing keeps full UTF-8 payload off messages/events and enforces write boundaries',async()=>{
 const f=await fixture();try{
 assert.equal((await f.api('alice','/api/v1/context','POST',f.input)).status,403);
 assert.equal((await f.api('alice','/api/v1/context','POST',f.input,{cookie:true,origin:'https://evil.example'})).status,403);
 assert.equal((await f.api('alice','/api/v1/context','POST',f.input,{cookie:true,origin:'omit'})).status,403);
 assert.equal((await f.api('alice','/api/v1/context','POST',f.input,{cookie:true,scopes:['a2a:read','a2a:write']})).status,403);
 assert.equal((await f.api('alice','/api/v1/context','POST',{...f.input,ownerSubject:'bob'},{cookie:true})).status,400);
 assert.equal((await f.api('alice','/api/v1/context','POST',{...f.input,mimeType:'text/html'},{cookie:true})).status,400);
 const posted=await f.api('alice','/api/v1/context','POST',f.input,{cookie:true});assert.equal(posted.status,201);const shared=await posted.json() as any;assert.equal(shared.resource.ownerLabel,'Alice');assert.ok(!('content' in shared.resource));assert.equal(shared.resource.byteLength,new TextEncoder().encode(f.input.content).length);assert.equal(f.jobs.length,0);
 const repeated=await f.api('alice','/api/v1/context','POST',f.input,{cookie:true});assert.equal(repeated.status,200);assert.equal((await repeated.json() as any).resource.id,shared.resource.id);
 assert.equal((await f.api('alice','/api/v1/context','POST',{...f.input,content:'Different source'},{cookie:true})).status,409);
 const listed=await f.data('bob','/api/v1/context?threadId='+f.input.threadId);assert.equal(listed.resources.length,1);assert.equal(listed.resources[0].canRevoke,false);
 let text='',n:number|null=0;while(n!==null){const page=await f.data('bob','/api/v1/context/'+shared.resource.id+'?chunk='+n);assert.ok(new TextEncoder().encode(page.content).length<=16384);text+=page.content;n=page.nextChunk;}assert.equal(text,f.input.content);
 assert.equal((await f.data('bob','/api/v1/messages?agentId='+f.b.id)).messages.length,0);
 }finally{f.storage.close();}
});
test('context MCP: standards manifests, bounded sections, tools and strict URI/cursor errors',async()=>{
 const f=await fixture();try{
 const shared=await f.data('alice','/api/v1/context','POST',f.input,{cookie:true}),r=shared.resource;
 const initialized=await f.rpc('bob','initialize');assert.deepEqual(initialized.result.capabilities.resources,{});assert.ok(!initialized.result.capabilities.resources.subscribe);
 const list=await f.rpc('bob','resources/list');assert.equal(list.result.resources[0].uri,r.uri);assert.equal(list.result.resources[0].mimeType,'application/json');assert.equal(list.result.nextCursor,undefined);assert.equal(list.result.resources[0].size,undefined);
 const manifest=await f.rpc('bob','resources/read',{uri:r.uri});const meta=JSON.parse(manifest.result.contents[0].text);assert.equal(manifest.result.contents[0].mimeType,'application/json');assert.equal(meta.sha256,r.sha256);assert.equal(meta.untrusted,true);assert.ok(!('content' in meta));
 const section=await f.rpc('bob','resources/read',{uri:r.uri+'/chunks/0'});assert.equal(section.result.contents[0].mimeType,'text/markdown');assert.ok(new TextEncoder().encode(section.result.contents[0].text).length<=16384);assert.ok(section.result.contents[0].text.startsWith('\uFEFF'));
 const tool=await f.rpc('bob','tools/call',{name:'a2a_read_context',arguments:{resource_id:r.id,chunk_index:1}});assert.ok(tool.result.structuredContent.content);assert.equal(tool.result.structuredContent.chunkIndex,1);
 const search=await f.rpc('bob','tools/call',{name:'a2a_search_context',arguments:{resource_id:r.id,query:'source text'}});assert.equal(search.result.structuredContent.matches.length,10);assert.equal(search.result.structuredContent.truncated,true);
 const templates=await f.rpc('bob','resources/templates/list');assert.equal(templates.result.resourceTemplates.length,2);
 for(const cursor of ['','-1','01','1e2','9999999999999999'])assert.equal((await f.rpc('bob','resources/list',{cursor})).error.code,-32602);
 for(const uri of ['https://evil.example/secret',r.uri+'?url=x',r.uri+'/../0',r.uri+'/chunks/-1'])assert.equal((await f.rpc('bob','resources/read',{uri})).error.code,-32602);
 assert.equal((await f.rpc('bob','resources/read',{uri:r.uri.replace(f.input.threadId,'wrong-thread')})).error.code,-32002);
 assert.equal((await f.rpc('eve','resources/read',{uri:r.uri})).error.code,-32002);assert.deepEqual((await f.rpc('eve','resources/list')).result.resources,[]);
 assert.equal((await f.rpc('bob','resources/read',{uri:r.uri,unexpected:true})).error.code,-32602);
 assert.equal((await f.rpc('bob','resources/list',[])).error.code,-32602);
 }finally{f.storage.close();}
});
test('context HTTP: owner revocation works after grant removal, prevents fresh metadata/content reads and cannot be spoofed',async()=>{
 const f=await fixture();try{
 const r=(await f.data('alice','/api/v1/context','POST',f.input,{cookie:true})).resource;
 assert.equal((await f.api('alice','/api/v1/context/'+r.id,'DELETE')).status,403);
 assert.equal((await f.api('bob','/api/v1/context/'+r.id,'DELETE',undefined,{cookie:true})).status,404);
 await f.data('bob','/api/v1/grants/'+f.grant.id,'DELETE');
 assert.equal((await f.api('bob','/api/v1/context/'+r.id)).status,404);
 assert.deepEqual(await f.data('alice','/api/v1/context/'+r.id,'DELETE',undefined,{cookie:true}),{revoked:true});
 await f.data('bob','/api/v1/grants','POST',{agentId:f.b.id,senderAgentId:f.a.id});
 assert.equal((await f.api('bob','/api/v1/context/'+r.id)).status,404);assert.equal((await f.rpc('bob','resources/read',{uri:r.uri})).error.code,-32002);assert.equal(f.storage.sqlite.prepare('SELECT COUNT(*) AS n FROM context_chunks').get()!.n,0);assert.equal(f.storage.sqlite.prepare('SELECT summary FROM context_resources').get()!.summary,'');
 }finally{f.storage.close();}
});
test('context HTTP: deleting a participating inbox redacts all shared documents in its threads atomically',async()=>{
 const f=await fixture();try{
 const r=(await f.data('alice','/api/v1/context','POST',f.input,{cookie:true})).resource;
 await f.data('bob','/api/v1/agents/'+f.b.id,'DELETE');assert.equal((await f.api('alice','/api/v1/context/'+r.id)).status,404);assert.equal(f.storage.sqlite.prepare('SELECT COUNT(*) AS n FROM context_chunks').get()!.n,0);assert.equal(f.storage.sqlite.prepare('SELECT summary FROM context_resources').get()!.summary,'');
 }finally{f.storage.close();}
});
test('context MCP: opaque cursor continuation returns25+7 manifests and ends without nextCursor',async()=>{
 const f=await fixture();try{
 const second=await f.data('alice','/api/v1/owner-messages','POST',{fromAgentId:f.a.id,toAgentId:f.b.id,text:'Another context thread',idempotencyKey:'second-context-thread'},{cookie:true});
 for(let n=0;n<32;n++)await f.data(n%2?'bob':'alice','/api/v1/context','POST',{...f.input,content:'Source '+n,threadId:n<16?f.input.threadId:second.message.threadId,agentId:n%2?f.b.id:f.a.id,idempotencyKey:'resource-page-'+n},{cookie:true});
 const first=(await f.rpc('alice','resources/list')).result;assert.equal(first.resources.length,25);assert.equal(typeof first.nextCursor,'string');
 const secondPage=(await f.rpc('alice','resources/list',{cursor:first.nextCursor})).result;assert.equal(secondPage.resources.length,7);assert.equal(secondPage.nextCursor,undefined);assert.equal(new Set([...first.resources,...secondPage.resources].map((r:any)=>r.uri)).size,32);
 }finally{f.storage.close();}
});
test('context HTTP: malformed transport UTF-8 and escaped lone surrogates are rejected without replacement',async()=>{
 const f=await fixture();try{
 const body=JSON.stringify({...f.input,content:'valid-marker'}),raw=new TextEncoder().encode(body);raw[body.indexOf('valid-marker')]=255;
 assert.equal((await f.api('alice','/api/v1/context','POST',f.input,{cookie:true,rawBody:raw.buffer as ArrayBuffer})).status,400);
 assert.equal((await f.api('alice','/api/v1/context','POST',{...f.input,content:'bad\ud800'},{cookie:true})).status,400);
 assert.equal(f.storage.sqlite.prepare('SELECT COUNT(*) AS n FROM context_resources').get()!.n,0);
 }finally{f.storage.close();}
});
test('context HTTP management: owner session can find only own unrevoked metadata after access loss',async()=>{
 const f=await fixture();try{
 const a=(await f.data('alice','/api/v1/context','POST',f.input,{cookie:true})).resource;
 const b=(await f.data('bob','/api/v1/context','POST',{...f.input,agentId:f.b.id,idempotencyKey:'bob-management'},{cookie:true})).resource;
 assert.equal((await f.api('alice','/api/v1/owned-context')).status,403,'Bearer is not an owner-management session.');
 assert.equal((await f.api('alice','/api/v1/owned-context','GET',undefined,{cookie:true,scopes:['a2a:read','a2a:write']})).status,403);
 assert.equal((await f.api('alice','/api/v1/owned-context','GET',undefined,{cookie:true,origin:'https://evil.example'})).status,403);
 assert.equal((await app.fetch(new Request(origin+'/api/v1/owned-context'),f.env)).status,401);
 await f.data('bob','/api/v1/grants/'+f.grant.id,'DELETE');await f.data('alice','/api/v1/agents/'+f.a.id,'PATCH',{paused:true});
 f.storage.sqlite.prepare('UPDATE threads SET expires_at=? WHERE id=?').run(Date.now()-1,f.input.threadId);f.storage.sqlite.prepare('UPDATE context_resources SET expires_at=?').run(Date.now()-1);
 assert.equal((await f.api('alice','/api/v1/context/'+a.id)).status,404);
 const managed=await f.data('alice','/api/v1/owned-context','GET',undefined,{cookie:true,origin:'omit'});assert.deepEqual(managed.resources.map((r:any)=>r.id),[a.id]);assert.equal(managed.resources[0].canRevoke,true);assert.ok(!JSON.stringify(managed).includes('source text'));assert.ok(!JSON.stringify(managed).includes('owner_subject'));assert.ok(!JSON.stringify(managed).includes(b.id));
 assert.deepEqual((await f.data('bob','/api/v1/owned-context','GET',undefined,{cookie:true})).resources.map((r:any)=>r.id),[b.id]);
 assert.equal((await f.api('alice','/api/v1/owned-context?after=-1','GET',undefined,{cookie:true})).status,400);assert.equal((await f.api('alice','/api/v1/owned-context?ownerSubject=bob','GET',undefined,{cookie:true})).status,400);
 await f.data('alice','/api/v1/context/'+a.id,'DELETE',undefined,{cookie:true});assert.equal((await f.data('alice','/api/v1/owned-context','GET',undefined,{cookie:true})).resources.length,0);
 }finally{f.storage.close();}
});
