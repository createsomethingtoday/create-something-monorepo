import { decodeJwt, createLocalJWKSet, createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import type { Principal } from './domain-types';
import type { RuntimeEnv } from './env';
import { ADMIN_SCOPE, READ_SCOPE, WRITE_SCOPE } from './env';
import { hash, randomToken, refreshRequestId, seal, unseal } from './crypto';
import { HttpError, json } from './http';

const productionIssuer='https://id.createsomething.space';
const publicKeys=createRemoteJWKSet(new URL(`${productionIssuer}/.well-known/jwks.json`),{timeoutDuration:5000});
const sessionCookie='__Host-a2a_session';
const stateCookie='__Host-a2a_oauth';
const sessionTtl=7*86400000;
interface Tokens {access_token:string;refresh_token?:string;expires_in:number;}
interface SessionRow {id_hash:string;owner_subject:string;token_ciphertext:string;access_expires_at:number;expires_at:number;}

export function cookie(request:Request,name:string):string|undefined {
  return request.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(`${name}=`))?.slice(name.length+1);
}
function cookieValue(name:string,value:string,maxAge:number):string {
  return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}
export function requireScope(principal:Principal,scope:string):void {
  if(!principal.scopes.includes(scope))throw new HttpError('insufficient_scope',403,`This action requires ${scope}.`);
}
function admission(env:RuntimeEnv,principal:Principal):void {
  const allowed=env.ALLOWED_EMAILS.split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
  if(!principal.email||!allowed.includes(principal.email.toLowerCase()))throw new HttpError('invite_required',403,'This pilot is available to invited owners.');
}
export async function verifyIdentityToken(env:RuntimeEnv,token:string):Promise<Principal> {
  if(env.ENVIRONMENT==='production'&&env.IDENTITY_ISSUER!==productionIssuer)throw new HttpError('auth_configuration',503,'Identity configuration is unavailable.');
  let payload:JWTPayload;
  try {
    const resolver=env.ENVIRONMENT==='test'&&env.LOCAL_TEST_JWKS
      ?createLocalJWKSet(JSON.parse(env.LOCAL_TEST_JWKS)):publicKeys;
    ({payload}=await jwtVerify(token,resolver,{issuer:env.IDENTITY_ISSUER,audience:env.AUTH_RESOURCE,algorithms:['ES256'],requiredClaims:['sub','exp','iat']}));
  } catch {throw new HttpError('invalid_token',401,'Sign in with CREATE SOMETHING Identity.');}
  if(payload.kind!=='oauth_access_token'||payload.resource!==env.AUTH_RESOURCE||typeof payload.scope!=='string')throw new HttpError('invalid_token',401,'An access token for this service is required.');
  let renewal:Principal['renewal'];
  let email:string|undefined;let displayName:string|undefined;
  const name=(value:unknown)=>typeof value==='string'&&value.trim().length>0&&value.trim().length<=80&&!/[\u0000-\u001f\u007f]/.test(value)?value.trim():undefined;
  if(env.ENVIRONMENT==='test'&&env.LOCAL_TEST_JWKS){
    if(payload.email_verified!==true)throw new HttpError('invalid_token',401,'Verified identity required.');
    email=typeof payload.email==='string'?payload.email:undefined;
    displayName=name(payload.name);
  }else{
    let response:Response;
    try{response=await fetch(`${productionIssuer}/oauth/userinfo`,{headers:{authorization:`Bearer ${token}`},redirect:'manual',signal:AbortSignal.timeout(5000)});}catch{throw new HttpError('identity_unavailable',503,'Identity verification is temporarily unavailable.');}
    if(response.status===429||response.status>=500)throw new HttpError('identity_unavailable',503,'Identity verification is temporarily unavailable.');
    if(!response.ok)throw new HttpError('invalid_token',401,'Your Identity session is no longer available.');
    let info:Record<string,unknown>;
    try{info=await response.json() as Record<string,unknown>;if(!info||typeof info!=='object')throw new Error();}catch{throw new HttpError('identity_unavailable',503,'Identity verification is temporarily unavailable.');}
    if(info.sub!==payload.sub||info.resource!==env.AUTH_RESOURCE||info.email_verified!==true)throw new HttpError('invalid_token',401,'Verified resource identity required.');
    email=typeof info.email==='string'?info.email:undefined;
    displayName=name(info.name);
    const facts=info.renewal as Record<string,unknown>|undefined;
    if(facts&&[facts.lastCommittedAt,facts.lastRecoveredAt].every(x=>x===null||typeof x==='number'&&Number.isSafeInteger(x)&&x>=0)&&typeof facts.recoveryResponsesPrepared==='number'&&Number.isSafeInteger(facts.recoveryResponsesPrepared)&&facts.recoveryResponsesPrepared>=0)renewal={lastCommittedAt:facts.lastCommittedAt as number|null,lastRecoveredAt:facts.lastRecoveredAt as number|null,recoveryResponsesPrepared:facts.recoveryResponsesPrepared};
  }
  const principal={renewal,subject:payload.sub!,email,displayName,scopes:payload.scope.split(/\s+/),admin:payload.scope.split(/\s+/).includes(ADMIN_SCOPE)};
  admission(env,principal);return principal;
}
export async function authenticate(request:Request,env:RuntimeEnv):Promise<Principal> {
  const header=request.headers.get('authorization');
  if(header){const token=header.match(/^Bearer\s+(\S+)$/i)?.[1];if(!token)throw new HttpError('invalid_token',401,'Bearer token required.');return {...await verifyIdentityToken(env,token),authentication:'bearer'};}
  const raw=cookie(request,sessionCookie);if(!raw)throw new HttpError('authentication_required',401,'Sign in to open your inbox.');
  const id=await hash(raw);const now=Date.now();
  const row=await env.DB.prepare('SELECT * FROM auth_sessions WHERE id_hash=? AND expires_at>?').bind(id,now).first<SessionRow>();
  if(!row)throw new HttpError('authentication_required',401,'Sign in again to continue.');
  let tokens=JSON.parse(await unseal(env.SESSION_KEY,row.token_ciphertext,`session:${id}`)) as Tokens;
  if(row.access_expires_at<now+60000){
    const fence=randomToken();
    const lease=await env.DB.prepare('UPDATE auth_sessions SET refresh_lock_until=?,refresh_lock_token=? WHERE id_hash=? AND token_ciphertext=? AND (refresh_lock_until IS NULL OR refresh_lock_until<?)').bind(now+15000,fence,id,row.token_ciphertext,now).run();
    if(!lease.meta.changes)throw new HttpError('session_refreshing',503,'Your session is refreshing. Try again shortly.');
    try{
      if(!tokens.refresh_token)throw new HttpError('session_expired',401,'Sign in again to continue.');
      const previous=tokens;
      const replacement=await exchangeTokens(env,{grant_type:'refresh_token',refresh_token:previous.refresh_token!,refresh_request_id:await refreshRequestId(env.SESSION_KEY,id,previous.refresh_token!),client_id:env.AUTH_CLIENT_ID,resource:env.AUTH_RESOURCE});
      // The old JWT is authenticated by encrypted session storage. Its expired
      // scope remains the upper bound; the replacement must verify independently.
      const previousScope=decodeJwt(previous.access_token).scope;
      const principal=await verifyIdentityToken(env,replacement.access_token);
      if(principal.subject!==row.owner_subject||typeof previousScope!=='string'||principal.scopes.some(scope=>!previousScope.split(/\s+/).includes(scope))||!replacement.refresh_token)throw new HttpError('refresh_invalid_response',503,'Identity renewal is temporarily unavailable.');
      const saved=await env.DB.prepare('UPDATE auth_sessions SET token_ciphertext=?,access_expires_at=?,refresh_lock_until=NULL,refresh_lock_token=NULL WHERE id_hash=? AND token_ciphertext=? AND refresh_lock_token=? AND refresh_lock_until>?').bind(await seal(env.SESSION_KEY,JSON.stringify(replacement),`session:${id}`),Math.min(Date.now()+replacement.expires_in*1000,Number(decodeJwt(replacement.access_token).exp)*1000),id,row.token_ciphertext,fence,Date.now()).run();
      if(!saved.meta.changes)throw new HttpError('session_refreshing',503,'Your session is refreshing. Try again shortly.');
      tokens=replacement;
    }catch(error){
      // A lease that expired or a stale predecessor can never delete a successor.
      if(error instanceof HttpError&&error.status===401&&error.code==='session_expired'){
        await env.DB.prepare('DELETE FROM auth_sessions WHERE id_hash=? AND token_ciphertext=? AND refresh_lock_token=? AND refresh_lock_until>?').bind(id,row.token_ciphertext,fence,Date.now()).run();
        throw error;
      }
      try{await env.DB.prepare('UPDATE auth_sessions SET refresh_lock_until=NULL,refresh_lock_token=NULL WHERE id_hash=? AND token_ciphertext=? AND refresh_lock_token=?').bind(id,row.token_ciphertext,fence).run();}catch{/* Lease expiry permits a fenced retry if storage is unavailable. */}
      throw new HttpError('identity_unavailable',503,'Identity renewal is temporarily unavailable. Try again shortly.');
    }
  }
  const principal=await verifyIdentityToken(env,tokens.access_token);
  if(principal.subject!==row.owner_subject)throw new HttpError('invalid_session',401,'Sign in again to continue.');
  return {...principal,authentication:'owner_session'};
}
async function exchangeTokens(env:RuntimeEnv,fields:Record<string,string>):Promise<Tokens> {
  let response:Response;
  try{response=await fetch(`${productionIssuer}/oauth/token`,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams(fields),redirect:'manual',signal:AbortSignal.timeout(10000)});}catch{throw new HttpError('identity_unavailable',503,'Identity renewal is temporarily unavailable.');}
  let tokens:Partial<Tokens>&{error?:string};
  try{tokens=await response.json() as typeof tokens;if(!tokens||typeof tokens!=='object')throw new Error();}catch{throw new HttpError('identity_unavailable',503,'Identity returned an incomplete response.');}
  if(!response.ok){
    if(response.status===400&&tokens.error==='invalid_grant')throw new HttpError('session_expired',401,'Sign in again to continue.');
    throw new HttpError('identity_unavailable',503,'Identity renewal is temporarily unavailable.');
  }
  if(typeof tokens.access_token!=='string'||!tokens.access_token||typeof tokens.expires_in!=='number'||!Number.isFinite(tokens.expires_in)||tokens.expires_in<=0||tokens.expires_in>86400||(tokens.refresh_token!==undefined&&(typeof tokens.refresh_token!=='string'||!tokens.refresh_token)))throw new HttpError('identity_unavailable',503,'Identity returned an incomplete response.');
  return tokens as Tokens;
}
export async function authRoute(request:Request,env:RuntimeEnv):Promise<Response|null> {
  const url=new URL(request.url);const now=Date.now();
  if(url.pathname==='/auth/login'&&request.method==='GET'){
    if(!env.AUTH_CLIENT_ID||env.AUTH_CLIENT_ID==='pending-registration')throw new HttpError('auth_unavailable',503,'Owner sign-in is being configured.');
    await limitAdmission(env,`login:${await hash(request.headers.get('cf-connecting-ip')??'local')}`,20,600000);
    const state=randomToken();const stateId=await hash(state);const verifier=randomToken();
    await env.DB.prepare('INSERT INTO oauth_states(id_hash,verifier_ciphertext,return_to,expires_at) VALUES(?,?,?,?)').bind(stateId,await seal(env.SESSION_KEY,verifier,`oauth:${stateId}`),'/app',now+600000).run();
    const auth=new URL(`${productionIssuer}/oauth/authorize`);
    auth.search=new URLSearchParams({response_type:'code',client_id:env.AUTH_CLIENT_ID,redirect_uri:`${env.BASE_URL}/auth/callback`,scope:`openid email profile offline_access mcp ${READ_SCOPE} ${WRITE_SCOPE} ${ADMIN_SCOPE}`,resource:env.AUTH_RESOURCE,state,code_challenge:await hash(verifier),code_challenge_method:'S256'}).toString();
    return new Response(null,{status:302,headers:{location:auth.href,'set-cookie':cookieValue(stateCookie,state,600),'cache-control':'no-store'}});
  }
  if(url.pathname==='/auth/callback'&&request.method==='GET'){
    const state=url.searchParams.get('state');const code=url.searchParams.get('code');
    if(!state||state!==cookie(request,stateCookie)||!code)throw new HttpError('invalid_oauth_state',400,'Sign-in expired. Start again from the owner console.');
    const id=await hash(state);
    const record=await env.DB.prepare('DELETE FROM oauth_states WHERE id_hash=? AND expires_at>? RETURNING verifier_ciphertext,return_to').bind(id,now).first<{verifier_ciphertext:string;return_to:string}>();
    if(!record)throw new HttpError('invalid_oauth_state',400,'Sign-in expired. Start again from the owner console.');
    const verifier=await unseal(env.SESSION_KEY,record.verifier_ciphertext,`oauth:${id}`);
    const tokens=await exchangeTokens(env,{grant_type:'authorization_code',code,client_id:env.AUTH_CLIENT_ID,redirect_uri:`${env.BASE_URL}/auth/callback`,resource:env.AUTH_RESOURCE,code_verifier:verifier});
    const principal=await verifyIdentityToken(env,tokens.access_token);
    const session=randomToken();const sessionId=await hash(session);
    await env.DB.prepare('INSERT INTO auth_sessions(id_hash,owner_subject,token_ciphertext,access_expires_at,expires_at,created_at) VALUES(?,?,?,?,?,?)').bind(sessionId,principal.subject,await seal(env.SESSION_KEY,JSON.stringify(tokens),`session:${sessionId}`),now+tokens.expires_in*1000,now+sessionTtl,now).run();
    const headers=new Headers({location:`${env.BASE_URL}/app`,'cache-control':'no-store'});headers.append('set-cookie',cookieValue(sessionCookie,session,sessionTtl/1000));headers.append('set-cookie',cookieValue(stateCookie,'',0));
    return new Response(null,{status:302,headers});
  }
  if(url.pathname==='/auth/logout'&&request.method==='POST'){
    if(request.headers.get('origin')!==new URL(env.BASE_URL).origin)throw new HttpError('origin_denied',403,'Use the owner console to sign out.');
    const value=cookie(request,sessionCookie);if(value)await env.DB.prepare('DELETE FROM auth_sessions WHERE id_hash=?').bind(await hash(value)).run();
    return json({signedOut:true},200,{'set-cookie':cookieValue(sessionCookie,'',0)});
  }
  return null;
}
export async function limitAdmission(env:RuntimeEnv,key:string,limit:number,windowMs:number):Promise<void>{
  const start=Math.floor(Date.now()/windowMs)*windowMs;
  const row=await env.DB.prepare('INSERT INTO admission_buckets(bucket_key,count,expires_at) VALUES(?,1,?) ON CONFLICT(bucket_key) DO UPDATE SET count=count+1 RETURNING count').bind(`${key}:${start}`,start+windowMs).first<{count:number}>();
  if(!row||row.count>limit)throw new HttpError('rate_limited',429,'Too many requests. Try again shortly.');
}
