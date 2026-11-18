import assert from 'node:assert/strict';
import test from 'node:test';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import { authRoute, authenticate, verifyIdentityToken } from '../src/auth';
import { hash, randomToken, seal } from '../src/crypto';
import type { RuntimeEnv } from '../src/env';
import { createTestDatabase } from './sqlite';

const issuer='https://id.createsomething.space';
const resource='https://a2a.createsomething.agency/mcp';
async function fixture(){
  const storage=createTestDatabase();
  const pair=await generateKeyPair('ES256');const jwk=await exportJWK(pair.publicKey);jwk.kid='auth-fixture';
  const env={DB:storage.db,ENVIRONMENT:'test',IDENTITY_ISSUER:issuer,AUTH_RESOURCE:resource,ALLOWED_EMAILS:'alice@example.com',LOCAL_TEST_JWKS:JSON.stringify({keys:[jwk]}),SESSION_KEY:randomToken(),AUTH_CLIENT_ID:'fixture-client'} as unknown as RuntimeEnv;
  async function token(overrides:Record<string,unknown>={}){
    return new SignJWT({kind:'oauth_access_token',resource,scope:'a2a:read a2a:write a2a:admin',email:'alice@example.com',email_verified:true,sub:'alice',iss:issuer,aud:resource,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+300,...overrides}).setProtectedHeader({alg:'ES256',kid:'auth-fixture'}).sign(pair.privateKey);
  }
  return{storage,env,token};
}

test('auth: signed exact-resource identity still requires verified invited owner',async()=>{
  const f=await fixture();try{
    assert.equal((await verifyIdentityToken(f.env,await f.token())).subject,'alice');
    for(const override of [{email:'mallory@example.com'},{email:'alice@example.com.evil'},{email_verified:false},{resource:'https://wrong.example/mcp'},{kind:'access_token'},{exp:Math.floor(Date.now()/1000)-10},{iss:'https://wrong.example'},{aud:'https://wrong.example/mcp'}]){
      await assert.rejects(verifyIdentityToken(f.env,await f.token(override)));
    }
    const other=await fixture();try{await assert.rejects(verifyIdentityToken(f.env,await other.token()));}finally{other.storage.close();}
  }finally{f.storage.close();}
});

test('regression: stale cookie-session reader cannot rotate an already refreshed credential',async()=>{
  const f=await fixture();const originalFetch=globalThis.fetch;
  try{
    const now=Date.now(),raw=randomToken(),id=await hash(raw);
    const old={id_hash:id,owner_subject:'alice',token_ciphertext:await seal(f.env.SESSION_KEY,JSON.stringify({access_token:await f.token(),refresh_token:'old-refresh',expires_in:3600}),`session:${id}`),access_expires_at:now-1,expires_at:now+86400000};
    const currentCipher=await seal(f.env.SESSION_KEY,JSON.stringify({access_token:await f.token(),refresh_token:'new-refresh',expires_in:3600}),`session:${id}`);
    await f.storage.db.prepare('INSERT INTO auth_sessions(id_hash,owner_subject,token_ciphertext,access_expires_at,expires_at,created_at) VALUES(?,?,?,?,?,?)').bind(id,'alice',currentCipher,now+3600000,now+86400000,now).run();
    // A concurrent reader retained the predecessor row while another request
    // rotated the credential and released its refresh lock.
    const originalPrepare=f.storage.db.prepare.bind(f.storage.db);
    f.env.DB={...f.storage.db,prepare(sql:string){
      if(sql.startsWith('SELECT * FROM auth_sessions'))return{bind(){return{async first(){return old;}}}};
      return originalPrepare(sql);
    }} as unknown as D1Database;
    let exchanges=0;globalThis.fetch=async()=>{exchanges++;return Response.json({error:'invalid_grant'},{status:400});};
    await assert.rejects(authenticate(new Request('https://a2a.createsomething.agency/app',{headers:{cookie:`__Host-a2a_session=${raw}`}}),f.env),{code:'session_refreshing'});
    assert.equal(exchanges,0,'A stale reader must not replay the already consumed refresh token.');
    assert.equal(await f.storage.db.prepare('SELECT COUNT(*) AS n FROM auth_sessions').first('n'),1,'The refreshed session must survive.');
  }finally{globalThis.fetch=originalFetch;f.storage.close();}
});

test('refresh availability failure preserves the renewable session and retries the same request id',async()=>{
 const f=await fixture();const original=globalThis.fetch;
 try{
  const now=Date.now(),raw=randomToken(),id=await hash(raw);
  await f.storage.db.prepare('INSERT INTO auth_sessions(id_hash,owner_subject,token_ciphertext,access_expires_at,expires_at,created_at) VALUES(?,?,?,?,?,?)').bind(id,'alice',await seal(f.env.SESSION_KEY,JSON.stringify({access_token:await f.token(),refresh_token:'predecessor',expires_in:3600}),`session:${id}`),now-1,now+86400000,now).run();
  const nonces:string[]=[];let calls=0;
  globalThis.fetch=async(_url,options)=>{nonces.push(new URLSearchParams(options?.body as string).get('refresh_request_id')!);if(!calls++)return Response.json({error:'server_error'},{status:503});return Response.json({access_token:await f.token(),refresh_token:'successor',expires_in:3600});};
  const request=()=>new Request('https://a2a.createsomething.agency/app',{headers:{cookie:`__Host-a2a_session=${raw}`}});
  await assert.rejects(authenticate(request(),f.env),{status:503});
  assert.equal((await authenticate(request(),f.env)).subject,'alice');
  assert.match(nonces[0],/^[A-Za-z0-9_-]{43}$/);assert.equal(nonces[0],nonces[1]);
 }finally{globalThis.fetch=original;f.storage.close();}
});

