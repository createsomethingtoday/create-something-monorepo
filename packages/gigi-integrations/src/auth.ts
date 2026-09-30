import { createHash, randomBytes } from 'node:crypto';
import { execFile } from 'node:child_process';
import { createServer, type Server } from 'node:http';
import { mkdir, lstat, rename, writeFile, chmod, readFile, open, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { Effect } from 'effect';

const execFileAsync=promisify(execFile);
const ISSUER='https://id.createsomething.space';
const RESOURCE='https://gigi-connector.createsomething.workers.dev';
const SCOPE='openid profile email mcp offline_access';
const MAX_RESPONSE=16_384;

export interface LoginOptions {
  dataDir:string;
  signal?:AbortSignal;
  openBrowser?:(url:string)=>Promise<void>|void;
  fetch?:typeof fetch;
}
export interface LoginResult { sub:string; email:string; name?:string; resource:string; expiresAt:number; }
export interface SessionAccessOptions { dataDir:string; signal?:AbortSignal; fetch?:typeof fetch; }

export class LoginError extends Error {
  constructor(readonly reason:string){super(reason);this.name='LoginError';}
}
function fail(reason:string):never{throw new LoginError(reason);}
function record(value:unknown):Record<string,unknown>{
  if(!value||typeof value!=='object'||Array.isArray(value))fail('invalid_readback');
  return value as Record<string,unknown>;
}
function exactString(value:unknown,max=4096):string{
  if(typeof value!=='string'||!value||value.length>max)fail('invalid_readback');
  return value;
}
async function jsonResponse(response:Response):Promise<Record<string,unknown>>{
  if(!response.ok)fail('provider_unavailable');
  if(!response.body)fail('invalid_readback');
  const reader=response.body.getReader();
  const chunks:Uint8Array[]=[];let size=0;
  try{
    while(true){
      const next=await reader.read();if(next.done)break;
      size+=next.value.byteLength;if(size>MAX_RESPONSE)fail('invalid_readback');
      chunks.push(next.value);
    }
  }finally{await reader.cancel().catch(()=>undefined);reader.releaseLock();}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  try{return record(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)));}catch{fail('invalid_readback');}
}
async function requestJson(request:typeof fetch,url:string,init:RequestInit,signal?:AbortSignal):Promise<Record<string,unknown>>{
  const combined=signal?AbortSignal.any([signal,AbortSignal.timeout(15_000)]):AbortSignal.timeout(15_000);
  const outcome=await Effect.runPromise(Effect.either(Effect.tryPromise({
    try:()=>request(new Request(url,{...init,redirect:'error',signal:combined})),
    catch:()=>new LoginError(signal?.aborted?'cancelled':'provider_unavailable'),
  })));
  if(outcome._tag==='Left')throw outcome.left;
  return jsonResponse(outcome.right);
}
function openDefault(url:string):Promise<void>{
  return execFileAsync('open',[url],{timeout:10_000}).then(()=>undefined,()=>fail('browser_unavailable'));
}

async function callbackServer(signal?:AbortSignal):Promise<{
  server:Server; redirectUri:string; wait:(state:string)=>Promise<string>;
}>{
  let resolveCode:(code:string)=>void=()=>undefined;
  let rejectCode:(error:Error)=>void=()=>undefined;
  const codePromise=new Promise<string>((resolve,reject)=>{resolveCode=resolve;rejectCode=reject;});
  let expectedState='';
  let redirectUri='';
  const server=createServer((req,res)=>{
    const url=new URL(req.url??'/',redirectUri||'http://127.0.0.1');
    if(req.method!=='GET'||url.pathname!=='/callback'||req.headers.host!==new URL(redirectUri).host){
      res.writeHead(404).end();return;
    }
    if(url.searchParams.get('state')!==expectedState){res.writeHead(400,{'content-type':'text/plain','cache-control':'no-store'}).end('Authorization could not be verified.');return;}
    if(url.searchParams.has('iss')&&url.searchParams.get('iss')!==ISSUER){res.writeHead(400,{'content-type':'text/plain','cache-control':'no-store'}).end('Authorization could not be verified.');return;}
    const error=url.searchParams.get('error');
    if(error){res.writeHead(200,{'content-type':'text/plain','cache-control':'no-store'}).end('GiGi sign-in was cancelled.');rejectCode(new LoginError('cancelled'));return;}
    const code=url.searchParams.get('code');
    if(!code||code.length>4096){res.writeHead(400,{'content-type':'text/plain','cache-control':'no-store'}).end('Missing authorization code.');return;}
    res.writeHead(200,{'content-type':'text/plain','cache-control':'no-store'}).end('GiGi sign-in complete. Return to the app.');
    resolveCode(code);
  });
  await new Promise<void>((resolve,reject)=>{
    server.once('error',reject);
    server.listen(0,'127.0.0.1',()=>{server.off('error',reject);resolve();});
  });
  const address=server.address();
  if(!address||typeof address==='string'){server.close();fail('loopback_unavailable');}
  redirectUri=`http://127.0.0.1:${address.port}/callback`;
  return {server,redirectUri,wait(state:string){
    expectedState=state;
    const timeout=AbortSignal.timeout(120_000);
    return new Promise<string>((resolve,reject)=>{
      const abort=()=>reject(new LoginError(signal?.aborted?'cancelled':'timeout'));
      signal?.addEventListener('abort',abort,{once:true});
      timeout.addEventListener('abort',abort,{once:true});
      codePromise.then(resolve,reject).finally(()=>{
        signal?.removeEventListener('abort',abort);
        timeout.removeEventListener('abort',abort);
      });
    });
  }};
}

