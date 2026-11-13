import { sharedAcceptance } from './shared';
/** Disposable lab only. This entrypoint is never referenced by production config. */
import identity from '../../identity-worker/src/index';
import {createSignedToken,getJWKS} from '../../identity-worker/src/services/tokens';
import a2a from '../src/app';
import {hash,randomToken,seal,unseal} from '../src/crypto';
import {context} from './transport';
interface LabEnv {IDENTITY_DB:D1Database;INBOX_DB:D1Database;LAB_KEY:string;LAB_URL:string;LAB_SCOPE:string;}
function check(value:unknown,label:string):asserts value {if(!value)throw new Error(label);}
async function authorized(request:Request,key:string){
 if(!key||key.length<43)return false;
 const a=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(request.headers.get('authorization')??'')));
 const b=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('Bearer '+key)));let diff=0;for(let i=0;i<a.length;i++)diff|=a[i]^b[i];return diff===0;
}
export default {async fetch(request:Request,env:LabEnv):Promise<Response>{
 if(env.LAB_SCOPE!=='disposable-cre2431'||!/^https:\/\/cs-a2a-lab-[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev$/.test(env.LAB_URL)||new URL(request.url).origin!==env.LAB_URL)return new Response(null,{status:403});
 if(!await authorized(request,env.LAB_KEY))return new Response(null,{status:404});
 if(request.method!=='POST'||new URL(request.url).pathname!=='/run')return new Response(null,{status:404});
 const passed:string[]=[];
 try{
  // A nonempty database is never adopted. Each run requires fresh disposable DBs.
  check((await env.IDENTITY_DB.prepare('SELECT count(*) AS n FROM users').first<{n:number}>())?.n===0,'identity_database_not_empty');
  check((await env.INBOX_DB.prepare('SELECT count(*) AS n FROM agents').first<{n:number}>())?.n===0,'inbox_database_not_empty');
  const subject='lab-'+crypto.randomUUID(),client='lab-'+crypto.randomUUID(),family='lab-'+crypto.randomUUID(),resource=env.LAB_URL+'/mcp';
  const db=env.IDENTITY_DB;
  await db.batch([
   db.prepare('INSERT INTO users(id,email,password_hash,source,email_verified) VALUES(?,?,?,?,1)').bind(subject,subject+'@example.invalid','not-a-password','io'),
   db.prepare("INSERT INTO oauth_clients(client_id,client_name,redirect_uris_json,token_endpoint_auth_method,grant_types_json,response_types_json,scope) VALUES(?,?,'[]','none','[]','[]',?)").bind(client,'Disposable lab','openid offline_access a2a:read a2a:write a2a:admin'),
   db.prepare('INSERT INTO oauth_refresh_families(family_id,client_id,user_id) VALUES(?,?,?)').bind(family,client,subject)
  ]);
  const identityEnv:any={DB:db,OAUTH_ISSUER:env.LAB_URL,ENVIRONMENT:'test'};
  const now=Math.floor(Date.now()/1000);
  const predecessor=await createSignedToken(db,{sub:subject,iss:env.LAB_URL,aud:['oauth'],iat:now,exp:now+3600,kind:'oauth_refresh_token',jti:crypto.randomUUID(),family_id:family,client_id:client,scope:'openid offline_access a2a:read a2a:write a2a:admin',resource});
  const exchange=(token:string,nonce:string,override=identityEnv)=>identity.fetch(new Request(env.LAB_URL+'/oauth/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'refresh_token',client_id:client,refresh_token:token,refresh_request_id:nonce,resource})}),override);
  const nonce=randomToken();
  const simultaneous=await Promise.all([exchange(predecessor,nonce),exchange(predecessor,nonce),exchange(predecessor,nonce)]);
  check(simultaneous.every(r=>r.status===200),'simultaneous_status');
  const bodies:any[]=await Promise.all(simultaneous.map(r=>r.json()));check(bodies.every(b=>b.refresh_token===bodies[0].refresh_token),'simultaneous_successor');passed.push('simultaneous_refresh');
  // Discard a successful response and recover exactly the same successor.
  const secondNonce=randomToken();await exchange(bodies[0].refresh_token,secondNonce);
  const recovered:any=await(await exchange(bodies[0].refresh_token,secondNonce)).json();check(typeof recovered.refresh_token==='string','lost_response_recovery');passed.push('lost_response');
  let fail=true;
  const failingDB=new Proxy(db,{get(target,key){if(key==='batch')return async(statements:D1PreparedStatement[])=>{if(fail){fail=false;throw new Error('Injected persistence failure before commit');}return target.batch(statements);};const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value;}});
  const thirdNonce=randomToken();check((await exchange(recovered.refresh_token,thirdNonce,{...identityEnv,DB:failingDB})).status===500,'persistence_failure');
  const third:any=await(await exchange(recovered.refresh_token,thirdNonce)).json();check(typeof third.refresh_token==='string','persistence_recovery');passed.push('persistence_failure_recovery');
  const fourth:any=await(await exchange(third.refresh_token,randomToken())).json();check(typeof fourth.refresh_token==='string','successive_rotation');passed.push('successive_rotation');
  const standardFamily='lab-'+crypto.randomUUID();
  await db.prepare('INSERT INTO oauth_refresh_families(family_id,client_id,user_id) VALUES(?,?,?)').bind(standardFamily,client,subject).run();
  const standardGrantId=crypto.randomUUID();
  const standardToken=await createSignedToken(db,{sub:subject,iss:env.LAB_URL,aud:['oauth'],iat:now,exp:now+3600,kind:'oauth_refresh_token',jti:standardGrantId,family_id:standardFamily,client_id:client,scope:'offline_access a2a:read',resource});
  const standardExchange=(override=identityEnv)=>identity.fetch(new Request(env.LAB_URL+'/oauth/token',{method:'POST',body:new URLSearchParams({grant_type:'refresh_token',client_id:client,refresh_token:standardToken,resource})}),override);
  fail=true;
  check((await standardExchange({...identityEnv,DB:failingDB})).status===500,'standard_audit_failure');
  check(!await db.prepare('SELECT grant_id FROM oauth_grant_consumptions WHERE grant_id=?').bind(standardGrantId).first(),'standard_predecessor_preserved');
  check((await standardExchange()).status===200,'standard_audit_recovery');passed.push('standard_audit_failure_recovery');
  check((await standardExchange()).status===400,'standard_replay_denied');
  check((await db.prepare('SELECT count(*) AS n FROM connection_renewal_audit WHERE grant_id=?').bind(standardGrantId).first<{n:number}>())?.n===1,'standard_audit_once');passed.push('standard_single_use_replay_denial');
  const sessionKey=randomToken(),raw=randomToken(),id=await hash(raw);
  const inboxEnv:any={DB:env.INBOX_DB,ENVIRONMENT:'test',BASE_URL:env.LAB_URL,AUTH_RESOURCE:resource,IDENTITY_ISSUER:env.LAB_URL,AUTH_CLIENT_ID:client,ALLOWED_EMAILS:subject+'@example.invalid',SESSION_KEY:sessionKey,LOCAL_TEST_JWKS:JSON.stringify(await getJWKS(db)),BUILD_REVISION:'cre2431-disposable',ASSETS:{fetch(){throw new Error('Assets disabled');}},DELIVERIES:{send(){throw new Error('Outgoing delivery disabled');}}};
  const sessionTokens={access_token:fourth.access_token,refresh_token:fourth.refresh_token,expires_in:900};
  await env.INBOX_DB.prepare('INSERT INTO auth_sessions(id_hash,owner_subject,token_ciphertext,access_expires_at,expires_at,created_at) VALUES(?,?,?,?,?,?)').bind(id,subject,await seal(sessionKey,JSON.stringify(sessionTokens),'session:'+id),Date.now()-1,Date.now()+3600000,Date.now()).run();
  const cookieRequest=(path='/api/v1/connection',method='GET',origin?:string)=>new Request(env.LAB_URL+path,{method,headers:{cookie:'__Host-a2a_session='+raw,...(origin?{origin}:{}),'content-type':'application/json'},...(method==='POST'?{body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'a2a_connection_status'}})}:{})});
  const temporary={identityEnv,temporary:true};
  check((await context.run(temporary,()=>a2a.fetch(cookieRequest(),inboxEnv))).status===503,'temporary_provider_failure');
  check((await env.INBOX_DB.prepare('SELECT count(*) AS n FROM auth_sessions').first<{n:number}>())?.n===1,'temporary_preserves_cookie');
  check((await context.run({identityEnv,lose:true},()=>a2a.fetch(cookieRequest(),inboxEnv))).status===503,'cookie_response_loss');
  check((await context.run({identityEnv},()=>a2a.fetch(cookieRequest(),inboxEnv))).status===200,'cookie_refresh_recovery');passed.push('temporary_provider_failure','cookie_session_lost_response_recovery');
  check((await context.run({identityEnv},()=>a2a.fetch(cookieRequest('/mcp','POST','https://evil.example'),inboxEnv))).status===403,'cookie_origin_guard');passed.push('cookie_origin_protection');
  const status=await context.run({identityEnv},()=>a2a.fetch(cookieRequest(),inboxEnv));const safe:any=await status.json();check(safe.principal.subject===subject&&safe.binding.observed==='unknown','status_contract');passed.push('authenticated_status');
  const registered=await context.run({identityEnv},()=>a2a.fetch(new Request(env.LAB_URL+'/api/v1/agents',{method:'POST',headers:{cookie:'__Host-a2a_session='+raw,origin:env.LAB_URL,'content-type':'application/json'},body:JSON.stringify({name:'Disposable synthetic inbox'})}),inboxEnv));check(registered.status===201,'synthetic_inbox_registration');
  const registeredBody:any=await registered.json();
  const inbox=await context.run({identityEnv},()=>a2a.fetch(new Request(env.LAB_URL+'/mcp',{method:'POST',headers:{cookie:'__Host-a2a_session='+raw,origin:env.LAB_URL,'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'a2a_read_inbox',arguments:{agent_id:registeredBody.agent.id}}})}),inboxEnv));
  const inboxBody:any=await inbox.json();check(inboxBody.result?.structuredContent?.messages?.length===0&&inboxBody.result?._meta?.receipt?.outcome==='confirmed','synthetic_inbox_read');passed.push('synthetic_inbox_read_receipt');
  passed.push(...await sharedAcceptance(inboxEnv,identityEnv));
  await env.INBOX_DB.prepare('UPDATE auth_sessions SET access_expires_at=0 WHERE id_hash=?').bind(id).run();
  let failSave=true;
  const failingInbox=new Proxy(env.INBOX_DB,{get(target,key){if(key==='prepare')return (sql:string)=>{const statement=target.prepare(sql);if(!sql.startsWith('UPDATE auth_sessions SET token_ciphertext='))return statement;return {bind(...args:unknown[]){const bound=statement.bind(...args);return {async run(){if(failSave){failSave=false;throw new Error('Injected cookie persistence failure');}return bound.run();}};}};};const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value;}});
  check((await context.run({identityEnv},()=>a2a.fetch(cookieRequest(),{...inboxEnv,DB:failingInbox}))).status===503,'cookie_persistence_failure');
  check((await context.run({identityEnv},()=>a2a.fetch(cookieRequest(),inboxEnv))).status===200,'cookie_persistence_recovery');passed.push('cookie_persistence_failure_recovery');
  const saved=await env.INBOX_DB.prepare('SELECT token_ciphertext FROM auth_sessions WHERE id_hash=?').bind(id).first<{token_ciphertext:string}>();check(saved,'cookie_saved');
  const activeTokens=JSON.parse(await unseal(sessionKey,saved.token_ciphertext,'session:'+id));
  await db.prepare('UPDATE oauth_refresh_families SET revoked_at=datetime(\'now\') WHERE family_id=? AND user_id=? AND client_id=?').bind(family,subject,client).run();
  check((await exchange(activeTokens.refresh_token,randomToken())).status===400,'revoked_grant_denial');passed.push('revoked_grant_denial');
  await env.INBOX_DB.prepare('UPDATE auth_sessions SET access_expires_at=0 WHERE id_hash=?').bind(id).run();
  check((await context.run({identityEnv},()=>a2a.fetch(cookieRequest(),inboxEnv))).status===401,'cookie_terminal_denial');passed.push('cookie_terminal_denial');
  const audit=await db.prepare('SELECT count(*) AS n FROM connection_renewal_audit WHERE owner_subject=? AND client_id=? AND resource=?').bind(subject,client,resource).first<{n:number}>();check((audit?.n??0)>=5,'durable_audit');passed.push('durable_renewal_audit');
  return Response.json({environment:'disposable_cloud_lab',passed,hostFaultHandling:'unproven',outgoingEffects:'disabled'},{headers:{'cache-control':'no-store'}});
 }catch(error){return Response.json({environment:'disposable_cloud_lab',passed,failed:error instanceof Error&&/^[a-z_]+$/.test(error.message)?error.message:'lab_execution_failed',hostFaultHandling:'unproven'},{status:500,headers:{'cache-control':'no-store'}});}
}};
