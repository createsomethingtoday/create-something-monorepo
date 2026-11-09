import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import { Webhook } from 'standardwebhooks';
import app from '../src/app';
import { createTestDatabase } from './sqlite';
import { randomToken } from '../src/crypto';
import { fanoutEvent, recoverDelivery, type DeliveryJob } from '../src/delivery';
import type { RuntimeEnv } from '../src/env';

const origin='https://a2a.createsomething.agency';
const resource=`${origin}/mcp`;
async function fixture(){
  const storage=createTestDatabase();storage.sqlite.exec(readFileSync(new URL('../migrations/0002_delivery_auth.sql',import.meta.url),'utf8'));storage.sqlite.exec(readFileSync(new URL('../migrations/0003_subscription_replay.sql',import.meta.url),'utf8'));
  const {privateKey,publicKey}=await generateKeyPair('ES256');const jwk=await exportJWK(publicKey);jwk.kid='offline-fixture';
  const jobs:DeliveryJob[]=[];const received:Record<string,unknown>[]=[];const envelopes:{body:string;headers:Record<string,string>}[]=[];let callbackStatus=200;let throwQueue=false;
  const secret=`whsec_${Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64')}`;let receiverSecret=secret;
  const env={DB:storage.db,BASE_URL:origin,AUTH_RESOURCE:resource,IDENTITY_ISSUER:'https://id.createsomething.space',ENVIRONMENT:'test',AUTH_CLIENT_ID:'fixture-public-client',ALLOWED_EMAILS:'alice@example.com,bob@example.com',BUILD_REVISION:'offline-test',SESSION_KEY:randomToken(),CALLBACK_SENDER_TOKEN:randomToken(),LOCAL_TEST_JWKS:JSON.stringify({keys:[jwk]}),
    DELIVERIES:{async send(value:DeliveryJob){if(throwQueue)throw new Error('injected enqueue failure');jobs.push(value);}},
    CALLBACK_SENDER:{idFromName:()=>({}),get:()=>({async fetch(request:Request){const input=await request.json() as {url:string;body:string;headers:Record<string,string>};envelopes.push({body:input.body,headers:input.headers});const event=new Webhook(receiverSecret).verify(input.body,input.headers) as Record<string,unknown>;if(event.type==='verification')return Response.json({status:200,body:JSON.stringify({challenge:event.challenge})});received.push(event);return Response.json({status:callbackStatus,body:'{}'});}})},
    ASSETS:{async fetch(){return new Response('<html lang="en"><title>Offline asset fixture</title></html>',{headers:{'content-type':'text/html'}});}}
  } as unknown as RuntimeEnv;
  async function token(subject:string,scopes=['a2a:read','a2a:write','a2a:admin'],overrides:Record<string,unknown>={}){
    return new SignJWT({kind:'oauth_access_token',resource,scope:scopes.join(' '),email:`${subject}@example.com`,email_verified:true,...overrides}).setProtectedHeader({alg:'ES256',kid:'offline-fixture'}).setSubject(subject).setIssuer(env.IDENTITY_ISSUER).setAudience(typeof overrides.aud==='string'?overrides.aud:resource).setIssuedAt().setExpirationTime('5m').sign(privateKey);
  }
  const alice=await token('alice'),bob=await token('bob');
  async function api(path:string,bearer:string,method='GET',body?:unknown){return app.fetch(new Request(`${origin}${path}`,{method,headers:{authorization:`Bearer ${bearer}`,...(body===undefined?{}:{'content-type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})}),env);}
  async function value(path:string,bearer:string,method='GET',body?:unknown){const response=await api(path,bearer,method,body);const data=await response.json() as Record<string,any>;assert.ok(response.ok,JSON.stringify(data));return data;}
  async function rpc(bearer:string,method:string,params:unknown={}){return (await value('/mcp',bearer,'POST',{jsonrpc:'2.0',id:1,method,params}));}
  async function flush(){while(jobs.length){const body=jobs.shift()!;let acked=false;await app.queue({messages:[{body,ack(){acked=true;},retry(){throw new Error('unexpected retry');}}]} as unknown as MessageBatch<DeliveryJob>,env);assert.ok(acked);}}
  return {env,storage,jobs,received,envelopes,secret,alice,bob,token,api,value,rpc,flush,setReceiverSecret(value:string){receiverSecret=value;},setStatus(n:number){callbackStatus=n;},failEnqueue(n:boolean){throwQueue=n;}};
}

test('offline HTTP: exact-resource signed identities, scopes, admission and owner-only grants',async()=>{
  const f=await fixture();try{
    const anonymous=await app.fetch(new Request(`${origin}/api/v1/agents`),f.env);assert.equal(anonymous.status,401);assert.match(anonymous.headers.get('www-authenticate')??'',/oauth-protected-resource/);
    assert.equal((await f.api('/api/v1/agents',await f.token('alice',[],{aud:'https://wrong.example/mcp'}))).status,401);
    assert.equal((await f.api('/api/v1/agents',await f.token('mallory'))).status,403);
    assert.equal((await f.api('/api/v1/agents',await f.token('alice',['a2a:read']),'POST',{name:'Denied'})).status,403);
    const a=(await f.value('/api/v1/agents',f.alice,'POST',{name:'Alice'})).agent;
    const b=(await f.value('/api/v1/agents',f.bob,'POST',{name:'Bob'})).agent;
    assert.equal((await f.api('/api/v1/grants',f.alice,'POST',{agentId:b.id,senderAgentId:a.id})).status,404);
    const metadata=await app.fetch(new Request(`${origin}/.well-known/oauth-protected-resource/mcp`),f.env);assert.equal((await metadata.json() as {resource:string}).resource,resource);
    const mcp=await f.rpc(f.alice,'tools/list');assert.ok(!mcp.result.tools.some((t:{name:string})=>/grant|register|delete/.test(t.name)));
    assert.equal(anonymous.headers.get('x-a2a-revision'),'offline-test');assert.match(anonymous.headers.get('content-security-policy')??'',/frame-ancestors 'none'/);
  }finally{f.storage.close();}
});

test('offline protocol: signed subscription → queued event → recipient claim → reply and completion',async()=>{
  const f=await fixture();try{
    const a=(await f.value('/api/v1/agents',f.alice,'POST',{name:'Alice'})).agent;
    const b=(await f.value('/api/v1/agents',f.bob,'POST',{name:'Bob'})).agent;
    await f.value('/api/v1/grants',f.bob,'POST',{agentId:b.id,senderAgentId:a.id});await f.value('/api/v1/grants',f.alice,'POST',{agentId:a.id,senderAgentId:b.id});
    const init=await f.rpc(f.bob,'initialize');assert.deepEqual(init.result.capabilities.events,{});
    const params={name:'inbox.message.created',arguments:{agent_id:b.id},delivery:{mode:'webhook',url:'https://receiver.example/callback',secret:f.secret}};
    const sub=await f.rpc(f.bob,'events/subscribe',params);assert.ok(sub.result.id);assert.equal(sub.result.cursor,'0');
    const unauthorized=await f.rpc(f.alice,'events/subscribe',params);assert.ok(unauthorized.error);
    const sent=await f.value('/api/v1/messages',f.alice,'POST',{fromAgentId:a.id,toAgentId:b.id,text:'Synthetic proposal request',idempotencyKey:'offline-proposal'});
    await f.flush();assert.equal(f.received.length,1);assert.equal((f.received[0].data as {message_id:string}).message_id,sent.message.id);
    assert.ok(!JSON.stringify(f.received).includes('Synthetic proposal request'));
    const deliveries=await f.value(`/api/v1/deliveries?agentId=${b.id}`,f.bob);assert.equal(deliveries.deliveries[0].state,'accepted');
    assert.equal((await f.value(`/api/v1/messages/${sent.message.id}`,f.bob)).message.state,'pending');
    const claim=await f.value(`/api/v1/messages/${sent.message.id}/claim`,f.bob,'POST');assert.ok(claim.message.claimToken);
    const reply=await f.value('/api/v1/messages',f.bob,'POST',{fromAgentId:b.id,toAgentId:a.id,text:'Synthetic result',threadId:sent.message.threadId,idempotencyKey:'offline-reply'});assert.equal(reply.message.sequence,2);
    await f.value(`/api/v1/messages/${sent.message.id}/finish`,f.bob,'POST',{claimToken:claim.message.claimToken,state:'completed'});
    await f.flush();assert.equal((await f.value(`/api/v1/messages/${sent.message.id}`,f.alice)).message.state,'completed');
    const subscriptions=await f.value(`/api/v1/subscriptions?agentId=${b.id}`,f.bob);assert.ok(!JSON.stringify(subscriptions).includes(f.secret));assert.ok(!JSON.stringify(subscriptions).includes('receiver.example'));
  }finally{f.storage.close();}
});

test('offline recovery: commit-before-enqueue, duplicate fanout, unsubscribe and sender revocation',async()=>{
  const f=await fixture();try{
    const a=(await f.value('/api/v1/agents',f.alice,'POST',{name:'Alice'})).agent;
    const b=(await f.value('/api/v1/agents',f.bob,'POST',{name:'Bob'})).agent;
    const grant=(await f.value('/api/v1/grants',f.bob,'POST',{agentId:b.id,senderAgentId:a.id})).grant;
    const params={name:'inbox.message.created',arguments:{agent_id:b.id},delivery:{mode:'webhook',url:'https://receiver.example/callback',secret:f.secret}};
    const sub=await f.rpc(f.bob,'events/subscribe',params);
    f.failEnqueue(true);const input={fromAgentId:a.id,toAgentId:b.id,text:'Recovery fixture',idempotencyKey:'offline-recovery'};
    const sent=await f.value('/api/v1/messages',f.alice,'POST',input);assert.equal(f.jobs.length,0);
    assert.equal(f.storage.sqlite.prepare('SELECT published_at FROM outbox_events WHERE id=?').get(sent.eventId)!.published_at,null);
    f.failEnqueue(false);await recoverDelivery(f.env);f.jobs.push({eventId:sent.eventId});await f.flush();assert.equal(f.received.length,1);
    assert.equal(f.storage.sqlite.prepare('SELECT count(*) AS n FROM deliveries').get()!.n,1);
    const duplicate=await f.value('/api/v1/messages',f.alice,'POST',input);assert.equal(duplicate.duplicate,true);await f.flush();assert.equal(f.received.length,1);
    await f.rpc(f.bob,'events/unsubscribe',params);
    await f.value('/api/v1/messages',f.alice,'POST',{...input,idempotencyKey:'offline-after-unsubscribe'});await f.flush();assert.equal(f.received.length,1);
    await f.value(`/api/v1/grants/${grant.id}`,f.bob,'DELETE');assert.equal((await f.api('/api/v1/messages',f.alice,'POST',{...input,idempotencyKey:'revoked'})).status,403);
    assert.equal(f.storage.sqlite.prepare('SELECT secret_ciphertext FROM subscriptions WHERE id=?').get(sub.result.id)!.secret_ciphertext,'');
  }finally{f.storage.close();}
});

test('offline delivery: HTTP 410 revokes the subscription and HTTP 413 is terminal',async()=>{
  for(const status of [410,413]){
    const f=await fixture();try{
      const a=(await f.value('/api/v1/agents',f.alice,'POST',{name:'Alice'})).agent,b=(await f.value('/api/v1/agents',f.bob,'POST',{name:'Bob'})).agent;
      await f.value('/api/v1/grants',f.bob,'POST',{agentId:b.id,senderAgentId:a.id});
      await f.rpc(f.bob,'events/subscribe',{name:'inbox.message.created',arguments:{agent_id:b.id},delivery:{mode:'webhook',url:'https://receiver.example/callback',secret:f.secret}});
      f.setStatus(status);await f.value('/api/v1/messages',f.alice,'POST',{fromAgentId:a.id,toAgentId:b.id,text:'Terminal fixture',idempotencyKey:'terminal'});await f.flush();
      const row=f.storage.sqlite.prepare('SELECT state,last_status FROM deliveries').get()!;assert.equal(row.last_status,status);assert.equal(row.state,status===410?'suspended':'failed');
      await recoverDelivery(f.env);await f.flush();assert.equal(f.received.length,1);
    }finally{f.storage.close();}
  }
});

async function subscriptionPair(f:Awaited<ReturnType<typeof fixture>>){
  const a=(await f.value('/api/v1/agents',f.alice,'POST',{name:'Alice'})).agent,b=(await f.value('/api/v1/agents',f.bob,'POST',{name:'Bob'})).agent;
  await f.value('/api/v1/grants',f.bob,'POST',{agentId:b.id,senderAgentId:a.id});
  const params={name:'inbox.message.created',arguments:{agent_id:b.id},delivery:{mode:'webhook',url:'https://receiver.example/callback',secret:f.secret}};
  const sub=await f.rpc(f.bob,'events/subscribe',params);
  assert.ok(sub.result?.id,JSON.stringify(sub));
  const input={fromAgentId:a.id,toAgentId:b.id,text:'Replay regression fixture',idempotencyKey:'replay-1'};
  return {a,b,params,sub:sub.result,input};
}
test('regression: callback cursor cannot skip an earlier outbox event before fanout',async()=>{
  const f=await fixture();try{
    const p=await subscriptionPair(f);
    await f.value('/api/v1/messages',f.alice,'POST',p.input);
    await f.value('/api/v1/messages',f.alice,'POST',{...p.input,idempotencyKey:'replay-2'});
    const delayed=f.jobs.shift()!;
    await f.flush();assert.equal(f.received.length,1);assert.equal(f.received[0].cursor,'0');
    f.jobs.push(delayed);await f.flush();assert.equal(f.received.length,2);
    const refreshed=await f.rpc(f.bob,'events/subscribe',{...p.params,cursor:'0'});
    assert.equal(refreshed.result.cursor,'2');
  }finally{f.storage.close();}
});
test('regression: expired subscription refresh resumes its suspended replay history',async()=>{
  const f=await fixture();try{
    const p=await subscriptionPair(f);const sent=await f.value('/api/v1/messages',f.alice,'POST',p.input);
    f.jobs.splice(0);await fanoutEvent(f.env,sent.eventId);
    f.storage.sqlite.prepare('UPDATE subscriptions SET expires_at=?').run(Date.now()-1);
    await f.flush();assert.equal(f.storage.sqlite.prepare('SELECT state FROM deliveries').get()!.state,'suspended');
    const resumed=await f.rpc(f.bob,'events/subscribe',{...p.params,cursor:'0'});assert.ok(resumed.result);
    await f.flush();assert.equal(f.received.length,1);
  }finally{f.storage.close();}
});
test('regression: replay maxAgeMs skips older history and discloses truncation',async()=>{
  const f=await fixture();try{
    const p=await subscriptionPair(f);const sent=await f.value('/api/v1/messages',f.alice,'POST',p.input);f.jobs.splice(0);
    f.storage.sqlite.prepare('UPDATE messages SET created_at=? WHERE id=?').run(Date.now()-3600000,sent.message.id);
    f.storage.sqlite.prepare('UPDATE outbox_events SET created_at=? WHERE id=?').run(Date.now()-3600000,sent.eventId);
    await f.rpc(f.bob,'events/unsubscribe',p.params);
    const resumed=await f.rpc(f.bob,'events/subscribe',{...p.params,cursor:'0',maxAgeMs:1});
    assert.equal(resumed.result.truncated,true);await f.flush();assert.equal(f.received.length,0);
  }finally{f.storage.close();}
});
test('regression: callback verification is cached and key rotation signs with both keys',async()=>{
  const f=await fixture();try{
    const p=await subscriptionPair(f);const challenges=f.envelopes.length;
    const replacement='whsec_'+Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64');
    const refreshed=await f.rpc(f.bob,'events/subscribe',{...p.params,cursor:'0',delivery:{...p.params.delivery,secret:replacement}});
    assert.ok(refreshed.result,JSON.stringify(refreshed));assert.equal(f.envelopes.length,challenges);
    await f.value('/api/v1/messages',f.alice,'POST',p.input);await f.flush();
    const sent=f.envelopes.at(-1)!;assert.ok(new Webhook(f.secret).verify(sent.body,sent.headers));assert.ok(new Webhook(replacement).verify(sent.body,sent.headers));
  }finally{f.storage.close();}
});
test('regression: owner conversation history includes sent messages without changing inbox semantics',async()=>{
  const f=await fixture();try{
    const p=await subscriptionPair(f);const sent=await f.value('/api/v1/messages',f.alice,'POST',p.input);
    assert.equal((await f.value('/api/v1/messages?agentId='+p.a.id,f.alice)).messages.length,0);
    assert.equal((await f.value('/api/v1/messages?agentId='+p.a.id+'&includeSent=true',f.alice)).messages[0].id,sent.message.id);
  }finally{f.storage.close();}
});
test('regression: MCP cookie requests reject an untrusted browser origin before processing',async()=>{
  const f=await fixture();try{
    const response=await app.fetch(new Request(origin+'/mcp',{method:'POST',headers:{cookie:'__Host-a2a_session=fixture','origin':'https://untrusted.example','content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'events/subscribe'})}),f.env);
    assert.equal(response.status,403);
  }finally{f.storage.close();}
});

test('regression: narrowed replay window stops already-queued stale delivery',async()=>{
  const f=await fixture();try{
    const p=await subscriptionPair(f);const sent=await f.value('/api/v1/messages',f.alice,'POST',p.input);
    const outbox=f.jobs.shift()!;await app.queue({messages:[{body:outbox,ack(){},retry(){throw new Error('unexpected retry');}}]} as unknown as MessageBatch<DeliveryJob>,f.env);
    f.storage.sqlite.prepare('UPDATE messages SET created_at=? WHERE id=?').run(Date.now()-3600000,sent.message.id);
    f.storage.sqlite.prepare('UPDATE outbox_events SET created_at=? WHERE id=?').run(Date.now()-3600000,sent.eventId);
    const refreshed=await f.rpc(f.bob,'events/subscribe',{...p.params,cursor:'0',maxAgeMs:1});assert.equal(refreshed.result.truncated,true);
    await f.flush();assert.equal(f.received.length,0);assert.equal(f.storage.sqlite.prepare('SELECT state FROM deliveries').get()!.state,'expired');
  }finally{f.storage.close();}
});

test('offline recovery: replay beyond one recovery batch drains without advancing past missing deliveries',async()=>{
  const f=await fixture();try{
    const p=await subscriptionPair(f);const now=Date.now();
    // Simulate a restart after publication but before fanout for more than one repair batch.
    for(let i=0;i<101;i++){
      const thread='restart-thread-'+i,message='restart-message-'+i;
      f.storage.sqlite.prepare('INSERT INTO threads(id,agent_a_id,agent_b_id,created_at,expires_at) VALUES(?,?,?,?,?)').run(thread,p.a.id,p.b.id,now,now+86400000);
      f.storage.sqlite.prepare('INSERT INTO messages(id,thread_id,sequence,from_agent_id,to_agent_id,text,created_at,expires_at) VALUES(?,?,1,?,?,?,?,?)').run(message,thread,p.a.id,p.b.id,'Synthetic restarted event',now,now+86400000);
      f.storage.sqlite.prepare('INSERT INTO outbox_events(id,message_id,recipient_agent_id,created_at,published_at) VALUES(?,?,?,?,?)').run('restart-event-'+i,message,p.b.id,now,now);
    }
    await recoverDelivery(f.env);await f.flush();assert.equal(f.received.length,100,JSON.stringify({jobs:f.jobs.length,states:f.storage.sqlite.prepare('SELECT state,last_error,count(*) AS n FROM deliveries GROUP BY state,last_error').all(),sub:f.storage.sqlite.prepare('SELECT status,cursor,replay_floor_at,expires_at FROM subscriptions').get()}));
    assert.equal(f.storage.sqlite.prepare('SELECT cursor FROM subscriptions').get()!.cursor,100);
    await recoverDelivery(f.env);await f.flush();assert.equal(f.received.length,101);
    assert.equal(f.storage.sqlite.prepare('SELECT cursor FROM subscriptions').get()!.cursor,101);
  }finally{f.storage.close();}
});
test('offline signing lifecycle: verification cache expires and prior signing keys are erased on unsubscribe',async()=>{
  const f=await fixture();try{
    const p=await subscriptionPair(f),initialChallenges=f.envelopes.length;
    await f.rpc(f.bob,'events/subscribe',p.params);assert.equal(f.envelopes.length,initialChallenges);
    f.storage.sqlite.prepare('UPDATE subscriptions SET verified_at=?').run(Date.now()-3600000);
    await f.rpc(f.bob,'events/subscribe',p.params);assert.equal(f.envelopes.length,initialChallenges+1);
    const replacement='whsec_'+Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64');
    await f.rpc(f.bob,'events/subscribe',{...p.params,delivery:{...p.params.delivery,secret:replacement}});
    assert.ok(f.storage.sqlite.prepare('SELECT previous_secret_ciphertext FROM subscriptions').get()!.previous_secret_ciphertext);
    await f.rpc(f.bob,'events/unsubscribe',p.params);
    const row=f.storage.sqlite.prepare('SELECT secret_ciphertext,previous_secret_ciphertext,previous_secret_until FROM subscriptions').get()!;
    assert.equal(row.secret_ciphertext,'');assert.equal(row.previous_secret_ciphertext,null);assert.equal(row.previous_secret_until,null);
  }finally{f.storage.close();}
});