async function sessionFixture(){
 const f=await fixture();const now=Date.now(),raw=randomToken(),id=await hash(raw);
 const predecessor={access_token:await f.token(),refresh_token:'predecessor',expires_in:3600};
 const ciphertext=await seal(f.env.SESSION_KEY,JSON.stringify(predecessor),`session:${id}`);
 await f.storage.db.prepare('INSERT INTO auth_sessions(id_hash,owner_subject,token_ciphertext,access_expires_at,expires_at,created_at) VALUES(?,?,?,?,?,?)').bind(id,'alice',ciphertext,now-1,now+86400000,now).run();
 return{...f,id,ciphertext,request:()=>new Request('https://a2a.createsomething.agency/app',{headers:{cookie:`__Host-a2a_session=${raw}`}})};
}
test('timeout, rate limits, malformed response and failed persistence retain the same recoverable grant',async()=>{
 const original=globalThis.fetch;
 for(const mode of ['timeout','429','500','malformed','save-before','save-after']){
  const f=await sessionFixture();try{
   const nonces:string[]=[];let calls=0;
   const response={access_token:await f.token(),refresh_token:'successor',expires_in:3600};
   globalThis.fetch=async(_url,options)=>{
    nonces.push(new URLSearchParams(options?.body as string).get('refresh_request_id')!);
    if(!calls++){
     if(mode==='timeout')throw new DOMException('Synthetic timeout','TimeoutError');
     if(mode==='429'||mode==='500')return Response.json({error:'temporarily_unavailable'},{status:Number(mode)});
     if(mode==='malformed')return new Response('truncated-json',{status:200});
    }
    return Response.json(response);
   };
   if(mode.startsWith('save-')){
    const db=f.env.DB;let fail=true;
    f.env.DB={...db,prepare(sql:string){const stmt=db.prepare(sql);if(sql.startsWith('UPDATE auth_sessions SET token_ciphertext='))return{bind(...values:unknown[]){const bound=stmt.bind(...values);return{async run(){if(fail){fail=false;if(mode==='save-after')await bound.run();throw new Error('synthetic persistence outage');}return bound.run();}};}};return stmt;}} as D1Database;
   }
   await assert.rejects(authenticate(f.request(),f.env),{status:503},mode);
   assert.equal(await f.storage.db.prepare('SELECT COUNT(*) AS n FROM auth_sessions').first('n'),1,mode);
   assert.equal((await authenticate(f.request(),f.env)).subject,'alice',mode);
   if(mode==='save-after')assert.equal(nonces.length,1,'A committed successor must be read, never overwritten by retry.');
   else assert.equal(nonces[0],nonces[1],mode);
   const saved=await f.storage.db.prepare('SELECT access_expires_at FROM auth_sessions').first<{access_expires_at:number}>();
   assert.ok(saved!.access_expires_at<=Number(JSON.parse(Buffer.from(response.access_token.split('.')[1],'base64url').toString()).exp)*1000,'Cached response TTL cannot extend signed expiration.');
  }finally{f.storage.close();globalThis.fetch=original;}
 }
});
test('invalid_grant deletes only the owned predecessor; subject/scope changes never authenticate',async()=>{
 const original=globalThis.fetch;
 for(const mode of ['terminal','subject','scope','resource','uninvited','unverified']){
  const f=await sessionFixture();try{
   const overrides=mode==='subject'?{sub:'mallory'}:mode==='scope'?{scope:'a2a:read a2a:write a2a:admin unexpected:admin'}:mode==='resource'?{resource:'https://evil.example/mcp'}:mode==='uninvited'?{email:'mallory@example.com'}:mode==='unverified'?{email_verified:false}:{};
   globalThis.fetch=async()=>mode==='terminal'?Response.json({error:'invalid_grant'},{status:400}):Response.json({access_token:await f.token(overrides),refresh_token:'successor',expires_in:3600});
   await assert.rejects(authenticate(f.request(),f.env),{status:mode==='terminal'?401:503},mode);
   assert.equal(await f.storage.db.prepare('SELECT COUNT(*) AS n FROM auth_sessions').first('n'),mode==='terminal'?0:1,mode);
  }finally{f.storage.close();globalThis.fetch=original;}
 }
});
test('expired lease cannot overwrite, release or delete a newer lease or successor',async()=>{
 const original=globalThis.fetch;
 for(const terminal of [false,true]){
  const f=await sessionFixture();try{
   const successor=await seal(f.env.SESSION_KEY,JSON.stringify({access_token:await f.token(),refresh_token:'successor',expires_in:3600}),`session:${f.id}`);
   globalThis.fetch=async()=>{
    // Another owner acquired after lease expiry and persisted a newer generation.
    await f.storage.db.prepare("UPDATE auth_sessions SET token_ciphertext=?,access_expires_at=?,refresh_lock_token='new-owner',refresh_lock_until=? WHERE id_hash=?").bind(successor,Date.now()+3600000,Date.now()+15000,f.id).run();
    return terminal?Response.json({error:'invalid_grant'},{status:400}):Response.json({access_token:await f.token(),refresh_token:'stale-successor',expires_in:3600});
   };
   await assert.rejects(authenticate(f.request(),f.env));
   const row=await f.storage.db.prepare('SELECT * FROM auth_sessions WHERE id_hash=?').bind(f.id).first<any>();
   assert.equal(row.token_ciphertext,successor);assert.equal(row.refresh_lock_token,'new-owner');
  }finally{f.storage.close();globalThis.fetch=original;}
 }
});
test('only one concurrent session reader exchanges a generation',async()=>{
 const f=await sessionFixture();const original=globalThis.fetch;try{
  let release!:()=>void;const pending=new Promise<void>(resolve=>release=resolve);let calls=0;
  globalThis.fetch=async()=>{calls++;await pending;return Response.json({access_token:await f.token(),refresh_token:'successor',expires_in:3600});};
  const first=authenticate(f.request(),f.env);
  // Wait until first owns lease and is at the provider boundary.
  for(let n=0;n<50&&!calls;n++)await new Promise(resolve=>setTimeout(resolve,1));
  await assert.rejects(authenticate(f.request(),f.env),{status:503});release();assert.equal((await first).subject,'alice');assert.equal(calls,1);
 }finally{globalThis.fetch=original;f.storage.close();}
});

