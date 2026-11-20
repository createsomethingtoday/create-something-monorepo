import assert from 'node:assert/strict';
import { test } from 'node:test';
import { InboxService } from '../src/domain';
import { createTestDatabase } from './sqlite';
import { readFileSync } from 'node:fs';

const alice={subject:'alice',scopes:['a2a:read','a2a:write','a2a:admin'],authentication:'owner_session' as const,displayName:'Alice Owner'};
const bob={subject:'bob',scopes:['a2a:read','a2a:write','a2a:admin'],authentication:'owner_session' as const};
async function pair(){
  const storage=createTestDatabase(),service=new InboxService(storage.db);
  const a=await service.registerAgent(alice,'Canon'),b=await service.registerAgent(bob,'Six');
  await service.grantSender(alice,a.id,b.id);await service.grantSender(bob,b.id,a.id);
  return {...storage,service,a,b,input:{fromAgentId:a.id,toAgentId:b.id,text:'Ordinary shared conversation',idempotencyKey:'owner-post'}};
}

test('regression: owner conversation is attributed, non-actionable and separate from eight work turns',async()=>{
  const f=await pair();try{
    const first=await f.service.sendOwnerMessage(alice,f.input);
    assert.equal(first.message.authorKind,'owner');assert.equal(first.message.authorName,'Alice Owner');
    assert.equal(first.message.kind,'conversation');assert.equal(first.message.state,'posted');assert.equal(first.eventId,undefined);
    assert.equal(first.message.fromAgentName,'Canon');assert.equal(first.message.toAgentName,'Six');
    for(let i=0;i<10;i++)await f.service.sendOwnerMessage(alice,{...f.input,threadId:first.message.threadId,idempotencyKey:`chat-${i}`});
    assert.equal(f.sqlite.prepare('SELECT count(*) AS n FROM outbox_events').get()!.n,0);
    assert.deepEqual(await f.service.listMessages(bob,f.b.id),[]);
    await assert.rejects(f.service.claimMessage(bob,first.message.id),{code:'claim_unavailable'});
    for(let i=0;i<8;i++)await f.service.sendMessage(alice,{...f.input,threadId:first.message.threadId,idempotencyKey:`work-${i}`});
    await assert.rejects(f.service.sendMessage(alice,{...f.input,threadId:first.message.threadId,idempotencyKey:'work-over'}),{code:'work_budget_exhausted'});
    const context=await f.service.readThread(bob,f.b.id,first.message.threadId);
    assert.equal(context.messages.length,19);assert.equal(context.messages[18].sequence,19);
    assert.equal(context.participants.find(p=>p.agentId===f.a.id)!.agentName,'Canon');
    assert.equal(f.sqlite.prepare('SELECT count(*) AS n FROM outbox_events').get()!.n,8);
  }finally{f.close();}
});

test('regression: owner authorship needs owner session and idempotency includes origin and intent',async()=>{
  const f=await pair();try{
    await assert.rejects(f.service.sendOwnerMessage({...alice,authentication:'bearer'},f.input),{code:'owner_session_required'});
    const first=await f.service.sendOwnerMessage(alice,f.input);
    const duplicate=await f.service.sendOwnerMessage(alice,f.input);assert.equal(duplicate.message.id,first.message.id);assert.equal(duplicate.duplicate,true);
    await assert.rejects(f.service.sendOwnerMessage(alice,{...f.input,kind:'request'}),{code:'idempotency_conflict'});
    await assert.rejects(f.service.sendMessage(alice,f.input),{code:'idempotency_conflict'});
    const request=await f.service.sendOwnerMessage(bob,{...f.input,fromAgentId:f.b.id,toAgentId:f.a.id,kind:'request',idempotencyKey:'bob-request',threadId:first.message.threadId});
    assert.equal(request.message.authorName,'Owner of Six');assert.equal(request.message.state,'pending');assert.ok(request.eventId);
    assert.equal((await f.service.listMessages(alice,f.a.id))[0].id,request.message.id);
  }finally{f.close();}
});

