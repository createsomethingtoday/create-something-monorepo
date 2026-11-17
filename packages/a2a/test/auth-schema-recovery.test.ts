import assert from 'node:assert/strict';
import test from 'node:test';
import {exportJWK,generateKeyPair,SignJWT} from 'jose';
import app from '../src/app';
import type {RuntimeEnv} from '../src/env';
import {createTestDatabase} from './sqlite';

test('public userinfo schema failures retry the same bearer; terminal identity failures deny',async()=>{
 const storage=createTestDatabase(),original=globalThis.fetch;
 const issuer='https://id.createsomething.space',resource='https://a2a.createsomething.agency/mcp';
 const pair=await generateKeyPair('ES256'),jwk=await exportJWK(pair.publicKey);jwk.kid='schema-recovery';
 const env={DB:storage.db,BASE_URL:'https://a2a.createsomething.agency',AUTH_RESOURCE:resource,IDENTITY_ISSUER:issuer,ENVIRONMENT:'production',ALLOWED_EMAILS:'alice@example.com'} as RuntimeEnv;
 const token=(extra={})=>new SignJWT({kind:'oauth_access_token',resource,scope:'a2a:read a2a:write',sub:'alice',iss:issuer,aud:resource,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+300,client_id:'client',connection_id:'family',...extra}).setProtectedHeader({alg:'ES256',kid:jwk.kid}).sign(pair.privateKey);
 const bearer=await token(); const valid={sub:'alice',resource,email:'alice@example.com',email_verified:true,client_id:'client',connection_id:'family'};
 let info:unknown=valid,status=200;
 globalThis.fetch=async input=>String(input).endsWith('/.well-known/jwks.json')?Response.json({keys:[jwk]}):Response.json(info,{status});
 const request=(value=bearer,name?:string)=>app.fetch(new Request(env.BASE_URL+(name?'/mcp':'/api/v1/connection'),{headers:{authorization:`Bearer ${value}`,'content-type':'application/json'},...(name?{method:'POST',body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name,arguments:{}}})}:{})}),env);
 try{
  assert.equal((await request()).status,200);
  for(const malformed of [{},[],null,{...valid,sub:undefined},{...valid,sub:3},{...valid,resource:[]},{...valid,email_verified:'true'},{...valid,client_id:null},{...valid,connection_id:0}]){
   info=malformed;const r=await request();assert.equal(r.status,503,JSON.stringify(info));assert.equal(r.headers.has('www-authenticate'),false);assert.equal((await r.json() as any).recovery.action,'retry_after');
   info=valid;assert.equal((await request()).status,200,'same bearer recovers');
  }
  for(const denied of [{...valid,sub:'other'},{...valid,resource:'wrong'},{...valid,email_verified:false},{...valid,client_id:'wrong'},{...valid,connection_id:'wrong'}]){info=denied;assert.equal((await request()).status,401);}
  info=valid;status=401;assert.equal((await request()).status,401);status=200;assert.equal((await request(await token({exp:1}))).status,401);
 }finally{globalThis.fetch=original;storage.close();}
});
