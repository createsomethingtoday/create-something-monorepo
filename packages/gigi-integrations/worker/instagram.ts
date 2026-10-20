import {Data,Effect,Either} from 'effect';
import type {ConnectorEnv} from './index.ts';

interface Dependencies {
 verifyAccount:(env:ConnectorEnv,fetch:typeof globalThis.fetch,subject:string,provider:'instagram',accountId:string)=>Promise<boolean>;
 read:(env:ConnectorEnv,fetch:typeof globalThis.fetch,accountId:string,endpoint:string,parameters:Array<{name:string;value:string;type:'query'}>)=>Promise<Record<string,unknown>>;
}
export interface InstagramPublishInput {requestId:string;connectedAccountId:string;instagramAccountId:string;caption:string;imageUrl:string;expectedImageSha256:string;confirmed:true}
export interface InstagramReceipt {requestId:string;state:'not_published'|'unknown'|'published_unverified'|'published';mediaId?:string;permalink?:string;reason?:string}
class InstagramError extends Data.TaggedError('InstagramError')<{reason:string}>{}
const id=(v:unknown):v is string=>typeof v==='string'&&/^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/u.test(v);
const numeric=(v:unknown):v is string=>typeof v==='string'&&/^[0-9]{1,32}$/u.test(v);
const object=(v:unknown):v is Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const json=(v:unknown,status=200)=>Response.json(v,{status,headers:{'cache-control':'no-store'}});
const fail=(reason:string):never=>{throw new InstagramError({reason});};

