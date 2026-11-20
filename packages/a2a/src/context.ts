import {DomainError} from './domain';
import type {Principal} from './domain-types';

export const CONTEXT_POLICY=Object.freeze({maxDocumentBytes:1024*1024,maxChunkBytes:16*1024,maxThreadBytes:8*1024*1024,maxThreadDocuments:16,maxOwnerUploadsPerDay:16,maxOwnerActiveBytes:32*1024*1024,maxSummaryBytes:2048,pageSize:25,maxSearchMatches:10});
export interface ContextResource {id:string;threadId:string;uri:string;title:string;summary:string;mimeType:'text/plain'|'text/markdown';byteLength:number;sha256:string;chunkCount:number;createdAt:number;expiresAt:number;ownerLabel:string;canRevoke:boolean}
export interface ShareContextInput {agentId:string;threadId:string;title:string;summary:string;mimeType:'text/plain'|'text/markdown';content:string;idempotencyKey:string}
interface ResourceRow {cursor:number;id:string;thread_id:string;owner_subject:string;owner_label:string;title:string;summary:string;mime_type:'text/plain'|'text/markdown';byte_length:number;sha256:string;chunk_count:number;created_at:number;expires_at:number;revoked_at:number|null;content_deleted_at:number|null;body_hash:string}
const encoder=new TextEncoder(),decoder=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true});
const unavailable=()=>new DomainError('context_unavailable',404,'Shared context unavailable.');
const invalid=(message:string)=>new DomainError('invalid_context',400,message);
function subject(p:Principal){if(!p?.subject?.trim())throw new DomainError('unauthenticated',401);return p.subject;}
function owner(p:Principal){subject(p);if(p.authentication!=='owner_session'||!['a2a:read','a2a:write','a2a:admin'].every(s=>p.scopes.includes(s)))throw new DomainError('owner_session_required',403,'Use your signed-in owner console to manage shared context.');}
function identifier(value:unknown):value is string{return typeof value==='string'&&/^[A-Za-z0-9_-]{1,160}$/.test(value);}
function validateText(value:unknown,label:string,maxBytes:number,allowEmpty=false):Uint8Array {
 if(typeof value!=='string'||(!allowEmpty&&!value.trim())||value.includes('\0'))throw invalid(`${label} must contain plain UTF-8 text.`);
 const bytes=encoder.encode(value);if(bytes.length>maxBytes||decoder.decode(bytes)!==value)throw invalid(`${label} exceeds its UTF-8 text limit.`);return bytes;
}
async function digest(bytes:Uint8Array){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes as Uint8Array<ArrayBuffer>)),v=>v.toString(16).padStart(2,'0')).join('');}
export function contextUri(threadId:string,id:string,chunk?:number){return `a2a://threads/${threadId}/context/${id}${chunk===undefined?'':`/chunks/${chunk}`}`;}
export function parseContextUri(uri:unknown):{threadId:string;resourceId:string;chunkIndex?:number}{
 if(typeof uri!=='string')throw invalid('A context resource URI is required.');
 const match=uri.match(/^a2a:\/\/threads\/([A-Za-z0-9_-]{1,160})\/context\/([A-Za-z0-9_-]{1,160})(?:\/chunks\/(0|[1-9]\d{0,2}))?$/);
 if(!match)throw invalid('Invalid context resource URI.');return{threadId:match[1],resourceId:match[2],...(match[3]===undefined?{}:{chunkIndex:Number(match[3])})};
}
// Inserted in every content-bearing query, including chunk and search reads.
// Current grants/pause/expiry are SQL admission, never a cached preceding API read.
const THREAD_ACCESS=`EXISTS(SELECT 1 FROM threads th JOIN agents a ON a.id=th.agent_a_id JOIN agents b ON b.id=th.agent_b_id
 WHERE th.id=r.thread_id AND th.expires_at>? AND (a.owner_subject=? OR b.owner_subject=?)
 AND a.paused=0 AND b.paused=0 AND a.deleted_at IS NULL AND b.deleted_at IS NULL
 AND EXISTS(SELECT 1 FROM grants g WHERE g.agent_id=a.id AND g.sender_agent_id=b.id AND g.revoked_at IS NULL)
 AND EXISTS(SELECT 1 FROM grants g WHERE g.agent_id=b.id AND g.sender_agent_id=a.id AND g.revoked_at IS NULL))`;
