import assert from 'node:assert/strict';
import {test} from 'node:test';
import {InboxService} from '../src/domain';
import {createTestDatabase} from './sqlite';
import type {Principal} from '../src/domain-types';
const alice:Principal={subject:'context-alice',authentication:'owner_session',displayName:'Alice',scopes:['a2a:read','a2a:write','a2a:admin']};
const bob:Principal={subject:'context-bob',authentication:'owner_session',displayName:'Bob',scopes:['a2a:read','a2a:write','a2a:admin']};
async function pair(){const f=createTestDatabase(),inbox=new InboxService(f.db);const a=await inbox.registerAgent(alice,'Canon'),b=await inbox.registerAgent(bob,'Six');const grant=await inbox.grantSender(bob,b.id,a.id);await inbox.grantSender(alice,a.id,b.id);const message=await inbox.sendOwnerMessage(alice,{fromAgentId:a.id,toAgentId:b.id,text:'Shared context thread',idempotencyKey:'context-thread'});return{...f,inbox,a,b,grant,threadId:message.message.threadId};}
test('context: an owner shares large Unicode text without creating work and a peer reconstructs bounded chunks',async()=>{
 const f=await pair();try{const {ContextService}=await import('../src/context');const service=new ContextService(f.db),content='A🙂漢字\n'.repeat(8000);const input={agentId:f.a.id,threadId:f.threadId,title:'Project brief',summary:'A shared project brief',mimeType:'text/markdown' as const,content,idempotencyKey:'context-large'};const shared=await service.share(alice,input);let result='',index:number|null=0;while(index!==null){const page=await service.read(bob,shared.resource.id,index);assert.ok(new TextEncoder().encode(page.content).length<=16384);result+=page.content;index=page.nextChunk;}assert.equal(result,content);assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM outbox_events').get()!.n,0);assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM messages').get()!.n,1);assert.equal((await service.share(alice,input)).duplicate,true);assert.equal((await service.list(bob,f.threadId)).resources[0].title,'Project brief');}finally{f.close();}
});

