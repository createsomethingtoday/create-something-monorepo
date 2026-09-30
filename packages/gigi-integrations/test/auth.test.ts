import assert from 'node:assert/strict';
import { mkdtemp, readFile, stat, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { login, getSessionAccessToken, LoginError } from '../src/auth.ts';

const ISSUER='https://id.createsomething.space';
const RESOURCE='https://gigi-connector.createsomething.workers.dev';

test('PKCE login binds registered redirect, resource, userinfo and private session', async () => {
  const root=await mkdtemp(join(tmpdir(),'gigi-auth-'));
  const calls:Request[]=[];
  let redirect='';
  let challenge='';
  let state='';
  let verifier='';
  const request:typeof fetch=async (input,init)=>{
    const req=new Request(input,init);calls.push(req);
    const url=new URL(req.url);
    if(url.pathname==='/.well-known/oauth-authorization-server') return Response.json({issuer:ISSUER,authorization_endpoint:ISSUER+'/oauth/authorize',token_endpoint:ISSUER+'/oauth/token',registration_endpoint:ISSUER+'/oauth/register',userinfo_endpoint:ISSUER+'/oauth/userinfo',token_endpoint_auth_methods_supported:['none'],code_challenge_methods_supported:['S256']});
    if(url.pathname==='/oauth/register'){const body=await req.json() as Record<string,unknown>;redirect=(body.redirect_uris as string[])[0]!;assert.match(String(body.scope),/offline_access/);assert.deepEqual(body.grant_types,['authorization_code','refresh_token']);return Response.json({client_id:'oauth_gigi_test',redirect_uris:[redirect],token_endpoint_auth_method:'none',scope:'openid profile email mcp offline_access'}, {status:201});}
    if(url.pathname==='/oauth/token'){const body=new URLSearchParams(await req.text());assert.equal(body.get('redirect_uri'),redirect);assert.equal(body.get('resource'),RESOURCE);verifier=body.get('code_verifier')!;assert.equal(body.get('code'),'code_123');return Response.json({access_token:'test-access-token',refresh_token:'test-refresh-token',token_type:'Bearer',expires_in:3600,scope:'openid profile email mcp offline_access',resource:RESOURCE});}
    if(url.pathname==='/oauth/userinfo'){assert.equal(req.headers.get('authorization'),'Bearer test-access-token');return Response.json({sub:'user-1',email:'gigi@example.test',email_verified:true,name:'GiGi',client_id:'oauth_gigi_test',resource:RESOURCE,scope:'openid profile email mcp'});}
    throw new Error('unexpected request '+req.url);
  };
  try{
    const result=await login({dataDir:root,fetch:request,openBrowser:async url=>{
      const opened=new URL(url);challenge=opened.searchParams.get('code_challenge')!;state=opened.searchParams.get('state')!;
      assert.equal(opened.origin,ISSUER);assert.equal(opened.searchParams.get('redirect_uri'),redirect);
      assert.equal(opened.searchParams.get('resource'),RESOURCE);
      assert.equal(opened.searchParams.get('code_challenge_method'),'S256');
      const callback=new URL(redirect);callback.searchParams.set('code','code_123');callback.searchParams.set('state',state);
      const response=await fetch(callback);assert.equal(response.status,200);
    }});
    assert.equal(result.sub,'user-1');assert.equal(result.email,'gigi@example.test');
    const session=JSON.parse(await readFile(join(root,'broker-session.json'),'utf8'));
    assert.equal(session.baseUrl,RESOURCE);assert.equal(session.accessToken,'test-access-token');
    assert.equal(session.refreshToken,'test-refresh-token');
    assert.equal((await stat(join(root,'broker-session.json'))).mode & 0o777,0o600);
    const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier));
    assert.equal(challenge,Buffer.from(digest).toString('base64url'));
    assert.ok(state.length>=32);
    assert.equal(calls.length,4);
  }finally{await rm(root,{recursive:true,force:true});}
});

test('redirect registration mismatch fails before browser launch and writes no session', async()=>{
  const root=await mkdtemp(join(tmpdir(),'gigi-auth-'));
  let opened=false;
  const request:typeof fetch=async(input,init)=>{
    const req=new Request(input,init);const path=new URL(req.url).pathname;
    if(path==='/.well-known/oauth-authorization-server')return Response.json({issuer:ISSUER,authorization_endpoint:ISSUER+'/oauth/authorize',token_endpoint:ISSUER+'/oauth/token',registration_endpoint:ISSUER+'/oauth/register',userinfo_endpoint:ISSUER+'/oauth/userinfo',token_endpoint_auth_methods_supported:['none'],code_challenge_methods_supported:['S256']});
    if(path==='/oauth/register')return Response.json({client_id:'oauth_test',redirect_uris:['http://127.0.0.1:9999/callback'],token_endpoint_auth_method:'none'}, {status:201});
    throw new Error('unexpected request');
  };
  try{
    await assert.rejects(login({dataDir:root,fetch:request,openBrowser:()=>{opened=true}}),/redirect_registration_mismatch/);
    assert.equal(opened,false);
    await assert.rejects(stat(join(root,'broker-session.json')),{code:'ENOENT'});
  }finally{await rm(root,{recursive:true,force:true});}
});