async function privateSession(dataDir:string,value:Record<string,unknown>):Promise<void>{
  await mkdir(dataDir,{recursive:true,mode:0o700});
  const metadata=await lstat(dataDir);
  if(!metadata.isDirectory()||metadata.isSymbolicLink())fail('unsafe_data_directory');
  await chmod(dataDir,0o700);
  const target=join(dataDir,'broker-session.json');
  const temporary=join(dataDir,`.broker-session-${randomBytes(12).toString('hex')}.tmp`);
  try{
    await writeFile(temporary,JSON.stringify(value)+'\n',{mode:0o600,flag:'wx'});
    await rename(temporary,target);
    await chmod(target,0o600);
  }finally{await unlink(temporary).catch(()=>undefined);}
}

async function readSession(dataDir:string):Promise<Record<string,unknown>>{
  const path=join(dataDir,'broker-session.json');
  let metadata;
  try{metadata=await lstat(path);}catch{fail('reauthentication_required');}
  if(!metadata.isFile()||metadata.isSymbolicLink()||(metadata.mode&0o077)!==0||metadata.size>8_192||
    (typeof process.getuid==='function'&&metadata.uid!==process.getuid()))fail('unsafe_session_file');
  let value:unknown;
  try{value=JSON.parse(await readFile(path,'utf8'));}catch{fail('reauthentication_required');}
  const session=record(value);
  if(session.baseUrl!==RESOURCE||typeof session.clientId!=='string'||!session.clientId||typeof session.sub!=='string'||!session.sub)fail('unsafe_session_file');
  return session;
}

export async function getSessionAccessToken(options:SessionAccessOptions):Promise<string>{
  if(!options.dataDir||!options.dataDir.startsWith('/'))fail('invalid_data_directory');
  if(options.signal?.aborted)fail('cancelled');
  const session=await readSession(options.dataDir);
  if(session.status!=='active')fail('reauthentication_required');
  const now=Math.floor(Date.now()/1000);
  if(typeof session.expiresAt!=='number'||!Number.isFinite(session.expiresAt))fail('unsafe_session_file');
  if(session.expiresAt>now+60)return exactString(session.accessToken);
  const refreshToken=exactString(session.refreshToken);
  const lockPath=join(options.dataDir,'.broker-refresh.lock');
  let lock;
  try{lock=await open(lockPath,'wx',0o600);}catch{fail('refresh_in_progress');}
  try{
    const latest=await readSession(options.dataDir);
    if(latest.status!=='active')fail('reauthentication_required');
    if(typeof latest.expiresAt==='number'&&latest.expiresAt>Math.floor(Date.now()/1000)+60)return exactString(latest.accessToken);
    if(latest.refreshToken!==refreshToken)fail('reauthentication_required');
    await privateSession(options.dataDir,{...latest,status:'refresh_pending'});
    let token:Record<string,unknown>;
    try{
      token=await requestJson(options.fetch??fetch,ISSUER+'/oauth/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded',accept:'application/json'},body:new URLSearchParams({
        grant_type:'refresh_token',refresh_token:refreshToken,client_id:exactString(latest.clientId,200),resource:RESOURCE,
      })},options.signal);
    }catch{
      await privateSession(options.dataDir,{...latest,status:'refresh_unknown'});
      fail('refresh_outcome_unknown');
    }
    let accessToken:string,newRefresh:string,expiresIn:number;
    try{
      accessToken=exactString(token.access_token);
      newRefresh=exactString(token.refresh_token);
      if(token.token_type!=='Bearer'||token.resource!==RESOURCE||typeof token.expires_in!=='number'||token.expires_in<1||token.expires_in>86400)fail('invalid_token_readback');
      expiresIn=token.expires_in;
    }catch{
      await privateSession(options.dataDir,{...latest,status:'refresh_unknown'});
      fail('refresh_outcome_unknown');
    }
    await privateSession(options.dataDir,{...latest,accessToken,refreshToken:newRefresh,expiresAt:Math.floor(Date.now()/1000)+expiresIn,status:'active'});
    return accessToken;
  }finally{
    await lock?.close();
    await unlink(lockPath).catch(()=>undefined);
  }
}

