import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {handleConnectorRequest,GIGI_RESOURCE,type ConnectorEnv,type D1Like} from '../worker/index.ts';
import {jpegDimensions,parseInstagramPublishInput} from '../worker/instagram.ts';
import {createBrokerClient} from '../src/broker.ts';

const baseInput={requestId:'post-one',connectedAccountId:'ca_artist',instagramAccountId:'1784',caption:'A new song #music',imageUrl:'https://media.example.test/cover.jpg',confirmed:true as const};
// Structural SOF fixture; provider decoding remains the final validity authority.
const jpeg=new Uint8Array([255,216,255,192,0,17,8,1,144,1,144,3,1,17,0,2,17,0,3,17,0,255,218,0,8,1,1,0,0,63,0,0,255,217]);
const input={...baseInput,expectedImageSha256:createHash('sha256').update(jpeg).digest('hex')};
function fixture(options:{statuses?:string[];accountOverride?:Record<string,unknown>;containerFails?:boolean;publishTimeout?:boolean;mediaReadError?:boolean;identity?:string;mediaResponse?:()=>Response;noConnection?:boolean;noConfig?:boolean}={}){
 const db=new DatabaseSync(':memory:');
 for(const name of ['0001_connections.sql','0002_exact_linked_recovery_fence.sql','0003_selected_gmail_insert_guard.sql','0004_instagram_workspace.sql'])db.exec(readFileSync(new URL(`../worker/migrations/${name}`,import.meta.url),'utf8'));
 if(!options.noConnection)db.prepare("INSERT INTO gigi_instagram_connections(subject,provider,request_id,status,connected_account_id,created_at,auth_config_id) VALUES('owner','instagram','connect-one','active','ca_artist','2026-10-20','ac_instagram')").run();
 const d1:D1Like={prepare(query){return {bind(...values){const bound=values as any[];return {async first(){return db.prepare(query).get(...bound) as Record<string,unknown>??null;},async run(){return {meta:{changes:Number(db.prepare(query).run(...bound).changes)}};},async all(){return {results:db.prepare(query).all(...bound) as Record<string,unknown>[]};}};}};}};
 const objects=new Map<string,{bytes:Uint8Array;customMetadata:Record<string,string>}>();
 const env:ConnectorEnv={DB:d1,INSTAGRAM_MEDIA:{async put(key,bytes,{customMetadata}){objects.set(key,{bytes,customMetadata});},async get(key){const o=objects.get(key);return o?{body:new Response(new Uint8Array(o.bytes).buffer).body!,customMetadata:o.customMetadata}:null;},async delete(key){objects.delete(key);}},COMPOSIO_API_KEY:'test-server-only-key',GIGI_ALLOWED_SUBJECTS:'owner',GIGI_INSTAGRAM_MEDIA_HOSTS:'media.example.test',
  ...(!options.noConfig?{GIGI_INSTAGRAM_AUTH_CONFIG_ID:'ac_instagram',GIGI_INSTAGRAM_APPROVED_SCOPES:'instagram_business_basic,instagram_business_content_publish'}:{})};
 const calls:{url:string;method:string;body:any;headers:Headers}[]=[];
 const fetcher:typeof fetch=async(request)=>{
  const r=request as Request,url=r.url,body=r.method==='POST'?await r.json():null;calls.push({url,method:r.method,body,headers:r.headers});
  if(url.includes('/oauth/userinfo'))return Response.json({sub:'owner',resource:GIGI_RESOURCE,email_verified:true});
  if(url.includes('/connected_accounts/ca_artist')){
   const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('owner')))).map(n=>n.toString(16).padStart(2,'0')).join('').slice(0,32);
   return Response.json({id:'ca_artist',user_id:'gigi_'+hash,auth_config:{id:'ac_instagram'},toolkit:{slug:'instagram'},experimental:{account_type:'PRIVATE'},requested_scopes:['instagram_business_basic','instagram_business_content_publish'],status:'ACTIVE',is_disabled:false,...options.accountOverride});
  }
  if(url.startsWith('https://media.example.test/'))return options.mediaResponse?.()??new Response(jpeg,{headers:{'content-type':'image/jpeg'}});
  if(body?.endpoint?.endsWith('/me'))return Response.json({status:200,data:{id:options.identity??'1784',username:'artist',account_type:'BUSINESS'}});
  if(body?.endpoint?.endsWith('/media_publish')){if(options.publishTimeout)throw new Error('private token response');return Response.json({status:200,data:{id:'3001'}});}
  if(body?.endpoint?.endsWith('/media'))return Response.json({status:options.containerFails?503:200,data:{id:'2001'}});
  if(body?.endpoint?.endsWith('/2001'))return Response.json({status:200,data:{status_code:options.publishTimeout&&calls.some(c=>c.body?.endpoint?.endsWith('/media_publish'))?'PUBLISHED':options.statuses?.shift()??'FINISHED'}});
  if(body?.endpoint?.endsWith('/3001'))return Response.json({status:options.mediaReadError?503:200,data:{id:'3001',media_type:'IMAGE',permalink:'https://www.instagram.com/p/receipt/'}});
  throw new Error('unexpected request '+url);
 };
 const call=(path:string,body?:unknown)=>handleConnectorRequest(new Request(GIGI_RESOURCE+path,{method:body?'POST':'GET',headers:{authorization:'Bearer test-session','content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}),env,fetcher);
 return{db,calls,env,call,objects};
}
test('Instagram migration preserves Google journal restrictions and does not change existing rows',()=>{
 const f=fixture();assert.throws(()=>f.db.prepare("INSERT INTO gigi_connection_attempts(subject,provider,request_id,status,created_at) VALUES('other','instagram','bad','dispatched','now')").run());
 assert.equal(f.db.prepare('SELECT COUNT(*) n FROM gigi_instagram_connections').get()!.n,1);f.db.close();
});
test('publish validates identity/media and records verified receipt; exact replay makes no second provider POST',async()=>{
 const f=fixture();const result=await f.call('/v1/gigi/instagram/publish',input);assert.equal(result.status,200);assert.deepEqual(await result.json(),{requestId:'post-one',state:'published',mediaId:'3001',permalink:'https://www.instagram.com/p/receipt/'});
 await f.call('/v1/gigi/instagram/publish',input);
 assert.equal(f.calls.filter(c=>c.body?.endpoint?.endsWith('/media_publish')).length,1);
 assert.equal(f.calls.find(c=>c.url.startsWith('https://media.example.test/'))!.headers.has('x-api-key'),false);
 assert.equal(f.objects.size,0);assert.match(f.calls.find(c=>c.body?.endpoint?.endsWith('/media'))!.body.body.image_url,/gigi-connector.*\/media\/[a-f0-9]{64}\.jpg$/u);
 assert.equal(f.db.prepare('SELECT state FROM gigi_instagram_publishes').get()!.state,'published');
 const changed=await f.call('/v1/gigi/instagram/publish',{...input,caption:'changed'});assert.equal(changed.status,409);
 const duplicate=await f.call('/v1/gigi/instagram/publish',{...input,requestId:'another-id'});assert.equal(duplicate.status,409);f.db.close();
});
test('publish timeout is durably fenced and receipt read never republishes',async()=>{
 const f=fixture({publishTimeout:true});
 // The initial readiness read must return FINISHED; after public dispatch it is PUBLISHED.
 const response=await f.call('/v1/gigi/instagram/publish',input);
 const value=await response.json() as {state:string};
 assert.equal(value.state,'unknown');
 await f.call('/v1/gigi/instagram/publish',input);
 const receipt=await f.call('/v1/gigi/instagram/receipts/post-one');assert.equal((await receipt.json() as any).state,'published_unverified');
 assert.equal(f.calls.filter(c=>c.body?.endpoint?.endsWith('/media_publish')).length,1);f.db.close();
});
test('connection identity changes, unapproved hosts, redirects and malformed JPEG never call media creation',async()=>{
 for(const options of [{identity:'9999'},{mediaResponse:()=>new Response(null,{status:302,headers:{location:'https://127.0.0.1/'}})},{mediaResponse:()=>new Response('not an image',{headers:{'content-type':'image/jpeg'}})},{noConnection:true},{noConfig:true}]){
  const f=fixture(options);const r=await f.call('/v1/gigi/instagram/publish',input);assert.notEqual(r.status,200);assert.equal(f.calls.filter(c=>c.body?.method==='POST').length,0);f.db.close();
 }
 const f=fixture();const r=await f.call('/v1/gigi/instagram/publish',{...input,imageUrl:'https://127.0.0.1/private'});assert.notEqual(r.status,200);assert.equal(f.calls.some(c=>c.url.includes('127.0.0.1')),false);f.db.close();
});
test('publish receipt distinguishes provider acceptance from readback failure',async()=>{
 const f=fixture({mediaReadError:true});const r=await f.call('/v1/gigi/instagram/publish',input);assert.deepEqual(await r.json(),{requestId:'post-one',state:'published_unverified',mediaId:'3001'});f.db.close();
});
test('unconfigured Instagram cannot initiate consent and unconfirmed payload cannot publish',async()=>{
 const f=fixture({noConfig:true});assert.equal((await f.call('/v1/gigi/connections/instagram')).status,503);assert.equal((await f.call('/v1/gigi/connections/instagram/link',{requestId:'connect-two'})).status,503);
 assert.equal((await f.call('/v1/gigi/instagram/publish',{...input,confirmed:false})).status,400);
 assert.equal(f.calls.filter(c=>c.method==='POST').length,0);f.db.close();
});
test('JPEG and caption validators reject invalid input before execution',()=>{
 assert.deepEqual(jpegDimensions(jpeg),{width:400,height:400});assert.equal(jpegDimensions(new Uint8Array([255,216,255])),null);
 assert.throws(()=>parseInstagramPublishInput({...input,caption:'a'.repeat(2201)}));assert.throws(()=>parseInstagramPublishInput({...input,confirmed:false}));assert.throws(()=>parseInstagramPublishInput({...input,imageUrl:'http://example.com/a.jpg'}));
});
test('broker supports Instagram connection labels and rejects fake published receipts',async()=>{
 const broker=createBrokerClient({baseUrl:GIGI_RESOURCE,getAccessToken:async()=>'test',fetch:async(r)=>{
  if((r as Request).url.includes('/connections/'))return Response.json({provider:'instagram',state:'connected',connectedAccountId:'ca_artist',accountLabel:{kind:'instagram_username',value:'artist'}});
  return Response.json({requestId:'post-one',state:'published'});
 }});
 assert.equal((await broker.connectionStatus('instagram')).accountLabel!.value,'artist');await assert.rejects(broker.instagramReceipt('post-one'));
});

test('preview binds inspected bytes; changed image digest is refused before journal or publish',async()=>{
 const f=fixture();const preview=await f.call('/v1/gigi/instagram/preview',{imageUrl:input.imageUrl});assert.equal(preview.status,200);
 const v=await preview.json() as any;assert.equal(v.expectedImageSha256,input.expectedImageSha256);assert.equal(v.dataUrl,'data:image/jpeg;base64,'+Buffer.from(jpeg).toString('base64'));
 const refused=await f.call('/v1/gigi/instagram/publish',{...input,expectedImageSha256:'a'.repeat(64)});assert.equal(refused.status,409);assert.deepEqual(await refused.json(),{error:'image_changed'});assert.equal(f.objects.size,0);f.db.close();
});
test('staged media URLs expire and do not require account authentication',async()=>{
 const f=fixture(),token='a'.repeat(64),key=`instagram/${token}.jpg`;f.objects.set(key,{bytes:jpeg,customMetadata:{expiresAt:String(Date.now()+60000)}});
 const response=await handleConnectorRequest(new Request(GIGI_RESOURCE+`/v1/gigi/instagram/media/${token}.jpg`),f.env,async()=>{throw new Error('must not contact identity');});assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'private, no-store');
 f.objects.set(key,{bytes:jpeg,customMetadata:{expiresAt:'0'}});assert.equal((await handleConnectorRequest(new Request(GIGI_RESOURCE+`/v1/gigi/instagram/media/${token}.jpg`),f.env)).status,404);f.db.close();
});

test('explicit copy can retry a definitive not-published failure but does not replay its original request',async()=>{
 const f=fixture({containerFails:true});const first=await f.call('/v1/gigi/instagram/publish',input);assert.equal((await first.json() as any).state,'not_published');
 await f.call('/v1/gigi/instagram/publish',input);assert.equal(f.calls.filter(c=>c.body?.endpoint?.endsWith('/media')).length,1);
 const second=await f.call('/v1/gigi/instagram/publish',{...input,requestId:'explicit-copy'});assert.equal(second.status,200);assert.equal((await second.json() as any).state,'not_published');assert.equal(f.calls.filter(c=>c.body?.endpoint?.endsWith('/media')).length,2);f.db.close();
});

test('actual publish route rejects hostile Composio owner, toolkit, auth config, scope and disabled-account readbacks',async()=>{
 for(const accountOverride of [{user_id:'someone-else'},{toolkit:{slug:'gmail'}},{auth_config:{id:'ac_other'}},{requested_scopes:['instagram_business_basic']},{requested_scopes:['instagram_business_basic','instagram_business_content_publish','unapproved_scope']},{experimental:{account_type:'SHARED'}},{is_disabled:true}]){
  const f=fixture({accountOverride});const response=await f.call('/v1/gigi/instagram/publish',input);assert.equal(response.status,503);
  assert.equal(f.calls.some(c=>c.body?.method==='POST'),false);assert.equal(f.objects.size,0);assert.equal(f.db.prepare('SELECT COUNT(*) n FROM gigi_instagram_publishes').get()!.n,0);f.db.close();
 }
});
test('anonymous publish is denied before any account lookup or media read',async()=>{
 const f=fixture();let calls=0;const response=await handleConnectorRequest(new Request(GIGI_RESOURCE+'/v1/gigi/instagram/publish',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(input)}),f.env,async()=>{calls++;throw new Error('unexpected');});
 assert.equal(response.status,401);assert.equal(calls,0);assert.equal(f.db.prepare('SELECT COUNT(*) n FROM gigi_instagram_publishes').get()!.n,0);f.db.close();
});

test('companion rejects a preview whose bytes do not match the provided digest',async()=>{
 const broker=createBrokerClient({baseUrl:GIGI_RESOURCE,getAccessToken:async()=>'test',fetch:async()=>Response.json({imageUrl:input.imageUrl,expectedImageSha256:'a'.repeat(64),width:400,height:400,dataUrl:'data:image/jpeg;base64,'+Buffer.from(jpeg).toString('base64')})});
 await assert.rejects(broker.instagramPreview(input.imageUrl));
});

test('existing selected Instagram auth config admits only its exact five-scope snapshot without initiating consent',async()=>{
 const f=fixture({noConnection:true});
 f.env.GIGI_INSTAGRAM_AUTH_CONFIG_ID='ac_9TS_DrtjidYX';
 f.env.GIGI_INSTAGRAM_APPROVED_SCOPES='instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments,instagram_business_content_publish,instagram_business_manage_insights';
 assert.deepEqual(await (await f.call('/v1/gigi/connections/instagram')).json(),{provider:'instagram',state:'disconnected'});
 assert.equal(f.calls.filter(c=>c.method==='POST').length,0);
 f.env.GIGI_INSTAGRAM_APPROVED_SCOPES='instagram_business_basic,instagram_business_content_publish';
 assert.equal((await f.call('/v1/gigi/connections/instagram')).status,503);f.db.close();
});

test('pending container retains staging and only explicit POST reconciliation publishes',async()=>{
 const f=fixture({statuses:['IN_PROGRESS','FINISHED']});
 const first=await (await f.call('/v1/gigi/instagram/publish',input)).json() as any;
 assert.equal(first.state,'unknown');assert.equal(first.reason,'container_processing');assert.equal(f.objects.size,1);
 assert.equal(f.db.prepare('SELECT container_id FROM gigi_instagram_publishes').get()!.container_id,'2001');
 await f.call('/v1/gigi/instagram/receipts/post-one');
 assert.equal(f.calls.filter(c=>c.body?.endpoint?.endsWith('/media_publish')).length,0);
 await Promise.all([f.call('/v1/gigi/instagram/receipts/post-one',{continueConfirmed:true}),f.call('/v1/gigi/instagram/receipts/post-one',{continueConfirmed:true})]);
 assert.equal(f.calls.filter(c=>c.body?.endpoint?.endsWith('/media_publish')).length,1);
 assert.equal(f.db.prepare('SELECT state FROM gigi_instagram_publishes').get()!.state,'published');
 assert.equal(f.objects.size,0);f.db.close();
});
test('pending container expires without publication and cleans staging',async()=>{
 const f=fixture({statuses:['IN_PROGRESS']});await f.call('/v1/gigi/instagram/publish',input);
 f.db.prepare('UPDATE gigi_instagram_publishes SET staging_expires_at = 0').run();
 f.db.prepare('DELETE FROM gigi_instagram_connections').run();
 const receipt=await (await f.call('/v1/gigi/instagram/receipts/post-one',{continueConfirmed:true})).json() as any;
 assert.equal(receipt.state,'not_published');assert.equal(receipt.reason,'container_processing_expired');
 assert.equal(f.calls.filter(c=>c.body?.endpoint?.endsWith('/media_publish')).length,0);assert.equal(f.objects.size,0);f.db.close();
});

test('pending continuation requires explicit confirmation and terminal container failure never publishes',async()=>{
 const f=fixture({statuses:['IN_PROGRESS','ERROR']});await f.call('/v1/gigi/instagram/publish',input);
 for(const body of [{},{continueConfirmed:false},{continueConfirmed:true,extra:true}])assert.equal((await f.call('/v1/gigi/instagram/receipts/post-one',body)).status,400);
 assert.equal(f.calls.filter(c=>c.body?.endpoint?.endsWith('/media_publish')).length,0);
 const receipt=await (await f.call('/v1/gigi/instagram/receipts/post-one',{continueConfirmed:true})).json() as any;
 assert.equal(receipt.state,'not_published');assert.equal(receipt.reason,'container_processing_failed');assert.equal(f.objects.size,0);f.db.close();
});
test('broker uses POST only for explicitly confirmed pending continuation',async()=>{
 const calls:Request[]=[];const broker=createBrokerClient({baseUrl:GIGI_RESOURCE,getAccessToken:async()=>'test',fetch:async(r)=>{calls.push(r as Request);return Response.json({requestId:'post-one',state:'unknown',reason:'container_processing'});}});
 await broker.instagramReceipt('post-one');await broker.instagramReceipt('post-one',undefined,true);
 assert.equal(calls[0]!.method,'GET');assert.equal(calls[1]!.method,'POST');assert.deepEqual(await calls[1]!.json(),{continueConfirmed:true});
});
