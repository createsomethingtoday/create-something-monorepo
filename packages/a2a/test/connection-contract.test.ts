import assert from 'node:assert/strict';
import test from 'node:test';
import app from '../src/app';
import { mcpRoute } from '../src/mcp';
import type { RuntimeEnv } from '../src/env';
const env={BUILD_REVISION:'regression',AUTH_RESOURCE:'https://a2a.createsomething.agency/mcp',IDENTITY_ISSUER:'https://id.createsomething.space',BASE_URL:'https://a2a.createsomething.agency'} as RuntimeEnv;
test('anonymous diagnostics disclose transport contract, never principal or renewal state',async()=>{
 const response=await app.fetch(new Request(env.BASE_URL+'/.well-known/a2a-connection'),env);
 assert.equal(response.status,200);const body:any=await response.json();assert.equal(body.connectionId,'a2a-inbox');assert.equal(body.binding.observed,'unknown');assert.equal(body.principal,undefined);assert.equal(body.renewal,undefined);
});
test('MCP status is read-only, scope-gated and has additive server receipt',async()=>{
 const call=(scopes:string[])=>mcpRoute(new Request(env.BASE_URL+'/mcp',{method:'POST',body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'a2a_connection_status',arguments:{}}})}),env,{subject:'owner',scopes,admin:false});
 const body:any=await(await call(['a2a:read'])).json();assert.equal(body.result.structuredContent.principal.subject,'owner');assert.equal(body.result._meta.receipt.outcome,'confirmed');assert.equal(body.result.structuredContent.binding.observed,'unknown');assert.equal(body.result.structuredContent.renewal.hostRefresh,'unknown');
 const denied:any=await(await call([])).json();assert.equal(denied.result.isError,true);assert.equal(denied.result._meta.receipt.outcome,'denied');
});

test('bounded recovery respects consent, forbidden, unknown writes and Retry-After',async()=>{
 const {recoveryAction}=await import('../src/connection');
 assert.equal(recoveryAction({status:401}).action,'owner_action_required');assert.equal(recoveryAction({status:403}).action,'stop');
 assert.equal(recoveryAction({status:503,write:true,uncertain:true}).action,'reconcile');
 assert.deepEqual(recoveryAction({status:429,retryAfter:'30'}),{action:'retry_after',delayMs:30000,maxAttempts:3});
 assert.equal(recoveryAction({status:503,attempt:3}).action,'stop');assert.equal(recoveryAction({status:429,retryAfter:'120'}).action,'stop');
});

test('descriptors never widen status privileges; receipt IDs are generated per invocation',async()=>{
 const principal={subject:'owner',scopes:['a2a:read'],admin:false};
 const rpc=async(method:string,params:unknown={})=>(await(await mcpRoute(new Request(env.BASE_URL+'/mcp',{method:'POST',body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})}),env,principal)).json()) as any;
 const list=await rpc('tools/list');const descriptor=list.result.tools.find((t:any)=>t.name==='a2a_connection_status');
 assert.equal(descriptor.annotations.readOnlyHint,true);assert.deepEqual(descriptor.securitySchemes,[{type:'oauth2',scopes:['a2a:read','offline_access']}]);assert.deepEqual(descriptor._meta.securitySchemes,descriptor.securitySchemes);assert.ok(!list.result.tools.some((t:any)=>t.name==='a2a_send_message'));
 const a=await rpc('tools/call',{name:'a2a_connection_status'}),b=await rpc('tools/call',{name:'a2a_connection_status'});assert.notEqual(a.result._meta.receipt.requestId,b.result._meta.receipt.requestId);
});


test('HTTP recovery advice honors the returned Retry-After',async()=>{
 const response=await app.fetch(new Request(env.BASE_URL+'/'),{...env,ASSETS:{fetch(){throw new Error('synthetic unavailable');}}} as unknown as RuntimeEnv);
 assert.equal(response.status,503);const body:any=await response.json();
 assert.equal(body.recovery.delayMs,Number(response.headers.get('retry-after'))*1000);
});


test('tool consent metadata requests renewable grants without widening read tools',async()=>{
 const p={subject:'owner',scopes:['a2a:read','a2a:write'],admin:false};
 for(const shared of [false,true]){
  const response=await mcpRoute(new Request(env.BASE_URL+'/mcp',{method:'POST',body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/list'})}),{...env,SHARED_INBOXES_ENABLED:shared?'true':'false'},p);
  const body:any=await response.json();
  for(const t of body.result.tools){
   assert.deepEqual(t.securitySchemes,[{type:'oauth2',scopes:t.annotations.readOnlyHint?['a2a:read','offline_access']:['a2a:read','a2a:write','offline_access']}]);
   assert.deepEqual(t._meta.securitySchemes,t.securitySchemes);
  }
 }
});

test('authenticated status separates signed renewable consent from unknown host persistence',async()=>{
 const {connectionStatus}=await import('../src/connection');
 for(const renewable of [false,true]){
  const p={subject:'owner',scopes:['a2a:read',...(renewable?['offline_access']:[])],admin:false,clientId:'verified-client',accessExpiresAt:1234567890000};
  const status=connectionStatus(env,p);
  assert.ok('renewal' in status&&'principal' in status);
  assert.equal(status.renewal?.renewableGrant,renewable);
  assert.equal(status.renewal?.hostRefresh,'unknown');assert.equal(status.binding.observed,'unknown');
  assert.equal(status.principal?.clientId,'verified-client');assert.equal(status.principal?.accessExpiresAt,1234567890000);
  assert.equal(status.nextAction,renewable?'none':'refresh_host_metadata_and_reconsent');
  if(!renewable)assert.match(status.renewal?.warning??'',/offline_access/);
 }
});
