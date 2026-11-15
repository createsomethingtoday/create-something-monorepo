import assert from 'node:assert/strict';
import test from 'node:test';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import app from '../src/app';
import type { RuntimeEnv } from '../src/env';
import { createTestDatabase } from './sqlite';

test('bearer JWKS outages are retryable without a sign-in challenge and the same token recovers',async()=>{
 const storage=createTestDatabase(),original=globalThis.fetch;
 const issuer='https://id.createsomething.space',resource='https://a2a.createsomething.agency/mcp';
 const env={DB:storage.db,BASE_URL:'https://a2a.createsomething.agency',AUTH_RESOURCE:resource,IDENTITY_ISSUER:issuer,ENVIRONMENT:'production',ALLOWED_EMAILS:'alice@example.com'} as RuntimeEnv;
 const pair=await generateKeyPair('ES256'),jwk=await exportJWK(pair.publicKey);jwk.kid='availability';
 const token=async(overrides:Record<string,unknown>={},key=pair.privateKey,kid='availability')=>new SignJWT({kind:'oauth_access_token',resource,scope:'a2a:read',sub:'alice',iss:issuer,aud:resource,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+300,...overrides}).setProtectedHeader({alg:'ES256',kid}).sign(key);
 const bearer=await token();
 const request=(value=bearer)=>app.fetch(new Request(env.BASE_URL+'/api/v1/connection',{headers:{authorization:`Bearer ${value}`}}),env);
 try{
  for(const mode of ['network','timeout','429','503','json','keyset','missing-key-type','missing-key-curve','invalid-key']){
   globalThis.fetch=async()=>{
    if(mode==='network')throw new TypeError('fetch failed');
    if(mode==='timeout')throw new DOMException('timeout','TimeoutError');
    if(mode==='429'||mode==='503')return Response.json({}, {status:Number(mode)});
    if(mode==='missing-key-type')return Response.json({keys:[{kid:'availability',x:'bad',y:'bad'}]});
    if(mode==='missing-key-curve')return Response.json({keys:[{kty:'EC',kid:'availability',x:'bad',y:'bad'}]});
    if(mode==='invalid-key')return Response.json({keys:[{kty:'EC',crv:'P-256',kid:'availability',x:'bad',y:'bad'}]});
    return mode==='json'?new Response('{'):Response.json({keys:'bad'});
   };
   const response=await request();assert.equal(response.status,503,mode);
   assert.equal(response.headers.get('www-authenticate'),null,mode);assert.equal(response.headers.get('retry-after'),'60',mode);
  }
  globalThis.fetch=async(url,options)=>{
   assert.equal(options?.redirect,'manual');
   return String(url).endsWith('/.well-known/jwks.json')?Response.json({keys:[jwk]}):Response.json({sub:'alice',resource,email:'alice@example.com',email_verified:true});
  };
  assert.equal((await request()).status,200,'same bearer recovers without reconsent');
  const other=await generateKeyPair('ES256');
  for(const value of [await token({},other.privateKey),await token({},pair.privateKey,'unknown-key'),await token({exp:1}),await token({resource:'https://wrong.example/mcp'}),await token({aud:'https://wrong.example/mcp'})]){
   const response=await request(value);assert.equal(response.status,401);assert.ok(response.headers.has('www-authenticate'));
  }
 }finally{globalThis.fetch=original;storage.close();}
});
