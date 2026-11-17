import assert from 'node:assert/strict';
import { test } from 'node:test';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import { Webhook } from 'standardwebhooks';
import app from '../src/app';
import { createTestDatabase } from './sqlite';
import { hash, randomToken, seal } from '../src/crypto';
import { fanoutEvent, recoverDelivery, type DeliveryJob } from '../src/delivery';
import type { RuntimeEnv } from '../src/env';

const origin='https://a2a.createsomething.agency';
const resource=`${origin}/mcp`;
export async function fixture(){
  const storage=createTestDatabase();
  const {privateKey,publicKey}=await generateKeyPair('ES256');const jwk=await exportJWK(publicKey);jwk.kid='offline-fixture';
  const jobs:DeliveryJob[]=[];const received:Record<string,unknown>[]=[];const envelopes:{body:string;headers:Record<string,string>}[]=[];let callbackStatus=200;let throwQueue=false;
  const secret=`whsec_${Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64')}`;let receiverSecret=secret;
  const env={DB:storage.db,BASE_URL:origin,AUTH_RESOURCE:resource,IDENTITY_ISSUER:'https://id.createsomething.space',ENVIRONMENT:'test',AUTH_CLIENT_ID:'fixture-public-client',ALLOWED_EMAILS:'alice@example.com,bob@example.com',BUILD_REVISION:'offline-test',SESSION_KEY:randomToken(),CALLBACK_SENDER_TOKEN:randomToken(),LOCAL_TEST_JWKS:JSON.stringify({keys:[jwk]}),
    DELIVERIES:{async send(value:DeliveryJob){if(throwQueue)throw new Error('injected enqueue failure');jobs.push(value);}},
    CALLBACK_SENDER:{idFromName:()=>({}),get:()=>({async fetch(request:Request){const input=await request.json() as {url:string;body:string;headers:Record<string,string>};envelopes.push({body:input.body,headers:input.headers});const event=new Webhook(receiverSecret).verify(input.body,input.headers) as Record<string,unknown>;if(event.type==='verification')return Response.json({status:200,body:JSON.stringify({challenge:event.challenge})});received.push(event);return Response.json({status:callbackStatus,body:'{}'});}})},
    ASSETS:{async fetch(){return new Response('<html lang="en"><title>Offline asset fixture</title></html>',{headers:{'content-type':'text/html'}});}}
  } as unknown as RuntimeEnv;
  async function token(subject:string,scopes=['a2a:read','a2a:write','a2a:admin'],overrides:Record<string,unknown>={}){
    return new SignJWT({kind:'oauth_access_token',resource,scope:scopes.join(' '),email:`${subject}@example.com`,email_verified:true,...overrides}).setProtectedHeader({alg:'ES256',kid:'offline-fixture'}).setSubject(subject).setIssuer(env.IDENTITY_ISSUER).setAudience(typeof overrides.aud==='string'?overrides.aud:resource).setIssuedAt().setExpirationTime('5m').sign(privateKey);
  }
  const alice=await token('alice'),bob=await token('bob');
  async function api(path:string,bearer:string,method='GET',body?:unknown){return app.fetch(new Request(`${origin}${path}`,{method,headers:{authorization:`Bearer ${bearer}`,...(body===undefined?{}:{'content-type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})}),env);}
  async function value(path:string,bearer:string,method='GET',body?:unknown){const response=await api(path,bearer,method,body);const data=await response.json() as Record<string,any>;assert.ok(response.ok,JSON.stringify(data));return data;}
  async function rpc(bearer:string,method:string,params:unknown={}){return (await value('/mcp',bearer,'POST',{jsonrpc:'2.0',id:1,method,params}));}
  async function ownerRequest(subject:string,path:string,body:unknown,options:{origin?:string;scopes?:string[];name?:string}={}){
    const raw=randomToken(),id=await hash(raw),now=Date.now();
    const bearer=await token(subject,options.scopes??['a2a:read','a2a:write','a2a:admin'],options.name?{name:options.name}:{});
    const ciphertext=await seal(env.SESSION_KEY,JSON.stringify({access_token:bearer,expires_in:300}),`session:${id}`);
    await storage.db.prepare('INSERT INTO auth_sessions(id_hash,owner_subject,token_ciphertext,access_expires_at,expires_at,created_at) VALUES(?,?,?,?,?,?)').bind(id,subject,ciphertext,now+300000,now+86400000,now).run();
    return app.fetch(new Request(`${origin}${path}`,{method:'POST',headers:{cookie:`__Host-a2a_session=${raw}`,origin:options.origin??origin,'content-type':'application/json'},body:JSON.stringify(body)}),env);
  }
  async function flush(){while(jobs.length){const body=jobs.shift()!;let acked=false;await app.queue({messages:[{body,ack(){acked=true;},retry(){throw new Error('unexpected retry');}}]} as unknown as MessageBatch<DeliveryJob>,env);assert.ok(acked);}}
  return {env,storage,jobs,received,envelopes,secret,alice,bob,token,api,value,rpc,ownerRequest,flush,setReceiverSecret(value:string){receiverSecret=value;},setStatus(n:number){callbackStatus=n;},failEnqueue(n:boolean){throwQueue=n;}};
}