const input=(f:Awaited<ReturnType<typeof pair>>,key='doc')=>({agentId:f.a.id,threadId:f.threadId,title:'Brief',summary:'A short shared summary',mimeType:'text/plain' as const,content:'Shared source text',idempotencyKey:key});
test('context: exact UTF-8 bytes and SHA256 survive BOM, CRLF, sections and1MiB boundary',async()=>{
 const f=await pair();try{const{ContextService,CONTEXT_POLICY}=await import('../src/context');const s=new ContextService(f.db);const content='\uFEFFLine1\r\n🙂漢字\r\n'+'x'.repeat(CONTEXT_POLICY.maxDocumentBytes-26);const bytes=new TextEncoder().encode(content);assert.ok(bytes.length<=CONTEXT_POLICY.maxDocumentBytes);const shared=await s.share(alice,{...input(f),content});let text='';for(let n=0;n<shared.resource.chunkCount;n++)text+=(await s.read(bob,shared.resource.id,n)).content;assert.equal(text,content);const sha=Buffer.from(await crypto.subtle.digest('SHA-256',bytes)).toString('hex');assert.equal(shared.resource.sha256,sha);assert.equal(shared.resource.byteLength,bytes.length);
 const full=await s.share(alice,{...input(f,'exact'),content:'a'.repeat(1048576)});assert.equal(full.resource.byteLength,1048576);assert.equal(full.resource.chunkCount,64);await assert.rejects(s.share(alice,{...input(f,'over'),content:'a'.repeat(1048577)}),{code:'invalid_context'});
 for(const bad of ['bad\ud800','bad\0binary'])await assert.rejects(s.share(alice,{...input(f,'invalid'),content:bad}),{code:'invalid_context'});
 await assert.rejects(s.share(alice,{...input(f,'html'),mimeType:'text/html' as 'text/plain'}),{code:'invalid_context'});
 }finally{f.close();}
});
test('context: immutable idempotent retries are scoped to owner and reject changed content',async()=>{
 const f=await pair();try{const{ContextService}=await import('../src/context');const s=new ContextService(f.db),body=input(f);const outcomes=await Promise.all(Array.from({length:6},()=>s.share(alice,body)));assert.equal(new Set(outcomes.map(r=>r.resource.id)).size,1);assert.equal(outcomes.filter(r=>!r.duplicate).length,1);assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM context_resources').get()!.n,1);await assert.rejects(s.share(alice,{...body,content:'Changed bytes'}),{code:'idempotency_conflict'});const other=await s.share(bob,{...body,agentId:f.b.id});assert.notEqual(other.resource.id,outcomes[0].resource.id);assert.equal((await s.manifest(bob,outcomes[0].resource.id)).canRevoke,false);
 }finally{f.close();}
});
test('context: only mutually permitted active thread participants can read metadata or bytes',async()=>{
 const f=await pair();try{const{ContextService}=await import('../src/context');const s=new ContextService(f.db),r=await s.share(alice,input(f)),eve:Principal={subject:'outsider',scopes:['a2a:read']};
 await assert.rejects(s.manifest(eve,r.resource.id),{code:'context_unavailable'});await assert.rejects(s.list(eve,f.threadId),{code:'context_unavailable'});assert.deepEqual((await s.list(eve)).resources,[]);
 await assert.rejects(s.share({...alice,authentication:'bearer'},input(f,'bearer')),{code:'owner_session_required'});await assert.rejects(s.share(alice,{...input(f,'wrong-agent'),agentId:f.b.id}),{code:'context_share_denied'});
 await f.inbox.setAgentPaused(bob,f.b.id,true);await assert.rejects(s.read(alice,r.resource.id),{code:'context_unavailable'});await assert.rejects(s.search(bob,r.resource.id,'Shared'),{code:'context_unavailable'});await assert.rejects(s.list(alice,f.threadId),{code:'context_unavailable'});await f.inbox.setAgentPaused(bob,f.b.id,false);
 await f.inbox.revokeGrant(bob,f.grant.id);await assert.rejects(s.manifest(alice,r.resource.id),{code:'context_unavailable'});await f.inbox.grantSender(bob,f.b.id,f.a.id);assert.ok(await s.read(bob,r.resource.id));
 f.sqlite.prepare('UPDATE threads SET expires_at=? WHERE id=?').run(Date.now()-1,f.threadId);await assert.rejects(s.read(bob,r.resource.id),{code:'context_unavailable'});
 }finally{f.close();}
});
test('context: revocation erases stored text and cannot be undone by restoring grants',async()=>{
 const f=await pair();try{const{ContextService}=await import('../src/context');const s=new ContextService(f.db),r=await s.share(alice,input(f));await assert.rejects(s.revoke(bob,r.resource.id),{code:'context_unavailable'});await f.inbox.revokeGrant(bob,f.grant.id);await f.inbox.setAgentPaused(alice,f.a.id,true);assert.deepEqual(await s.revoke(alice,r.resource.id),{revoked:true});assert.deepEqual(await s.revoke(alice,r.resource.id),{revoked:true});await f.inbox.setAgentPaused(alice,f.a.id,false);await f.inbox.grantSender(bob,f.b.id,f.a.id);await assert.rejects(s.read(bob,r.resource.id),{code:'context_unavailable'});assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM context_chunks').get()!.n,0);assert.equal(f.sqlite.prepare('SELECT summary FROM context_resources').get()!.summary,'');
 }finally{f.close();}
});
test('context: admission races and transaction failure never leave a partial shared document',async()=>{
 const f=await pair();try{const{ContextService}=await import('../src/context');const s=new ContextService(f.db);f.beforeNextBatch(()=>f.sqlite.prepare('UPDATE grants SET revoked_at=? WHERE id=?').run(Date.now(),f.grant.id));await assert.rejects(s.share(alice,input(f)),{code:'context_share_denied'});assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM context_resources').get()!.n,0);await f.inbox.grantSender(bob,f.b.id,f.a.id);
 f.sqlite.exec("CREATE TRIGGER fail_context BEFORE INSERT ON context_chunks WHEN NEW.chunk_index=1 BEGIN SELECT RAISE(ABORT,'synthetic'); END");await assert.rejects(s.share(alice,{...input(f,'fail'),content:'a'.repeat(20000)}),{code:'storage_unavailable'});assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM context_resources').get()!.n,0);assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM context_chunks').get()!.n,0);
 }finally{f.close();}
});
test('context: literal search finds boundary-spanning matches and bounds its output',async()=>{
 const f=await pair();try{const{ContextService}=await import('../src/context');const s=new ContextService(f.db),query='across-boundary',content='x'.repeat(16380)+query+'\n'+('match ').repeat(20),r=await s.share(alice,{...input(f),content});const found=await s.search(bob,r.resource.id,query);assert.equal(found.matches.length,1);assert.equal(found.matches[0].chunkIndex,0);assert.ok(found.matches[0].snippet.includes(query));const bounded=await s.search(bob,r.resource.id,'match');assert.equal(bounded.matches.length,10);assert.equal(bounded.truncated,true);assert.equal((await s.search(bob,r.resource.id,'MATCH')).matches.length,0);
 }finally{f.close();}
});
test('context: thread byte quotas remain atomic and revoked uploads still count against thread/document quotas',async()=>{
 const f=await pair();try{const{ContextService}=await import('../src/context');const s=new ContextService(f.db),content='a'.repeat(1048576);for(let n=0;n<7;n++)await s.share(alice,{...input(f,'large-'+n),content});const attempts=await Promise.allSettled([7,8,9].map(n=>s.share(alice,{...input(f,'large-'+n),content})));assert.equal(attempts.filter(r=>r.status==='fulfilled').length,1);assert.equal((await s.list(alice,f.threadId)).resources.length,8);await assert.rejects(s.share(alice,input(f,'one-more')),{code:'context_share_denied'});
 }finally{f.close();}
 const f2=await pair();try{const{ContextService}=await import('../src/context');const s=new ContextService(f2.db);let id='';for(let n=0;n<16;n++)id=(await s.share(n%2?bob:alice,{...input(f2,'tiny-'+n),agentId:n%2?f2.b.id:f2.a.id})).resource.id;await s.revoke(bob,id);await assert.rejects(s.share(alice,input(f2,'after-revoke')),{code:'context_share_denied'});
 }finally{f2.close();}
});
test('context: global manifests paginate25 at a time without including revoked resources',async()=>{
 const f=await pair();try{const{ContextService}=await import('../src/context');const s=new ContextService(f.db);const second=await f.inbox.sendOwnerMessage(alice,{fromAgentId:f.a.id,toAgentId:f.b.id,text:'Second context thread',idempotencyKey:'second-thread'});for(let n=0;n<32;n++)await s.share(n%2?bob:alice,{...input(f,'page-'+n),agentId:n%2?f.b.id:f.a.id,threadId:n<16?f.threadId:second.message.threadId});const one=await s.list(alice);assert.equal(one.resources.length,25);assert.equal(one.hasMore,true);const two=await s.list(alice,undefined,one.nextAfter!);assert.equal(two.resources.length,7);assert.equal(two.hasMore,false);assert.equal(new Set([...one.resources,...two.resources].map(r=>r.id)).size,32);
 await assert.rejects(s.share(alice,{...input(f,'daily-limit'),threadId:second.message.threadId}),{code:'context_share_denied'});
 }finally{f.close();}
});
test('context: retention and inbox redaction remove text before metadata expires',async()=>{
 const f=await pair();try{const{ContextService}=await import('../src/context');const s=new ContextService(f.db),r=await s.share(alice,input(f));f.sqlite.prepare('UPDATE context_resources SET created_at=? WHERE id=?').run(Date.now()-31*86400000,r.resource.id);await s.pruneRetention();assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM context_chunks').get()!.n,0);await assert.rejects(s.read(bob,r.resource.id),{code:'context_unavailable'});assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM context_resources').get()!.n,1);await s.pruneRetention(Date.now()+61*86400000);assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM context_resources').get()!.n,0);
 const second=await s.share(alice,input(f,'delete-inbox'));await f.db.batch(s.redactionStatementsForInbox(f.b.id,Date.now()));await assert.rejects(s.read(alice,second.resource.id),{code:'context_unavailable'});assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM context_chunks').get()!.n,0);
 }finally{f.close();}
});
test('context: owner rolling upload limit spans threads and active-byte quota blocks new documents at32MiB',async()=>{
 const f=await pair();try{const{ContextService}=await import('../src/context');const s=new ContextService(f.db);const threads=[f.threadId];for(let n=0;n<4;n++)threads.push((await f.inbox.sendOwnerMessage(alice,{fromAgentId:f.a.id,toAgentId:f.b.id,text:'Project '+n,idempotencyKey:'byte-thread-'+n})).message.threadId);
 for(let n=0;n<16;n++)await s.share(alice,{...input(f,'owner-byte-'+n),content:'x'.repeat(1048576),threadId:threads[Math.floor(n/8)]});await assert.rejects(s.share(alice,{...input(f,'daily-over'),threadId:threads[2]}),{code:'context_share_denied'});
 f.sqlite.prepare('UPDATE context_resources SET created_at=?').run(Date.now()-86400001);
 for(let n=16;n<32;n++)await s.share(alice,{...input(f,'owner-byte-'+n),content:'x'.repeat(1048576),threadId:threads[Math.floor(n/8)]});
 f.sqlite.prepare('UPDATE context_resources SET created_at=?').run(Date.now()-86400001);
 await assert.rejects(s.share(alice,{...input(f,'active-over'),threadId:threads[4]}),{code:'context_share_denied'});
 f.sqlite.prepare('UPDATE context_resources SET expires_at=? WHERE cursor=1').run(Date.now()-1);
 assert.ok(await s.share(alice,{...input(f,'after-expiry'),threadId:threads[4]}));
 }finally{f.close();}
});
test('context: a full1MiB multibyte document uses a final UTF-8-safe section without dropping bytes',async()=>{
 const f=await pair();try{const{ContextService}=await import('../src/context');const s=new ContextService(f.db),content='漢'.repeat(349525)+'a';assert.equal(new TextEncoder().encode(content).length,1048576);const r=await s.share(alice,{...input(f),content});assert.equal(r.resource.chunkCount,65);let combined='';for(let n=0;n<r.resource.chunkCount;n++)combined+=(await s.read(bob,r.resource.id,n)).content;assert.equal(combined,content);assert.equal((await s.read(bob,r.resource.id,64)).nextChunk,null);
 }finally{f.close();}
});
test('context owner management: own metadata remains discoverable for revocation after pause, grant loss and expiry',async()=>{
 const f=await pair();try{
 const{ContextService}=await import('../src/context');const s=new ContextService(f.db),a=(await s.share(alice,input(f,'manage-alice'))).resource,b=(await s.share(bob,{...input(f,'manage-bob'),agentId:f.b.id})).resource;
 await f.inbox.revokeGrant(bob,f.grant.id);await f.inbox.setAgentPaused(alice,f.a.id,true);f.sqlite.prepare('UPDATE threads SET expires_at=? WHERE id=?').run(Date.now()-1,f.threadId);f.sqlite.prepare('UPDATE context_resources SET expires_at=?').run(Date.now()-1);
 await assert.rejects(s.manifest(alice,a.id),{code:'context_unavailable'});
 const own=await s.listOwned(alice);assert.deepEqual(own.resources.map(r=>r.id),[a.id]);assert.equal(own.resources[0].canRevoke,true);assert.equal(own.resources[0].title,'Brief');assert.ok(!('content' in own.resources[0]));assert.ok(!JSON.stringify(own).includes(b.id));await assert.rejects(s.listOwned({...alice,authentication:'bearer'}),{code:'owner_session_required'});
 await s.revoke(alice,a.id);assert.equal((await s.listOwned(alice)).resources.length,0);assert.equal((await s.listOwned(bob)).resources[0].id,b.id);
 }finally{f.close();}
});
test('context owner management: pagination stays within the owner when peer records share the cursor stream',async()=>{
 const f=await pair();try{const{ContextService}=await import('../src/context');const s=new ContextService(f.db),mine:string[]=[];for(let n=0;n<16;n++)mine.push((await s.share(alice,input(f,'managed-page-'+n))).resource.id);
 f.sqlite.prepare('UPDATE context_resources SET created_at=?').run(Date.now()-86400001);
 const thread=(await f.inbox.sendOwnerMessage(alice,{fromAgentId:f.a.id,toAgentId:f.b.id,text:'Owner management paging',idempotencyKey:'managed-second-thread'})).message.threadId;
 for(let n=16;n<26;n++){if(n===18||n===21)await s.share(bob,{...input(f,'peer-managed-'+n),agentId:f.b.id,threadId:thread});mine.push((await s.share(alice,{...input(f,'managed-page-'+n),threadId:thread})).resource.id);}
 const one=await s.listOwned(alice);assert.equal(one.resources.length,25);assert.equal(one.hasMore,true);const two=await s.listOwned(alice,one.nextAfter!);assert.equal(two.resources.length,1);assert.equal(two.hasMore,false);assert.deepEqual([...one.resources,...two.resources].map(r=>r.id),mine);assert.equal((await s.listOwned(bob)).resources.length,2);
 }finally{f.close();}
});