test('wrong callback state is denied and cancellation closes loopback', async()=>{
  const root=await mkdtemp(join(tmpdir(),'gigi-auth-'));
  const controller=new AbortController();
  let redirect='';
  const request:typeof fetch=async(input,init)=>{
    const req=new Request(input,init);const path=new URL(req.url).pathname;
    if(path==='/.well-known/oauth-authorization-server')return Response.json({issuer:ISSUER,authorization_endpoint:ISSUER+'/oauth/authorize',token_endpoint:ISSUER+'/oauth/token',registration_endpoint:ISSUER+'/oauth/register',userinfo_endpoint:ISSUER+'/oauth/userinfo',token_endpoint_auth_methods_supported:['none'],code_challenge_methods_supported:['S256']});
    if(path==='/oauth/register'){redirect=((await req.json()) as {redirect_uris:string[]}).redirect_uris[0]!;return Response.json({client_id:'oauth_test',redirect_uris:[redirect],token_endpoint_auth_method:'none'},{status:201});}
    throw new Error('token must not be requested');
  };
  try{
    await assert.rejects(login({dataDir:root,fetch:request,signal:controller.signal,openBrowser:async()=>{
      const wrong=new URL(redirect);wrong.searchParams.set('state','wrong');wrong.searchParams.set('code','stolen');
      assert.equal((await fetch(wrong)).status,400);
      controller.abort();
    }}),/cancelled/);
    await assert.rejects(stat(join(root,'broker-session.json')),{code:'ENOENT'});
    await assert.rejects(fetch(redirect));
  }finally{await rm(root,{recursive:true,force:true});}
});

test('refresh rotates once and unknown response blocks replay',async()=>{
  const root=await mkdtemp(join(tmpdir(),'gigi-auth-'));
  const path=join(root,'broker-session.json');
  const initial={baseUrl:RESOURCE,accessToken:'expired',refreshToken:'refresh-a',clientId:'oauth_test',sub:'user-1',expiresAt:1,status:'active'};
  try{
    await writeFile(path,JSON.stringify(initial),{mode:0o600});
    let attempts=0;
    const success:typeof fetch=async(input,init)=>{const req=new Request(input,init);attempts++;const form=new URLSearchParams(await req.text());assert.equal(form.get('refresh_token'),'refresh-a');assert.equal(form.get('resource'),RESOURCE);return Response.json({access_token:'new-access',refresh_token:'refresh-b',token_type:'Bearer',resource:RESOURCE,expires_in:3600,scope:'openid profile email mcp offline_access'});};
    assert.equal(await getSessionAccessToken({dataDir:root,fetch:success}),'new-access');
    assert.equal(attempts,1);
    const rotated=JSON.parse(await readFile(path,'utf8'));assert.equal(rotated.refreshToken,'refresh-b');assert.equal(rotated.status,'active');
    assert.equal(await getSessionAccessToken({dataDir:root,fetch:success}),'new-access');assert.equal(attempts,1);
    await writeFile(path,JSON.stringify(initial),{mode:0o600});
    const uncertain:typeof fetch=async()=>{attempts++;throw new Error('network lost after submit')};
    await assert.rejects(getSessionAccessToken({dataDir:root,fetch:uncertain}),/refresh_outcome_unknown/);
    assert.equal(JSON.parse(await readFile(path,'utf8')).status,'refresh_unknown');
    await assert.rejects(getSessionAccessToken({dataDir:root,fetch:uncertain}),/reauthentication_required/);
    assert.equal(attempts,2);
  }finally{await rm(root,{recursive:true,force:true});}
});

test('cancelled provider request preserves typed nonsecret login reason',async()=>{
  const root=await mkdtemp(join(tmpdir(),'gigi-auth-'));
  const controller=new AbortController();controller.abort();
  try{
    await assert.rejects(login({dataDir:root,signal:controller.signal,fetch:async()=>{throw new Error('secret transport detail')}}),error=>{
      assert.ok(error instanceof LoginError);
      assert.equal(error.reason,'cancelled');
      assert.equal(error.message,'cancelled');
      return true;
    });
    const transport:typeof fetch=async()=>{throw new Error('secret transport detail')};
    await assert.rejects(login({dataDir:root,fetch:transport}),error=>{
      assert.ok(error instanceof LoginError);
      assert.equal(error.reason,'provider_unavailable');
      assert.equal(error.message,'provider_unavailable');
      return true;
    });
  }finally{await rm(root,{recursive:true,force:true});}
});
