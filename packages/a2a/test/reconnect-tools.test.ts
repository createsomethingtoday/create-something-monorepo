import assert from 'node:assert/strict';
import test from 'node:test';
import {mcpRoute} from '../src/mcp';
import type {RuntimeEnv} from '../src/env';
import {createTestDatabase} from './sqlite';
const owner={subject:'owner',scopes:['a2a:read','offline_access'],connectionId:'family-a',clientId:'client',displayName:'Owner',email:'a@example.com'};
const base={AUTH_RESOURCE:'https://example.com/mcp',BUILD_REVISION:'test'} as RuntimeEnv;
async function rpc(env:RuntimeEnv,p=owner,method='tools/call',params:unknown={}){return await(await mcpRoute(new Request('https://example.com/mcp',{method:'POST',body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})}),env,p)).json() as any;}
test('profile discovery and identity survive grant and display changes in both modes',async()=>{
 for(const mode of ['false','true']){const env={...base,SHARED_INBOXES_ENABLED:mode};const list=await rpc(env,owner,'tools/list');const profiles=list.result.tools.filter((t:any)=>t._meta?.['openai/profile']===true);assert.equal(profiles.length,1);const tool=profiles[0];assert.deepEqual(tool.inputSchema.properties,{});assert.deepEqual(tool.outputSchema.required,['id']);assert.deepEqual(tool._meta.securitySchemes,tool.securitySchemes);assert.equal(tool.annotations.readOnlyHint,true);assert.equal(tool.outputSchema.properties.id.pattern,'\\S');
 for(const p of [owner,{...owner,connectionId:'family-b',displayName:'New',email:'new@example.com'},{...owner,scopes:['a2a:read']}]){const r=await rpc(env,p,'tools/call',{name:tool.name,arguments:{}});assert.equal(r.result.structuredContent.id,'owner');assert.deepEqual(JSON.parse(r.result.content[0].text),r.result.structuredContent);}
 assert.equal((await rpc(env,{...owner,subject:'other'},'tools/call',{name:tool.name})).result.structuredContent.id,'other');assert.equal((await rpc(env,owner,'tools/call',{name:tool.name,arguments:{id:'other'}})).result.isError,true);assert.equal((await rpc(env,{...owner,scopes:[]},'tools/call',{name:tool.name})).result.isError,true);
 }
});
test('status separates selected family from aggregate audit and stable profile',async()=>{
 for(const family of ['family-a','family-b',undefined]){const r=await rpc(base,{...owner,connectionId:family,renewal:{lastCommittedAt:123,lastRecoveredAt:null,recoveryResponsesPrepared:0}} as any,'tools/call',{name:'a2a_connection_status'});const s=r.result.structuredContent;assert.equal(s.profileId,'owner');assert.equal(s.selectedGrant.reference,family??null);assert.equal(s.renewal.identityAuditScope,'owner_client_resource_aggregate');assert.equal(s.renewal.selectedGrantRenewal,'unknown');assert.equal(s.renewal.hostRefresh,'unknown');assert.equal(s.renewal.identityAudit.lastCommittedAt,123);}
});
test('monitoring diagnoses expired, missing, revoked, paused and unavailable without writes or leaks',async()=>{
 const store=createTestDatabase();try{store.sqlite.prepare("INSERT INTO agents(id,name,owner_subject,created_at) VALUES('mine','Mine','owner',1),('foreign','Other','other',1)").run();const env={...base,DB:store.db};
 const call=(id='mine',extra={})=>rpc({...env,...extra},owner,'tools/call',{name:'a2a_monitoring_status',arguments:{agent_id:id}});
 assert.equal((await call('foreign')).result.isError,true);assert.equal((await call()).result.structuredContent.nextAction,'resume_native_host_events');
 store.sqlite.prepare("INSERT INTO subscriptions(id,owner_subject,agent_id,event_name,callback_url,secret_ciphertext,status,created_at,expires_at,verified_at) VALUES('s','owner','mine','event','https://private.example/callback','secret','active',1,2,1)").run();
 for(const mode of ['false','true']){const r=await call('mine',{SHARED_INBOXES_ENABLED:mode});assert.equal(r.result.structuredContent.subscriptions[0].status,'expired');assert.equal(r.result.structuredContent.deliveryCounts.complete,true);assert.equal(r.result.structuredContent.lastCallbackReceipt,null);assert.doesNotMatch(JSON.stringify(r),/private.example|secret/);}
 assert.equal((await rpc(env,{...owner,scopes:[]},'tools/call',{name:'a2a_monitoring_status',arguments:{agent_id:'mine'}})).result.isError,true);
 store.sqlite.prepare('UPDATE subscriptions SET expires_at=?,verified_at=1').run(Date.now()+60000);assert.equal((await call()).result.structuredContent.monitoringActive,true);
 store.sqlite.prepare('UPDATE subscriptions SET verified_at=0').run();assert.equal((await call()).result.structuredContent.monitoringActive,false);
 store.sqlite.prepare("UPDATE subscriptions SET status='revoked',expires_at=?").run(Date.now()+60000);assert.equal((await call()).result.structuredContent.subscriptions[0].status,'revoked');
 store.sqlite.prepare("UPDATE agents SET paused=1 WHERE id='mine'").run();assert.equal((await call()).result.structuredContent.nextAction,'owner_unpause_inbox_then_resume_native_host_events');
 const unavailable=await call('mine',{DB:{prepare(){throw Error('db private');}}});assert.equal(unavailable.result.isError,true);assert.equal(unavailable.result._meta.receipt.outcome,'unknown');assert.doesNotMatch(JSON.stringify(unavailable),/db private/);
 }finally{store.close();}
});
test('bounded monitoring counts stay incomplete and callback receipt never proves pending work processed',async()=>{
 const store=createTestDatabase();try{
 const future=Date.now()+60000;
 store.sqlite.prepare("INSERT INTO agents(id,name,owner_subject,created_at) VALUES('mine','Mine','owner',1),('sender','Sender','sender-owner',1)").run();
 store.sqlite.prepare("INSERT INTO threads(id,agent_a_id,agent_b_id,created_at,expires_at) VALUES('t','sender','mine',1,?)").run(future);
 store.sqlite.prepare("INSERT INTO subscriptions(id,owner_subject,agent_id,event_name,callback_url,secret_ciphertext,status,created_at,expires_at,verified_at) VALUES('live','owner','mine','event','https://private.example','secret','active',1,?,1)").run(future);
 for(let i=0;i<102;i++){
  store.sqlite.prepare("INSERT INTO messages(id,thread_id,sequence,from_agent_id,to_agent_id,text,created_at,expires_at) VALUES(?,'t',?,'sender','mine','private body',1,?)").run('m'+i,i+1,future);
  store.sqlite.prepare("INSERT INTO outbox_events(id,message_id,recipient_agent_id,created_at) VALUES(?,?,'mine',1)").run('e'+i,'m'+i);
  store.sqlite.prepare("INSERT INTO deliveries(id,event_id,subscription_id,state,next_attempt_at,created_at,updated_at,accepted_at) VALUES(?,?,'live',?,1,1,1,?)").run('d'+String(i).padStart(3,'0'),'e'+i,i===101?'accepted':i%2?'suspended':'pending',i===101?123:null);
 }
 for(let i=0;i<101;i++)store.sqlite.prepare("INSERT INTO subscriptions(id,owner_subject,agent_id,event_name,callback_url,secret_ciphertext,status,created_at,expires_at) VALUES(?,'owner','mine','event','https://private.example','secret','revoked',?,?)").run('new'+i,i+2,future);
 const before=store.sqlite.prepare('SELECT total_changes() AS n').get()!.n;
 const r=await rpc({...base,DB:store.db},owner,'tools/call',{name:'a2a_monitoring_status',arguments:{agent_id:'mine'}});const s=r.result.structuredContent;
 assert.equal(s.monitoringActive,true);assert.equal(s.subscriptionsComplete,false);assert.equal(s.deliveryCounts.complete,false);assert.equal(s.deliveryCounts.pending,50);assert.equal(s.deliveryCounts.suspended,50);assert.equal(s.actionableMessages.count,100);assert.equal(s.actionableMessages.complete,false);assert.equal(s.lastCallbackReceipt.acceptedAt,123);assert.match(s.lastCallbackReceipt.meaning,/processing remain unknown/);assert.equal(s.nextAction,'verify_native_host_monitoring_and_reconcile_pending_work');assert.equal(store.sqlite.prepare('SELECT total_changes() AS n').get()!.n,before);assert.doesNotMatch(JSON.stringify(r),/private body|private.example|secret/);
 }finally{store.close();}
});