export async function login(options:LoginOptions):Promise<LoginResult>{
  if(!options.dataDir||!options.dataDir.startsWith('/'))fail('invalid_data_directory');
  if(options.signal?.aborted)fail('cancelled');
  const request=options.fetch??fetch;
  const browser=options.openBrowser??openDefault;
  const server=await callbackServer(options.signal);
  try{
    const metadata=await requestJson(request,ISSUER+'/.well-known/oauth-authorization-server',{method:'GET',headers:{accept:'application/json'}},options.signal);
    if(metadata.issuer!==ISSUER||metadata.authorization_endpoint!==ISSUER+'/oauth/authorize'||metadata.token_endpoint!==ISSUER+'/oauth/token'||metadata.registration_endpoint!==ISSUER+'/oauth/register'||metadata.userinfo_endpoint!==ISSUER+'/oauth/userinfo'||
      !Array.isArray(metadata.token_endpoint_auth_methods_supported)||!metadata.token_endpoint_auth_methods_supported.includes('none')||
      !Array.isArray(metadata.code_challenge_methods_supported)||!metadata.code_challenge_methods_supported.includes('S256'))fail('identity_contract_mismatch');
    const registration=await requestJson(request,ISSUER+'/oauth/register',{method:'POST',headers:{'content-type':'application/json',accept:'application/json'},body:JSON.stringify({
      client_name:'GiGi Desktop',redirect_uris:[server.redirectUri],token_endpoint_auth_method:'none',grant_types:['authorization_code','refresh_token'],response_types:['code'],scope:SCOPE,
    })},options.signal);
    const clientId=exactString(registration.client_id,200);
    if(!Array.isArray(registration.redirect_uris)||registration.redirect_uris.length!==1||registration.redirect_uris[0]!==server.redirectUri||registration.token_endpoint_auth_method!=='none')fail('redirect_registration_mismatch');
    const verifier=randomBytes(32).toString('base64url');
    const challenge=createHash('sha256').update(verifier).digest('base64url');
    const state=randomBytes(32).toString('base64url');
    const url=new URL(ISSUER+'/oauth/authorize');
    for(const [key,value] of Object.entries({response_type:'code',client_id:clientId,redirect_uri:server.redirectUri,scope:SCOPE,resource:RESOURCE,state,code_challenge:challenge,code_challenge_method:'S256'}))url.searchParams.set(key,value);
    const codeWaiting=server.wait(state);
    const [,code]=await Promise.all([Promise.resolve(browser(url.toString())),codeWaiting]);
    const token=await requestJson(request,ISSUER+'/oauth/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded',accept:'application/json'},body:new URLSearchParams({
      grant_type:'authorization_code',code,client_id:clientId,redirect_uri:server.redirectUri,code_verifier:verifier,resource:RESOURCE,
    })},options.signal);
    const accessToken=exactString(token.access_token);
    const refreshToken=exactString(token.refresh_token);
    if(token.token_type!=='Bearer'||token.resource!==RESOURCE||typeof token.expires_in!=='number'||token.expires_in<1||token.expires_in>86400)fail('invalid_token_readback');
    const identity=await requestJson(request,ISSUER+'/oauth/userinfo',{method:'GET',headers:{authorization:`Bearer ${accessToken}`,accept:'application/json'}},options.signal);
    const sub=exactString(identity.sub,200),email=exactString(identity.email,320);
    if(identity.resource!==RESOURCE||identity.client_id!==clientId||identity.email_verified!==true)fail('identity_mismatch');
    const expiresAt=Math.floor(Date.now()/1000)+token.expires_in;
    await privateSession(options.dataDir,{baseUrl:RESOURCE,accessToken,refreshToken,clientId,sub,expiresAt,status:'active'});
    return {sub,email,name:typeof identity.name==='string'?identity.name:undefined,resource:RESOURCE,expiresAt};
  }finally{
    await new Promise<void>(resolve=>server.server.close(()=>resolve()));
  }
}