export function parseInstagramPublishInput(v:unknown):InstagramPublishInput {
 if(!object(v)||Object.keys(v).some(k=>!['requestId','connectedAccountId','instagramAccountId','caption','imageUrl','expectedImageSha256','confirmed'].includes(k))||
 !id(v.requestId)||typeof v.connectedAccountId!=='string'||!/^ca_[A-Za-z0-9_-]{1,128}$/u.test(v.connectedAccountId)||!numeric(v.instagramAccountId)||v.confirmed!==true||
 typeof v.expectedImageSha256!=='string'||!/^[a-f0-9]{64}$/u.test(v.expectedImageSha256)||typeof v.caption!=='string'||v.caption.length>2200||typeof v.imageUrl!=='string'||v.imageUrl.length>2048)fail('invalid_request');
 const input=v as unknown as InstagramPublishInput;
 if((input.caption.match(/#[\p{L}\p{N}_]+/gu)?.length??0)>30||(input.caption.match(/@[A-Za-z0-9._]+/gu)?.length??0)>20)fail('caption_limits');
 const url=new URL(input.imageUrl);if(url.protocol!=='https:'||url.username||url.password||url.port||url.hash)fail('invalid_media_url');
 return input;
}
async function boundedBytes(response:Request|Response,maximum:number){
 if(!response.body)fail('provider_unavailable');const reader=response.body!.getReader(),parts:Uint8Array[]=[];let count=0;
 try{for(;;){const {value,done}=await reader.read();if(done)break;count+=value.length;if(count>maximum)fail('media_too_large');parts.push(value);}}
 finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
 const all=new Uint8Array(count);let offset=0;for(const part of parts){all.set(part,offset);offset+=part.length;}return all;
}
async function boundedJson(response:Request|Response){return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(await boundedBytes(response,131072))) as unknown;}
/** Parse a baseline/progressive JPEG SOF. Reject unsupported/ambiguous bytes;
 * extension, Content-Type and caller-supplied dimensions are not evidence. */
export function jpegDimensions(bytes:Uint8Array):{width:number;height:number}|null {
 if(bytes.length<4||bytes[0]!==255||bytes[1]!==216||bytes[bytes.length-2]!==255||bytes[bytes.length-1]!==217)return null;
 let i=2,dimensions:{width:number;height:number}|null=null;
 while(i+3<bytes.length){if(bytes[i++]!==255)return null;while(bytes[i]===255)i++;const marker=bytes[i++];
  if(marker===217)return null;if(marker===218){const length=bytes[i]!*256+bytes[i+1]!;return dimensions&&length>=6&&i+length<bytes.length-2?dimensions:null;}if(marker===1||(marker>=208&&marker<=215))continue;
  const length=bytes[i]! * 256+bytes[i+1]!;if(length<2||i+length>bytes.length)return null;
  if(marker===192||marker===193||marker===194){const components=bytes[i+7];if(dimensions||length<11||bytes[i+2]!==8||!components||![1,3].includes(components)||length!==8+3*components)return null;dimensions={height:bytes[i+3]!*256+bytes[i+4]!,width:bytes[i+5]!*256+bytes[i+6]!};}i+=length;
 }return null;
}
async function validateMedia(input:{imageUrl:string},env:ConnectorEnv,request:typeof fetch){
 const hosts=(env.GIGI_INSTAGRAM_MEDIA_HOSTS??'').split(',').map(h=>h.trim()).filter(Boolean),url=new URL(input.imageUrl);
 // Explicit host allowlist avoids SSRF and DNS-rebinding to arbitrary user hosts.
 // Never follow redirects and never attach provider/Identity credentials here.
 if(url.protocol!=='https:'||url.username||url.password||url.port||url.hash||!hosts.includes(url.hostname)||/^(?:localhost|.*\.local|.*\.internal|[\d.]+|\[.*\])$/u.test(url.hostname))fail('media_host_not_allowed');
 const response=await request(new Request(url,{method:'GET',redirect:'manual',signal:AbortSignal.timeout(10000)}));
 if(!response.ok||response.headers.get('content-type')?.split(';')[0]?.trim()!=='image/jpeg')fail('jpeg_required');
 const bytes=await boundedBytes(response,8*1024*1024),dimensions=jpegDimensions(bytes);
 if(!dimensions||dimensions.height<1||dimensions.width<320||dimensions.width/dimensions.height<0.8||dimensions.width/dimensions.height>1.91)fail('image_dimensions');
 return {bytes,dimensions};
}
function projection(row:Record<string,unknown>):InstagramReceipt {
 const state=['not_published','published_unverified','published'].includes(String(row.state))?row.state as InstagramReceipt['state']:'unknown';
 return {requestId:String(row.request_id),state,...(numeric(row.media_id)?{mediaId:row.media_id}:{}),
  ...(typeof row.permalink==='string'&&safePermalink(row.permalink)?{permalink:row.permalink}:{}),...(typeof row.reason==='string'?{reason:row.reason}:{})};
}
function safePermalink(value:string){try{const u=new URL(value);return u.protocol==='https:'&&u.hostname==='www.instagram.com'&&!u.username&&!u.password&&!u.port&&/^\/(p|reel)\/[^/]+\//u.test(u.pathname);}catch{return false;}}
async function digest(value:string|Uint8Array){const data=typeof value==='string'?new TextEncoder().encode(value):value;return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(data).buffer))].map(n=>n.toString(16).padStart(2,'0')).join('');}

export async function handleInstagramRequest(request:Request,env:ConnectorEnv,fetcher:typeof fetch,subject:string,deps:Dependencies):Promise<Response>{
 const result=await Effect.runPromise(Effect.either(Effect.tryPromise({try:()=>handle(request,env,fetcher,subject,deps),catch:cause=>cause instanceof InstagramError?cause:new InstagramError({reason:'provider_unavailable'})})));
 return Either.isLeft(result)?json({error:result.left.reason},result.left.reason==='invalid_request'?400:503):result.right;
}
async function handle(request:Request,env:ConnectorEnv,fetcher:typeof fetch,subject:string,deps:Dependencies):Promise<Response>{
 const url=new URL(request.url),db=env.DB!;
 if(url.pathname==='/v1/gigi/instagram/preview'&&request.method==='POST'){
  const input=await boundedJson(request);if(!object(input)||Object.keys(input).length!==1||typeof input.imageUrl!=='string'||input.imageUrl.length>2048)return json({error:'invalid_request'},400);
  const {bytes,dimensions}=await validateMedia({imageUrl:input.imageUrl},env,fetcher);
  let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
  return json({imageUrl:input.imageUrl,expectedImageSha256:await digest(bytes),...dimensions,dataUrl:'data:image/jpeg;base64,'+btoa(binary)});
 }
 async function account(accountId:string){
  const row=await db.prepare("SELECT connected_account_id FROM gigi_instagram_connections WHERE subject = ? AND connected_account_id = ? AND status = 'active'").bind(subject,accountId).first();
  if(!row||!await deps.verifyAccount(env,fetcher,subject,'instagram',accountId))fail('connection_unavailable');
  const data=await deps.read(env,fetcher,accountId,'https://graph.instagram.com/v25.0/me',[{name:'fields',value:'id,user_id,username,account_type',type:'query'}]);
  const instagramAccountId=numeric(data.user_id)?data.user_id:data.id;
  if(!numeric(instagramAccountId)||!['BUSINESS','MEDIA_CREATOR','CREATOR'].includes(String(data.account_type))||typeof data.username!=='string'||!/^[A-Za-z0-9._]{1,30}$/u.test(data.username))fail('account_unsupported');
  return {connectedAccountId:accountId,instagramAccountId,username:data.username,accountType:data.account_type,publishingPermission:'not_verified'};
 }
 async function graph(accountId:string,path:string,method:'GET'|'POST',params:Record<string,string>){
  if(method==='GET')return deps.read(env,fetcher,accountId,`https://graph.instagram.com/v25.0/${path}`,Object.entries(params).map(([name,value])=>({name,value,type:'query' as const})));
  const response=await fetcher(new Request('https://backend.composio.dev/api/v3.1/tools/execute/proxy',{method:'POST',redirect:'manual',signal:AbortSignal.timeout(15000),
   headers:{'x-api-key':env.COMPOSIO_API_KEY!,'content-type':'application/json'},body:JSON.stringify({connected_account_id:accountId,endpoint:`https://graph.instagram.com/v25.0/${path}`,method:'POST',body:params,parameters:[]})}));
  const wire=await boundedJson(response);if(!response.ok||!object(wire)||wire.status!==200||!object(wire.data)||wire.data.error)fail('provider_unavailable');return (wire as Record<string,unknown>).data as Record<string,unknown>;
 }
 if(url.pathname==='/v1/gigi/instagram/account'&&request.method==='GET'){
  const accountId=url.searchParams.get('connectedAccountId');if(!accountId||!/^ca_[A-Za-z0-9_-]{1,128}$/u.test(accountId))return json({error:'invalid_request'},400);
  return json(await account(accountId));
 }
 const load=async(requestId:string)=>db.prepare('SELECT * FROM gigi_instagram_publishes WHERE subject = ? AND request_id = ?').bind(subject,requestId).first();
 const cleanup=async(row:Record<string,unknown>)=>{if(typeof row.staging_key==='string')await env.INSTAGRAM_MEDIA?.delete(row.staging_key).catch(()=>{});};
 // One readiness poll per explicit action, bounded by the staged image's ten-minute
 // deadline. A GET receipt never advances publication. CAS owns the one POST.
 async function advance(row:Record<string,unknown>):Promise<InstagramReceipt>{
  if(row.state!=='preparing'||!numeric(row.container_id))return projection(row);
  let dispatched=false;
  try{
   let terminal:string|null=Number(row.staging_expires_at)<=Date.now()?'container_processing_expired':null;
   let status:Record<string,unknown>={};
   let identity:Awaited<ReturnType<typeof account>>|null=null;
   if(!terminal){identity=await account(String(row.connected_account_id));if(identity.instagramAccountId!==row.instagram_account_id)return projection({...row,reason:'container_processing'});status=await graph(String(row.connected_account_id),row.container_id,'GET',{fields:'status_code'});}
   if(['ERROR','EXPIRED'].includes(String(status.status_code)))terminal='container_processing_failed';
   if(terminal){
    const updated=await db.prepare("UPDATE gigi_instagram_publishes SET state = 'not_published', reason = ? WHERE subject = ? AND request_id = ? AND state = 'preparing'").bind(terminal,subject,row.request_id).run() as {meta?:{changes?:number}};
    if(updated.meta?.changes===1)await cleanup(row);
    return projection((await load(String(row.request_id)))!);
   }
   if(status.status_code!=='FINISHED')return projection({...row,reason:'container_processing'});
   // Recheck expiry in the atomic claim; racing reconciliations cannot duplicate.
   const claim=await db.prepare("UPDATE gigi_instagram_publishes SET state = 'publishing', reason = NULL WHERE subject = ? AND request_id = ? AND state = 'preparing' AND staging_expires_at > ?").bind(subject,row.request_id,Date.now()).run() as {meta?:{changes?:number}};
   if(claim.meta?.changes!==1)return projection((await load(String(row.request_id)))!);
   dispatched=true;
   const published=await graph(String(row.connected_account_id),`${identity!.instagramAccountId}/media_publish`,'POST',{creation_id:row.container_id});
   if(!numeric(published.id))fail('publish_receipt_invalid');
   row={...row,state:'published_unverified',media_id:published.id,reason:null};
   await db.prepare("UPDATE gigi_instagram_publishes SET state = 'published_unverified', media_id = ?, reason = NULL WHERE subject = ? AND request_id = ?").bind(published.id,subject,row.request_id).run();
   try{
    const media=await graph(String(row.connected_account_id),String(row.media_id),'GET',{fields:'id,media_type,permalink'});
    if(media.id===row.media_id&&media.media_type==='IMAGE'){
     const permalink=typeof media.permalink==='string'&&safePermalink(media.permalink)?media.permalink:null;
     await db.prepare("UPDATE gigi_instagram_publishes SET state = 'published', permalink = ? WHERE subject = ? AND request_id = ?").bind(permalink,subject,row.request_id).run();
     row={...row,state:'published',permalink};
    }
   }catch{/* Accepted by provider; readback remains unverified. */}
   return projection(row);
  }catch(error){
   const reason=dispatched?'publish_outcome_unknown':'container_processing';
   if(dispatched){try{await db.prepare("UPDATE gigi_instagram_publishes SET state = 'unknown', reason = ? WHERE subject = ? AND request_id = ? AND state = 'publishing'").bind(reason,subject,row.request_id).run();}catch{/* publishing remains a fence */}}
   return projection({...row,state:numeric(row.media_id)?'published_unverified':dispatched?'unknown':'preparing',reason});
  }finally{if(dispatched)await cleanup(row);}
 }
 const receipt=/^\/v1\/gigi\/instagram\/receipts\/([A-Za-z0-9._:-]+)$/u.exec(url.pathname);
 if(receipt&&['GET','POST'].includes(request.method)){
  const row=await load(receipt[1]!);
  if(!row)return json({error:'not_found'},404);
  if(row.state==='preparing'&&numeric(row.container_id)){
   if(request.method==='POST'){const consent=await boundedJson(request);if(!object(consent)||consent.continueConfirmed!==true||Object.keys(consent).length!==1)return json({error:'invalid_request'},400);return json(await advance(row));}
   return json(projection({...row,reason:'container_processing'}));
  }
  if(['publishing','unknown','published_unverified'].includes(String(row.state))){
   try{
    const identity=await account(String(row.connected_account_id));if(identity.instagramAccountId!==row.instagram_account_id)return json(projection(row));
    if(numeric(row.media_id)){
     const media=await graph(String(row.connected_account_id),row.media_id,'GET',{fields:'id,media_type,permalink'});
     if(media.id===row.media_id&&media.media_type==='IMAGE'){
      const permalink=typeof media.permalink==='string'&&safePermalink(media.permalink)?media.permalink:null;
      await db.prepare("UPDATE gigi_instagram_publishes SET state = 'published', permalink = ?, reason = NULL WHERE subject = ? AND request_id = ? AND media_id = ?").bind(permalink,subject,row.request_id,row.media_id).run();
      return json(projection({...row,state:'published',permalink,reason:null}));
     }
    }else if(numeric(row.container_id)){
     const container=await graph(String(row.connected_account_id),row.container_id,'GET',{fields:'status_code'});
     if(container.status_code==='PUBLISHED')return json(projection({...row,state:'published_unverified',reason:'container_published_media_receipt_unavailable'}));
    }
   }catch{/* An uncertain provider action stays uncertain; never resend. */}
  }
  return json(projection(row));
 }
 if(url.pathname!=='/v1/gigi/instagram/publish'||request.method!=='POST')return json({error:'not_found'},404);
 let input:InstagramPublishInput;try{input=parseInstagramPublishInput(await boundedJson(request));}catch{return json({error:'invalid_request'},400);}
 const payloadHash=await digest(JSON.stringify([input.connectedAccountId,input.instagramAccountId,input.caption,input.imageUrl,input.expectedImageSha256]));
 const previous=await db.prepare("SELECT * FROM gigi_instagram_publishes WHERE subject = ? AND (request_id = ? OR (payload_hash = ? AND state != 'not_published'))").bind(subject,input.requestId,payloadHash).first();
 if(previous){if(previous.payload_hash!==payloadHash||previous.request_id!==input.requestId)return json({error:'publication_conflict'},409);return json(projection(previous));}
 const identity=await account(input.connectedAccountId);if(identity.instagramAccountId!==input.instagramAccountId)return json({error:'account_changed'},409);
 if(!env.INSTAGRAM_MEDIA)return json({error:'media_staging_unconfigured'},503);
 const {bytes}=await validateMedia(input,env,fetcher);if(await digest(bytes)!==input.expectedImageSha256)return json({error:'image_changed'},409);
 const insert=await db.prepare("INSERT OR IGNORE INTO gigi_instagram_publishes(subject,request_id,payload_hash,connected_account_id,instagram_account_id,state,created_at) VALUES(?,?,?,?,?,'preparing',?)")
  .bind(subject,input.requestId,payloadHash,input.connectedAccountId,input.instagramAccountId,new Date().toISOString()).run() as {meta?:{changes?:number}};
 if(insert.meta?.changes!==1)return json({error:'publication_conflict'},409);
 let preserveStage=false;
 const token=Array.from(crypto.getRandomValues(new Uint8Array(32))).map(n=>n.toString(16).padStart(2,'0')).join('');
 const stagingKey=`instagram/${token}.jpg`,expiresAt=Date.now()+10*60_000;
 try{
  await env.INSTAGRAM_MEDIA.put(stagingKey,bytes,{customMetadata:{expiresAt:String(expiresAt),sha256:input.expectedImageSha256}});
  const created=await graph(input.connectedAccountId,`${identity.instagramAccountId}/media`,'POST',{image_url:`${url.origin}/v1/gigi/instagram/media/${token}.jpg`,caption:input.caption});
  if(!numeric(created.id))fail('container_invalid');
  const checkpoint=await db.prepare("UPDATE gigi_instagram_publishes SET container_id = ?, staging_key = ?, staging_expires_at = ?, reason = 'container_processing' WHERE subject = ? AND request_id = ? AND state = 'preparing'").bind(created.id,stagingKey,expiresAt,subject,input.requestId).run() as {meta?:{changes?:number}};
  if(checkpoint.meta?.changes!==1)fail('journal_unavailable');
  preserveStage=true;
  return json(await advance((await load(input.requestId))!));
 }catch(error){
  const reason=error instanceof InstagramError?error.reason:'provider_unavailable';
  // No media_publish is dispatched in this block; a failed container creation
  // cannot create a public post. Keep a durable terminal receipt where possible.
  try{await db.prepare("UPDATE gigi_instagram_publishes SET state = 'not_published', reason = ? WHERE subject = ? AND request_id = ? AND state = 'preparing'").bind(reason,subject,input.requestId).run();}catch{/* preparing remains a retry fence */}
  return json({requestId:input.requestId,state:'not_published',reason});
 }finally{if(!preserveStage)await env.INSTAGRAM_MEDIA.delete(stagingKey).catch(()=>{});}

}

/** Opaque short-lived URL for Meta only; no account credential or private file
 * path is in the URL. Pending containers retain objects until their deadline; terminal attempts delete them. Bucket
 * lifecycle expiry is a backstop for a worker crash, not public-access policy. */
export async function instagramStagedMedia(request:Request,env:ConnectorEnv):Promise<Response|null>{
 const path=new URL(request.url).pathname;const match=/^\/v1\/gigi\/instagram\/media\/([a-f0-9]{64}\.jpg)$/u.exec(path);
 if(!match)return null;if(request.method!=='GET'||!env.INSTAGRAM_MEDIA)return new Response(null,{status:404});
 const object=await env.INSTAGRAM_MEDIA.get(`instagram/${match[1]}`);
 if(!object||!object.customMetadata?.expiresAt||Number(object.customMetadata.expiresAt)<=Date.now()||!Number.isFinite(Number(object.customMetadata.expiresAt)))return new Response(null,{status:404});
 return new Response(object.body,{headers:{'content-type':'image/jpeg','cache-control':'private, no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'}});
}
