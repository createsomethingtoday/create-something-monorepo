import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {handleConnectorRequest} from '../worker/index.ts';
const prod='https://gigi-connector.createsomething.workers.dev';
const dev='https://gigi-connector-dev.createsomething.workers.dev';
test('DEV exact host and audience cannot consume production tokens or permit public admission',async()=>{
 let providerCalls=0;
 const request=(host:string)=>new Request(host+'/v1/gigi/connections/gmail',{headers:{authorization:'Bearer synthetic'}});
 const fetcher:typeof fetch=async()=>{providerCalls++;return Response.json({sub:'test-sub',email_verified:true,resource:prod});};
 const env={GIGI_DEPLOYMENT_ENV:'dev',GIGI_ALLOWED_SUBJECTS:'test-sub'};
 assert.equal((await handleConnectorRequest(request(dev),env,fetcher)).status,403);
 assert.equal(providerCalls,1);
 assert.equal((await handleConnectorRequest(request(prod),env,fetcher)).status,400);
 assert.equal(providerCalls,1);
 assert.equal((await handleConnectorRequest(request(dev),{...env,GIGI_ALLOWED_SUBJECTS:undefined,GIGI_PUBLIC_ACCESS_ENABLED:'true'},fetcher)).status,503);
 assert.equal(providerCalls,1);
});
test('DEV callbacks are exact host, production default remains production, unknown lane fails closed',async()=>{
 assert.equal((await handleConnectorRequest(new Request(dev+'/v1/gigi/connection-callback'),{GIGI_DEPLOYMENT_ENV:'dev'})).status,200);
 assert.equal((await handleConnectorRequest(new Request(prod+'/v1/gigi/connection-callback'),{})).status,200);
 assert.equal((await handleConnectorRequest(new Request(dev+'/v1/gigi/connection-callback'),{})).status,400);
 assert.equal((await handleConnectorRequest(new Request(prod+'/health'),{GIGI_DEPLOYMENT_ENV:'typo'})).status,503);
});

test('DEV and production use distinct Composio owner identities with production compatibility',async()=>{
 const {composioUserId}=await import('../worker/index.ts');
 const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('test-sub'));
 const legacy='gigi_'+Buffer.from(hash).toString('hex').slice(0,32);
 assert.equal(await composioUserId('test-sub',{}),legacy);
 assert.equal(await composioUserId('test-sub',{GIGI_DEPLOYMENT_ENV:'production'}),legacy);
 assert.match(await composioUserId('test-sub',{GIGI_DEPLOYMENT_ENV:'dev'}),/^gigi_dev_[a-f0-9]{32}$/);
 assert.notEqual(await composioUserId('test-sub',{GIGI_DEPLOYMENT_ENV:'dev'}),legacy);
});

test('production rejects DEV audience before database or provider access',async()=>{
 const response=await handleConnectorRequest(new Request(prod+'/v1/gigi/connections/gmail',{headers:{authorization:'Bearer synthetic'}}),{GIGI_ALLOWED_SUBJECTS:'test-sub',DB:{prepare(){throw Error('must not read DB');}}},async()=>Response.json({sub:'test-sub',email_verified:true,resource:dev}));
 assert.equal(response.status,403);
});

test('DEV rejects a production Composio account even if its ID appears in its isolated database',async()=>{
 const {composioUserId}=await import('../worker/index.ts');
 const legacy=await composioUserId('test-sub',{});
 const scopes=['https://www.googleapis.com/auth/calendar','https://www.googleapis.com/auth/calendar.events'];
 const response=await handleConnectorRequest(new Request(dev+'/v1/gigi/connections/googlecalendar',{headers:{authorization:'Bearer synthetic'}}),{
  GIGI_DEPLOYMENT_ENV:'dev',GIGI_ALLOWED_SUBJECTS:'test-sub',COMPOSIO_API_KEY:'synthetic',
  GIGI_GOOGLECALENDAR_AUTH_CONFIG_ID:'ac_F0JVbnFvV3DQ',GIGI_GOOGLECALENDAR_APPROVED_SCOPES:scopes.join(','),
  DB:{prepare(){return {bind(){return {async first(){return {status:'active',connected_account_id:'ca_prod',request_id:'synthetic'};},async run(){throw Error('must not mutate');},async all(){return {results:[]};}};}};}}
 },async request=>new URL((request as Request).url).pathname==='/oauth/userinfo'?Response.json({sub:'test-sub',email_verified:true,resource:dev}):Response.json({id:'ca_prod',user_id:legacy,auth_config:{id:'ac_F0JVbnFvV3DQ'},toolkit:{slug:'googlecalendar'},experimental:{account_type:'PRIVATE'},requested_scopes:scopes,status:'ACTIVE',is_disabled:false}));
 assert.equal(response.status,200);
 assert.equal((await response.json() as {state:string}).state,'attention');
});


test('compiled lane selection rejects cross-lane local sessions before any network request',()=>{
 for(const lane of ['production','dev']){
  const script=`
   import assert from 'node:assert/strict';
   import {mkdtemp,writeFile,rm} from 'node:fs/promises';
   import {tmpdir} from 'node:os';
   import {join} from 'node:path';
   globalThis.__GIGI_BUILD_LANE__=${JSON.stringify(lane)};
   process.env.GIGI_BROKER_RESOURCE='https://attacker.invalid';
   const {getSessionAccessToken}=await import(${JSON.stringify(new URL('../src/auth.ts',import.meta.url).href)});
   const {COMPANION_RESOURCE}=await import(${JSON.stringify(new URL('../src/deployment.ts',import.meta.url).href)});
   assert.equal(COMPANION_RESOURCE,${JSON.stringify(lane==='dev'?dev:prod)});
   const root=await mkdtemp(join(tmpdir(),'gigi-lane-'));
   let calls=0;
   try {
    for(const baseUrl of [${JSON.stringify(dev)},${JSON.stringify(prod)}]){
     await writeFile(join(root,'broker-session.json'),JSON.stringify({baseUrl,clientId:'test-client',sub:'test-sub',status:'active',expiresAt:Math.floor(Date.now()/1000)+3600,accessToken:'synthetic-token'}),{mode:0o600});
     if(baseUrl===COMPANION_RESOURCE)assert.equal(await getSessionAccessToken({dataDir:root,fetch:async()=>{calls++;throw Error('unexpected');}}),'synthetic-token');
     else await assert.rejects(getSessionAccessToken({dataDir:root,fetch:async()=>{calls++;throw Error('unexpected');}}),/unsafe_session_file/);
    }
    assert.equal(calls,0);
   } finally {await rm(root,{recursive:true,force:true});}
  `;
  const result=spawnSync(process.execPath,['--import','tsx','--input-type=module','-e',script],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
 }
});