test('userinfo availability failures are 503 rather than invalid credentials',async()=>{
 const f=await fixture();const original=globalThis.fetch;try{
  const jwks=JSON.parse(f.env.LOCAL_TEST_JWKS!);delete f.env.LOCAL_TEST_JWKS;
  for(const status of [429,500]){
   globalThis.fetch=async url=>String(url).endsWith('/.well-known/jwks.json')?Response.json(jwks):Response.json({error:'synthetic_unavailable'},{status});
   await assert.rejects(verifyIdentityToken(f.env,await f.token()),{status:503});
  }
 }finally{globalThis.fetch=original;f.storage.close();}
});

test('self-service admission is explicit and connection bindings require both signed fields',async()=>{
 const f=await fixture();try{
  const token=await f.token({email:'new@example.com',connection_id:'family',client_id:'client'});
  await assert.rejects(verifyIdentityToken(f.env,token),{code:'invite_required'});
  f.env.SELF_SERVICE_ENABLED='true';
  const principal=await verifyIdentityToken(f.env,token);
  assert.equal(principal.connectionId,'family');assert.equal(principal.clientId,'client');
  for(const override of [{client_id:undefined},{connection_id:''},{connection_id:123}])await assert.rejects(verifyIdentityToken(f.env,await f.token({connection_id:'family',client_id:'client',...override})),{code:'invalid_token'});
  assert.equal((await verifyIdentityToken(f.env,await f.token())).connectionId,undefined);
  await assert.rejects(verifyIdentityToken(f.env,await f.token({email_verified:false})),{code:'invalid_token'});
 }finally{f.storage.close();}
});


test('OAuth login persists only allowlisted return destinations',async()=>{
 const f=await fixture();try{
  f.env.AUTH_CLIENT_ID='client';f.env.BASE_URL='https://a2a.createsomething.agency';
  for(const [target,expected] of [['/inboxes','/inboxes'],['/app','/app'],['https://evil.example','/app'],['//evil.example','/app']]){
   const response=await authRoute(new Request(f.env.BASE_URL+'/auth/login?returnTo='+encodeURIComponent(target)),f.env);
   assert.equal(response?.status,302);
   const rows=await f.storage.db.prepare('SELECT return_to FROM oauth_states').all<{return_to:string}>();
   assert.ok(rows.results.every(row=>row.return_to===expected));
   await f.storage.db.prepare('DELETE FROM oauth_states').run();
  }
 }finally{f.storage.close();}
});

test('self-service renewal admits verified non-pilot owners and preserves owner subject',async()=>{
 const f=await sessionFixture();const original=globalThis.fetch;
 try{
  f.env.SELF_SERVICE_ENABLED='true';
  globalThis.fetch=async()=>Response.json({access_token:await f.token({email:'new@example.com',connection_id:'family',client_id:'client'}),refresh_token:'successor',expires_in:300});
  const principal=await authenticate(f.request(),f.env);
  assert.equal(principal.authentication,'owner_session');assert.equal(principal.connectionId,'family');assert.ok(principal.accessExpiresAt!>Date.now());
  f.env.SELF_SERVICE_ENABLED='false';
  await assert.rejects(authenticate(f.request(),f.env),{code:'invite_required'});
 }finally{globalThis.fetch=original;f.storage.close();}
});