test('owner chat: concurrent sends, boundary revocation, pause and expiry fail closed',async()=>{
  const f=await pair();try{
    const posts=await Promise.all(Array.from({length:10},()=>f.service.sendOwnerMessage(alice,f.input)));
    assert.equal(new Set(posts.map(p=>p.message.id)).size,1);assert.equal(posts.filter(p=>!p.duplicate).length,1);
    const threadId=posts[0].message.threadId;
    await assert.rejects(f.service.readThread(alice,f.b.id,threadId),{code:'not_found'});
    f.beforeNextBatch(()=>f.sqlite.prepare('UPDATE grants SET revoked_at=? WHERE agent_id=? AND sender_agent_id=?').run(Date.now(),f.b.id,f.a.id));
    await assert.rejects(f.service.sendOwnerMessage(alice,{...f.input,threadId,idempotencyKey:'revoked-at-write'}),{code:'send_not_allowed'});
    assert.equal(f.sqlite.prepare('SELECT count(*) AS n FROM messages').get()!.n,1);
    await assert.rejects(f.service.readThread(bob,f.b.id,threadId),{code:'not_found'});
    await f.service.grantSender(bob,f.b.id,f.a.id);await f.service.setAgentPaused(bob,f.b.id,true);
    await assert.rejects(f.service.readThread(alice,f.a.id,threadId),{code:'not_found'});
    await assert.rejects(f.service.sendOwnerMessage(alice,{...f.input,threadId,idempotencyKey:'paused'}),{code:'send_not_allowed'});
    await f.service.setAgentPaused(bob,f.b.id,false);
    f.sqlite.prepare('UPDATE threads SET expires_at=? WHERE id=?').run(Date.now()-1,threadId);
    await assert.rejects(f.service.readThread(bob,f.b.id,threadId),{code:'not_found'});
  }finally{f.close();}
});

test('owner chat: context pages preserve all turns and monitoring means verified active unexpired subscription',async()=>{
  const f=await pair();try{
    const first=await f.service.sendOwnerMessage(alice,f.input),threadId=first.message.threadId;
    for(let i=1;i<150;i++)await f.service.sendOwnerMessage(i%2?bob:alice,{...f.input,fromAgentId:i%2?f.b.id:f.a.id,toAgentId:i%2?f.a.id:f.b.id,threadId,idempotencyKey:`page-${i}`});
    const one=await f.service.readThread(bob,f.b.id,threadId);assert.equal(one.messages.length,100);assert.equal(one.hasMore,true);assert.equal(one.nextAfter,100);
    const two=await f.service.readThread(bob,f.b.id,threadId,one.nextAfter!);assert.equal(two.messages.length,50);assert.equal(two.hasMore,false);assert.equal(two.messages[0].cursor,101);
    const latest=await f.service.readThreadHistory(bob,f.b.id,threadId);assert.equal(latest.messages.length,100);assert.equal(latest.messages.at(-1)!.cursor,150);assert.equal(latest.nextBefore,51);
    const older=await f.service.readThreadHistory(bob,f.b.id,threadId,latest.nextBefore!);assert.equal(older.messages.length,50);assert.equal(older.hasMore,false);assert.equal(older.messages[0].cursor,1);
    const now=Date.now();
    f.sqlite.prepare(`INSERT INTO subscriptions(id,owner_subject,agent_id,event_name,callback_url,secret_ciphertext,status,created_at,expires_at,verified_at) VALUES(?,?,?,'inbox.message.created','https://fixture.example/callback','fixture','active',?,?,?)`).run('sub-a',alice.subject,f.a.id,now,now-1,now-10);
    f.sqlite.prepare(`INSERT INTO subscriptions(id,owner_subject,agent_id,event_name,callback_url,secret_ciphertext,status,created_at,expires_at,verified_at) VALUES(?,?,?,'inbox.message.created','https://fixture.example/callback','fixture','active',?,?,0)`).run('sub-b',bob.subject,f.b.id,now,now+100000);
    assert.ok((await f.service.readThread(alice,f.a.id,threadId)).participants.every(p=>!p.monitoringActive));
    f.sqlite.prepare('UPDATE subscriptions SET expires_at=? WHERE id=?').run(now+100000,'sub-a');
    const active=await f.service.readThread(alice,f.a.id,threadId);
    assert.equal(active.participants.find(p=>p.agentId===f.a.id)!.monitoringActive,true);
    assert.equal(active.participants.find(p=>p.agentId===f.b.id)!.monitoringActive,false);
    assert.ok(!JSON.stringify(active.participants).includes('fixture.example'));
  }finally{f.close();}
});

