import assert from 'node:assert/strict';
import test from 'node:test';
import {exportJWK,generateKeyPair,SignJWT} from 'jose';
import app from '../src/app';
import type {RuntimeEnv} from '../src/env';
import {createTestDatabase} from './sqlite';

test('pre-dispatch MCP auth outage gives bounded retry even for writes',async()=>{
 const storage=createTestDatabase(),original=globalThis.fetch;
 const pair=await generateKeyPair('ES256'),jwk=await exportJWK(pair.publicKey);jwk.kid='predispatch-recovery';
 const issuer='https://id.createsomething.space',resource='https://a2a.createsomething.agency/mcp';
 const env={DB:storage.db,BASE_URL:'https://a2a.createsomething.agency',AUTH_RESOURCE:resource,IDENTITY_ISSUER:issuer,ENVIRONMENT:'production',ALLOWED_EMAILS:'alice@example.com'} as RuntimeEnv;
 const bearer=await new SignJWT({kind:'oauth_access_token',resource,scope:'a2a:read a2a:write',sub:'alice',iss:issuer,aud:resource,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+300}).setProtectedHeader({alg:'ES256',kid:jwk.kid}).sign(pair.privateKey);
 try{
  // Reset cached remote key state by first returning an availability failure.
  globalThis.fetch=async()=>Response.json({},{status:503});
  await app.fetch(new Request(env.BASE_URL+'/mcp',{method:'POST',headers:{authorization:`Bearer ${bearer}`}}),env);
  globalThis.fetch=async input=>String(input).endsWith('/.well-known/jwks.json')?Response.json({keys:[jwk]}):Response.json({},{status:503});
  for(const name of ['a2a_connection_status','a2a_list_inbox','a2a_read_message','a2a_send_message','a2a_claim_message','a2a_finish_message']){
   const r=await app.fetch(new Request(env.BASE_URL+'/mcp',{method:'POST',headers:{authorization:`Bearer ${bearer}`,'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name,arguments:{}}})}),env);
   assert.equal(r.status,503,name);assert.equal(r.headers.has('www-authenticate'),false);assert.equal(r.headers.get('retry-after'),'60');
   const body:any=await r.json();assert.equal(body.recovery.action,'retry_after',name);assert.equal(body.recovery.delayMs,60000);assert.ok(body.recovery.maxAttempts>0);
  }
  assert.equal((await storage.db.prepare('SELECT COUNT(*) AS n FROM messages').first<any>()).n,0);
 }finally{globalThis.fetch=original;storage.close();}
});
