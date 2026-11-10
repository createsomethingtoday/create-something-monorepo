import assert from 'node:assert/strict';
import test from 'node:test';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import { authenticate, verifyIdentityToken } from '../src/auth';
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