test('migration: populated legacy messages retain foreign references, claims, cursors and uncertain authorship',async()=>{
  const f=createTestDatabase({legacy:true});try{
    for(const name of ['0002_delivery_auth.sql','0003_subscription_replay.sql'])f.sqlite.exec(readFileSync(new URL(`../migrations/${name}`,import.meta.url),'utf8'));
    const now=Date.now(),expiry=now+86400000;
    for(const [id,owner,name] of [['a','alice','Canon'],['b','bob','Six']])f.sqlite.prepare('INSERT INTO agents(id,owner_subject,name,created_at) VALUES(?,?,?,?)').run(id,owner,name,now);
    f.sqlite.prepare('INSERT INTO grants(id,agent_id,sender_agent_id,created_at) VALUES(?,?,?,?)').run('g1','b','a',now);f.sqlite.prepare('INSERT INTO grants(id,agent_id,sender_agent_id,created_at) VALUES(?,?,?,?)').run('g2','a','b',now);
    f.sqlite.prepare('INSERT INTO threads(id,agent_a_id,agent_b_id,created_at,expires_at) VALUES(?,?,?,?,?)').run('thread','a','b',now,expiry);
    f.sqlite.prepare(`INSERT INTO messages(cursor,id,thread_id,sequence,from_agent_id,to_agent_id,text,created_at,expires_at,state,claim_token,claimed_until) VALUES(41,'legacy','thread',1,'a','b','Original request',?,?,'claimed','fixture-claim',?)`).run(now,expiry,now+100000);
    const payload=['a','b','Original request',null];const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(payload)))),v=>v.toString(16).padStart(2,'0')).join('');
    f.sqlite.prepare('INSERT INTO idempotency(owner_subject,idempotency_key,body_hash,message_id,created_at) VALUES(?,?,?,?,?)').run('alice','legacy-key',digest,'legacy',now);
    f.sqlite.prepare('INSERT INTO outbox_events(id,message_id,recipient_agent_id,created_at) VALUES(?,?,?,?)').run('event','legacy','b',now);
    f.sqlite.prepare(`INSERT INTO subscriptions(id,owner_subject,agent_id,event_name,callback_url,secret_ciphertext,status,created_at,expires_at,verified_at) VALUES('sub','bob','b','inbox.message.created','https://fixture.example/callback','fixture','active',?,?,?)`).run(now,expiry,now);
    f.sqlite.prepare(`INSERT INTO deliveries(id,event_id,subscription_id,next_attempt_at,created_at,updated_at) VALUES('delivery','event','sub',?,?,?)`).run(now,now,now);
    f.sqlite.exec("UPDATE sqlite_sequence SET seq=1000 WHERE name='messages'; BEGIN IMMEDIATE");
    try{f.sqlite.exec(readFileSync(new URL('../migrations/0004_owner_conversations.sql',import.meta.url),'utf8'));f.sqlite.exec('COMMIT');}catch(e){f.sqlite.exec('ROLLBACK');throw e;}
    assert.deepEqual(f.sqlite.prepare('PRAGMA foreign_key_check').all(),[]);
    assert.equal(f.sqlite.prepare('SELECT message_id FROM outbox_events WHERE id=?').get('event')!.message_id,'legacy');
    assert.equal(f.sqlite.prepare('SELECT event_id FROM deliveries WHERE id=?').get('delivery')!.event_id,'event');
    const service=new InboxService(f.db),read=await service.readMessage(alice,'legacy');
    assert.equal(read.cursor,41);assert.equal(read.authorKind,'legacy');assert.equal(read.authorName,'Legacy sender');assert.equal(read.fromAgentName,'Canon');assert.equal(read.claimToken,undefined);
    const reconciled=await service.sendMessage(alice,{fromAgentId:'a',toAgentId:'b',text:'Original request',idempotencyKey:'legacy-key'});assert.equal(reconciled.duplicate,true);assert.equal(reconciled.message.authorKind,'legacy');
    const next=await service.sendOwnerMessage(alice,{fromAgentId:'a',toAgentId:'b',text:'New human note',threadId:'thread',idempotencyKey:'new-owner'});assert.equal(next.message.cursor,1001);assert.equal(next.message.sequence,2);
    assert.equal((await service.finishMessage(bob,'legacy',{claimToken:'fixture-claim',state:'completed'})).state,'completed');
  }finally{f.close();}
});

test('migration: an empty retained history never reuses a prior arrival cursor',async()=>{
  const f=createTestDatabase({legacy:true});try{
    for(const name of ['0002_delivery_auth.sql','0003_subscription_replay.sql'])f.sqlite.exec(readFileSync(new URL(`../migrations/${name}`,import.meta.url),'utf8'));
    f.sqlite.prepare("INSERT INTO sqlite_sequence(name,seq) VALUES('messages',1000)").run();
    f.sqlite.exec('BEGIN IMMEDIATE');try{f.sqlite.exec(readFileSync(new URL('../migrations/0004_owner_conversations.sql',import.meta.url),'utf8'));f.sqlite.exec('COMMIT');}catch(e){f.sqlite.exec('ROLLBACK');throw e;}
    assert.equal(f.sqlite.prepare("SELECT seq FROM sqlite_sequence WHERE name='messages'").get()!.seq,1000);
    assert.deepEqual(f.sqlite.prepare('PRAGMA foreign_key_check').all(),[]);
  }finally{f.close();}
});