const RESOURCE_ACCESS=`r.revoked_at IS NULL AND r.content_deleted_at IS NULL AND r.expires_at>? AND ${THREAD_ACCESS}`;
const publicResource=(r:ResourceRow,p:Principal):ContextResource=>({id:r.id,threadId:r.thread_id,uri:contextUri(r.thread_id,r.id),title:r.title,summary:r.summary,mimeType:r.mime_type,byteLength:r.byte_length,sha256:r.sha256,chunkCount:r.chunk_count,createdAt:r.created_at,expiresAt:r.expires_at,ownerLabel:r.owner_label,canRevoke:p.authentication==='owner_session'&&r.owner_subject===p.subject&&['a2a:read','a2a:write','a2a:admin'].every(scope=>p.scopes.includes(scope))});

export class ContextService {
 constructor(private readonly db:D1Database){}
 private statement(sql:string,...values:(string|number|null)[]){return this.db.prepare(sql).bind(...values);}
 private async all<T>(sql:string,...values:(string|number|null)[]):Promise<T[]>{try{return(await this.statement(sql,...values).all<T>()).results;}catch(cause){throw new DomainError('storage_unavailable',503,'Shared context storage unavailable.',{cause});}}
 private async batch(statements:D1PreparedStatement[]){try{return await this.db.batch(statements);}catch(cause){throw new DomainError('storage_unavailable',503,'Shared context update is uncertain; reconcile before retrying.',{cause});}}
 private args(p:Principal){const now=Date.now(),s=subject(p);return[now,now,s,s] as const;}
 private async row(p:Principal,id:string):Promise<ResourceRow>{if(!identifier(id))throw unavailable();const rows=await this.all<ResourceRow>(`SELECT r.* FROM context_resources r WHERE r.id=? AND ${RESOURCE_ACCESS}`,id,...this.args(p));if(!rows[0])throw unavailable();return rows[0];}
 async manifest(p:Principal,id:string){return publicResource(await this.row(p,id),p);}
 async list(p:Principal,threadId?:string,after=0){
  if(!Number.isSafeInteger(after)||after<0)throw invalid('Invalid context cursor.');
  if(threadId!==undefined){
   if(!identifier(threadId))throw unavailable();const now=Date.now(),s=subject(p);
   const eligible=await this.all<{id:string}>(`SELECT th.id FROM threads th WHERE th.id=? AND EXISTS(SELECT 1 FROM (SELECT th.id AS thread_id) r WHERE ${THREAD_ACCESS})`,threadId,now,s,s);
   if(!eligible.length)throw unavailable();
  }
  const rows=await this.all<ResourceRow>(`SELECT r.* FROM context_resources r WHERE r.cursor>? ${threadId===undefined?'':'AND r.thread_id=?'} AND ${RESOURCE_ACCESS} ORDER BY r.cursor LIMIT ${CONTEXT_POLICY.pageSize+1}`,after,...(threadId===undefined?[]:[threadId]),...this.args(p));const page=rows.slice(0,CONTEXT_POLICY.pageSize);
  return{resources:page.map(r=>publicResource(r,p)),hasMore:rows.length>CONTEXT_POLICY.pageSize,nextAfter:page.at(-1)?.cursor??null};
 }
 /** Owner control metadata stays discoverable after content access expires or is paused.
  * This directory never joins chunks and never admits another owner's records. */
 async listOwned(p:Principal,after=0){
  owner(p);if(!Number.isSafeInteger(after)||after<0)throw invalid('Invalid context cursor.');
  const rows=await this.all<ResourceRow>(`SELECT r.* FROM context_resources r WHERE r.owner_subject=? AND r.cursor>? AND r.revoked_at IS NULL AND r.content_deleted_at IS NULL ORDER BY r.cursor LIMIT ${CONTEXT_POLICY.pageSize+1}`,subject(p),after);
  const page=rows.slice(0,CONTEXT_POLICY.pageSize);
  return{resources:page.map(r=>publicResource(r,p)),hasMore:rows.length>CONTEXT_POLICY.pageSize,nextAfter:page.at(-1)?.cursor??null};
 }
 async share(p:Principal,input:ShareContextInput){
  owner(p);if(!input||!identifier(input.agentId)||!identifier(input.threadId))throw invalid('An owned inbox and existing thread are required.');
  if(typeof input.title!=='string'||Array.from(input.title.trim()).length>120)throw invalid('Title must contain at most 120 characters.');validateText(input.title,'Title',480);
  validateText(input.summary,'Summary',CONTEXT_POLICY.maxSummaryBytes);
  if(!['text/plain','text/markdown'].includes(input.mimeType))throw invalid('Share text or Markdown only.');
  if(typeof input.idempotencyKey!=='string'||!input.idempotencyKey.trim()||input.idempotencyKey.length>128)throw invalid('Idempotency key must contain 1–128 characters.');
  const bytes=validateText(input.content,'Document',CONTEXT_POLICY.maxDocumentBytes),sha256=await digest(bytes),title=input.title.trim(),summary=input.summary.trim();
  const chunks:string[]=[];for(let offset=0;offset<bytes.length;){let end=Math.min(offset+CONTEXT_POLICY.maxChunkBytes,bytes.length);while(end<bytes.length&&(bytes[end]&0xc0)===0x80)end--;chunks.push(decoder.decode(bytes.subarray(offset,end)));offset=end;}
  const bodyHash=await digest(encoder.encode(JSON.stringify([input.agentId,input.threadId,title,summary,input.mimeType,sha256]))),id=crypto.randomUUID(),now=Date.now(),s=subject(p),label=p.displayName?.trim()&&p.displayName.length<=80?p.displayName.trim():null;
  const accessArgs=[now,now,s,s] as const;
  const statements:D1PreparedStatement[]=[];
  statements.push(this.statement(`INSERT INTO context_resources(id,thread_id,owner_subject,owner_label,title,summary,mime_type,byte_length,sha256,chunk_count,idempotency_key,body_hash,created_at,expires_at)
 SELECT ?,th.id,?,COALESCE(?,'Owner of '||own.name),?,?,?,?,?,?,?,?,?,th.expires_at
 FROM threads th JOIN agents own ON own.id=? AND own.owner_subject=? AND own.id IN(th.agent_a_id,th.agent_b_id)
 WHERE th.id=? AND EXISTS(SELECT 1 FROM (SELECT th.id AS thread_id) r WHERE ${THREAD_ACCESS})
 AND NOT EXISTS(SELECT 1 FROM context_resources WHERE owner_subject=? AND idempotency_key=?)
 AND (SELECT COUNT(*) FROM context_resources WHERE thread_id=th.id)<${CONTEXT_POLICY.maxThreadDocuments}
 AND (SELECT COALESCE(SUM(byte_length),0) FROM context_resources WHERE thread_id=th.id)+?<=${CONTEXT_POLICY.maxThreadBytes}
 AND (SELECT COUNT(*) FROM context_resources WHERE owner_subject=? AND created_at>? )<${CONTEXT_POLICY.maxOwnerUploadsPerDay}
 AND (SELECT COALESCE(SUM(byte_length),0) FROM context_resources WHERE owner_subject=? AND content_deleted_at IS NULL AND revoked_at IS NULL AND expires_at>?)+?<=${CONTEXT_POLICY.maxOwnerActiveBytes}`,id,s,label,title,summary,input.mimeType,bytes.length,sha256,chunks.length,input.idempotencyKey,bodyHash,now,input.agentId,s,input.threadId,now,s,s,s,input.idempotencyKey,bytes.length,s,now-86400000,s,now,bytes.length));
  for(let index=0;index<chunks.length;index++)statements.push(this.statement(`INSERT INTO context_chunks(resource_id,chunk_index,content,byte_length) SELECT r.id,?,?,? FROM context_resources r WHERE r.id=? AND ${RESOURCE_ACCESS}`,index,chunks[index],encoder.encode(chunks[index]).length,id,...accessArgs));
  statements.push(this.statement(`INSERT INTO audit_events(id,actor_subject,action,agent_id,message_id,created_at) SELECT ?,?,'context.shared',?,NULL,? FROM context_resources WHERE id=?`,crypto.randomUUID(),s,input.agentId,now,id));
  statements.push(this.statement(`SELECT r.* FROM context_resources r WHERE r.owner_subject=? AND r.idempotency_key=? AND ${RESOURCE_ACCESS}`,s,input.idempotencyKey,...accessArgs));
  const results=await this.batch(statements),row=results.at(-1)!.results[0] as unknown as ResourceRow|undefined;
  if(!row)throw new DomainError('context_share_denied',403,'Share unavailable: check current reciprocal permissions, active inboxes, thread expiry, and context quotas.');
  if(row.body_hash!==bodyHash)throw new DomainError('idempotency_conflict',409,'Idempotency key already used for a different document.');
  return{resource:publicResource(row,p),duplicate:row.id!==id};
 }
 async read(p:Principal,id:string,chunkIndex=0){
  if(!Number.isSafeInteger(chunkIndex)||chunkIndex<0||chunkIndex>64)throw invalid('Invalid context section.');const resource=await this.manifest(p,id);
  const rows=await this.all<{content:string}>(`SELECT c.content FROM context_chunks c JOIN context_resources r ON r.id=c.resource_id WHERE r.id=? AND c.chunk_index=? AND ${RESOURCE_ACCESS}`,id,chunkIndex,...this.args(p));if(!rows[0])throw unavailable();
  return{resource,chunkIndex,content:rows[0].content,nextChunk:chunkIndex+1<resource.chunkCount?chunkIndex+1:null};
 }
 async search(p:Principal,id:string,query:string){
  validateText(query,'Search text',256);const resource=await this.manifest(p,id);
  const rows=await this.all<{content:string;chunk_index:number}>(`SELECT c.content,c.chunk_index FROM context_chunks c JOIN context_resources r ON r.id=c.resource_id WHERE r.id=? AND ${RESOURCE_ACCESS} ORDER BY c.chunk_index`,id,...this.args(p));if(rows.length!==resource.chunkCount)throw unavailable();
  let text='',offset=0;const starts:number[]=[];for(const row of rows){starts.push(offset);text+=row.content;offset=text.length;}
  const matches:{chunkIndex:number;snippet:string}[]=[];let at=0,truncated=false;
  while((at=text.indexOf(query,at))>=0){if(matches.length===CONTEXT_POLICY.maxSearchMatches){truncated=true;break;}let chunkIndex=starts.length-1;while(chunkIndex>0&&starts[chunkIndex]>at)chunkIndex--;
   let begin=Math.max(0,at-70),end=Math.min(text.length,at+query.length+70);if(begin>0&&/[\uDC00-\uDFFF]/.test(text[begin]))begin--;if(end<text.length&&/[\uDC00-\uDFFF]/.test(text[end]))end++;
   matches.push({chunkIndex,snippet:text.slice(begin,end)});at+=Math.max(query.length,1);
  }
  return{resource,matches,truncated};
 }
 async revoke(p:Principal,id:string){
  owner(p);if(!identifier(id))throw unavailable();const now=Date.now(),s=subject(p);
  const results=await this.batch([this.statement('DELETE FROM context_chunks WHERE resource_id IN(SELECT id FROM context_resources WHERE id=? AND owner_subject=?)',id,s),this.statement("UPDATE context_resources SET revoked_at=COALESCE(revoked_at,?),content_deleted_at=COALESCE(content_deleted_at,?),title='[revoked]',summary='' WHERE id=? AND owner_subject=? RETURNING id",now,now,id,s)]);
  if(!results[1].results.length)throw unavailable();return{revoked:true};
 }
 redactionStatementsForInbox(agentId:string,now:number){const ids='SELECT r.id FROM context_resources r JOIN threads th ON th.id=r.thread_id WHERE th.agent_a_id=? OR th.agent_b_id=?';return[this.statement(`DELETE FROM context_chunks WHERE resource_id IN(${ids})`,agentId,agentId),this.statement(`UPDATE context_resources SET revoked_at=COALESCE(revoked_at,?),content_deleted_at=COALESCE(content_deleted_at,?),title='[unavailable]',summary='' WHERE id IN(${ids})`,now,now,agentId,agentId)];}
 async pruneRetention(now=Date.now()){
  const stale=`created_at<=? OR EXISTS(SELECT 1 FROM threads th JOIN agents a ON a.id=th.agent_a_id JOIN agents b ON b.id=th.agent_b_id WHERE th.id=context_resources.thread_id AND (a.deleted_at IS NOT NULL OR b.deleted_at IS NOT NULL))`;
  await this.batch([this.statement(`DELETE FROM context_chunks WHERE resource_id IN(SELECT id FROM context_resources WHERE ${stale})`,now-30*86400000),this.statement(`UPDATE context_resources SET content_deleted_at=COALESCE(content_deleted_at,?),title='[unavailable]',summary='' WHERE ${stale}`,now,now-30*86400000),this.statement('DELETE FROM context_resources WHERE created_at<=?',now-90*86400000)]);
 }
}
