import assert from 'node:assert/strict';
import test from 'node:test';
import worker from '../src/index';
import { createSignedToken } from '../src/services/tokens';
import { createTestDatabase } from './sqlite';
const resource='https://a2a.createsomething.agency/mcp';
async function fixture(storage=createTestDatabase(),dispatch?:(request:Request)=>Promise<Response>){
const db=storage.db;
 await db.prepare("INSERT INTO users(id,email,password_hash,source,email_verified) VALUES('alice','alice@example.com','fixture','io',1)").run();
 await db.prepare("INSERT INTO oauth_clients(client_id,client_name,redirect_uris_json,token_endpoint_auth_method,grant_types_json,response_types_json,scope) VALUES('client','fixture','[]','none','[]','[]','openid offline_access a2a:read')").run();
 await db.prepare("INSERT INTO oauth_refresh_families(family_id,client_id,user_id) VALUES('family','client','alice')").run();
 const env:any={DB:db,OAUTH_ISSUER:'https://id.createsomething.space'};
 const token=await createSignedToken(db,{sub:'alice',iss:env.OAUTH_ISSUER,aud:['oauth'],iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600,kind:'oauth_refresh_token',jti:'predecessor',family_id:'family',client_id:'client',scope:'openid offline_access a2a:read',resource});
 const exchange=(refresh=token,nonce='a'.repeat(43),extra:Record<string,string>={})=>{
  const request=new Request(env.OAUTH_ISSUER+'/oauth/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'refresh_token',client_id:'client',refresh_token:refresh,resource,...(nonce?{refresh_request_id:nonce}:{}),...extra})});
  return dispatch?dispatch(request):worker.fetch(request,env);
 };
 return{storage,env,token,exchange};
}
test('refresh response loss retries return identical successor without revoking the family',async()=>{
 const f=await fixture();try{const a=await f.exchange();assert.equal(a.status,200);const first=await a.json();const b=await f.exchange();assert.equal(b.status,200);assert.deepEqual(await b.json(),first);assert.equal((await f.exchange((first as any).refresh_token,'b'.repeat(43))).status,200);}finally{f.storage.close();}
});

test('concurrent identical retries commit one successor; different nonce revokes family',async()=>{
 const f=await fixture();try{
  const responses=await Promise.all([f.exchange(),f.exchange(),f.exchange()]);assert.ok(responses.every(r=>r.status===200));
  const bodies=await Promise.all(responses.map(r=>r.json()));assert.deepEqual(bodies[0],bodies[1]);assert.deepEqual(bodies[1],bodies[2]);
  const recovery=await f.env.DB.prepare('SELECT * FROM oauth_refresh_recoveries').first();assert.ok(!JSON.stringify(recovery).includes(f.token));assert.ok(!JSON.stringify(recovery).includes((bodies[0] as any).refresh_token));
  assert.equal((await f.exchange(f.token,'z'.repeat(43))).status,400);
  assert.equal((await f.exchange((bodies[0] as any).refresh_token,'b'.repeat(43))).status,400);
 }finally{f.storage.close();}
});
test('recovery expiry and terminal revocation never restore a credential',async()=>{
 for(const mode of ['expiry','family','user']){const f=await fixture();try{
  assert.equal((await f.exchange()).status,200);
  await f.env.DB.prepare(mode==='expiry'?'UPDATE oauth_refresh_recoveries SET recover_until=0':mode==='family'?"UPDATE oauth_refresh_families SET revoked_at=datetime('now')":"UPDATE users SET deleted_at=datetime('now')").run();
  assert.equal((await f.exchange()).status,400);
 }finally{f.storage.close();}}
});
test('cached predecessor cannot resurrect an already rotated successor',async()=>{
 const f=await fixture();try{const first:any=await(await f.exchange()).json();assert.equal((await f.exchange(first.refresh_token,'b'.repeat(43))).status,200);assert.equal((await f.exchange()).status,400);assert.equal((await f.env.DB.prepare('SELECT revoked_at FROM oauth_refresh_families').first()).revoked_at,null);}finally{f.storage.close();}
});
test('request scopes/resources cannot expand claims; legacy grants remain single-use',async()=>{
 const f=await fixture();try{
  assert.equal((await f.exchange(f.token,'a'.repeat(43),{scope:'a2a:admin'})).status,400);
  assert.equal((await f.exchange(f.token,'a'.repeat(43),{resource:'https://evil.example/mcp'})).status,400);
  assert.equal((await f.exchange(f.token,'short')).status,400);
  assert.equal((await f.exchange(f.token,'')).status,200);assert.equal((await f.exchange(f.token,'')).status,400);
 }finally{f.storage.close();}
});
test('signing failure and atomic persistence failure do not burn an opted-in grant',async()=>{
 for(const mode of ['sign','batch','uncertain']){const f=await fixture();try{
  const original=f.env.DB;let fail=true;
  f.env.DB={...original,prepare(sql:string){if(mode==='sign'&&sql.startsWith('SELECT * FROM signing_keys')&&fail){fail=false;throw new Error('synthetic signing outage');}return original.prepare(sql);},async batch(statements:any[]){if(fail){fail=false;if(mode==='uncertain')await original.batch(statements);throw new Error('synthetic database outage');}return original.batch(statements);}};
  assert.equal((await f.exchange()).status,500);
  assert.equal((await f.exchange()).status,200);
  assert.equal(await original.prepare('SELECT COUNT(*) AS n FROM oauth_grant_consumptions').first('n'),1);
 }finally{f.storage.close();}}
});

test('near-expiry recovery cannot block legacy tombstone cleanup with foreign keys enabled',async()=>{
 const f=await fixture();try{
  assert.equal((await f.exchange()).status,200);
  await f.env.DB.prepare('UPDATE oauth_grant_consumptions SET expires_at=0').run();
  const {consumeOAuthGrant}=await import('../src/db/queries');
  assert.equal(await consumeOAuthGrant(f.env.DB,{grantId:'legacy-next',grantKind:'oauth_authorization_code',clientId:'client',expiresAt:9999999999,nowSeconds:Math.floor(Date.now()/1000)}),true);
  assert.equal(await f.env.DB.prepare('SELECT COUNT(*) AS n FROM oauth_refresh_recoveries').first('n'),0);
 }finally{f.storage.close();}
});
test('bundled Worker HTTP runtime and native D1 atomically recover concurrent exchange and roll back failed persistence',async t=>{
 const {createRequire}=await import('node:module');const {readFileSync,readdirSync}=await import('node:fs');
 const require=createRequire(import.meta.url);const {Miniflare}=createRequire(require.resolve('wrangler/package.json'))('miniflare');
 const {build}=createRequire(require.resolve('wrangler/package.json'))('esbuild');
 const bundle=await build({stdin:{contents:`export {default} from ${JSON.stringify(new URL('../src/index.ts',import.meta.url).pathname)}`,loader:'ts',resolveDir:new URL('../',import.meta.url).pathname},bundle:true,write:false,format:'esm',platform:'node',target:'es2022',banner:{js:"import { createRequire } from 'node:module'; const require=createRequire('/worker.js');"}});
 const runtime=new Miniflare({modules:true,host:'127.0.0.1',script:bundle.outputFiles[0].text,compatibilityDate:'2024-12-01',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],d1Persist:false,bindings:{OAUTH_ISSUER:'https://id.createsomething.space'}});
 t.after(()=>runtime.dispose());const db=await runtime.getD1Database('DB');
 for(const name of readdirSync(new URL('../migrations/',import.meta.url)).filter(x=>x.endsWith('.sql')).sort()){
  const statements=readFileSync(new URL(`../migrations/${name}`,import.meta.url),'utf8').replace(/^\s*--.*$/gm,'').split(';').map(x=>x.trim()).filter(Boolean);
  await db.batch(statements.map(sql=>db.prepare(sql)));
 }
 const f=await fixture({db,close(){}} as any,async request=>runtime.dispatchFetch(request.url,{method:request.method,headers:Object.fromEntries(request.headers),body:await request.text()}));
 // Failure of the second write must undo a preceding native insertion.
 await assert.rejects(db.batch([db.prepare("INSERT INTO oauth_grant_consumptions VALUES('rollback','oauth_refresh_token','client',9999999999,datetime('now'))"),db.prepare("INSERT INTO oauth_refresh_recoveries VALUES('missing','hash','binding','ciphertext',9999999999)")]));
 assert.equal(await db.prepare("SELECT grant_id FROM oauth_grant_consumptions WHERE grant_id='rollback'").first(),null);
 const responses=await Promise.all([f.exchange(),f.exchange()]);assert.ok(responses.every(r=>r.status===200));
 assert.deepEqual(await responses[0].json(),await responses[1].json());
 assert.equal(await db.prepare('SELECT COUNT(*) AS n FROM oauth_grant_consumptions').first('n'),1);
});

test('renewal audit records only committed scoped rotations, survives recovery expiry and deduplicates replay',async()=>{
 const f=await fixture();try{
  assert.equal((await f.exchange()).status,200);assert.equal((await f.exchange()).status,200);
  const rows=await f.env.DB.prepare('SELECT owner_subject,client_id,resource,connection_id FROM connection_renewal_audit').all();
  assert.deepEqual(JSON.parse(JSON.stringify(rows.results)),[{owner_subject:'alice',client_id:'client',resource,connection_id:'a2a-inbox'}]);
  await f.env.DB.prepare('DELETE FROM oauth_refresh_recoveries').run();
  assert.equal((await f.env.DB.prepare('SELECT count(*) AS n FROM connection_renewal_audit').first()).n,1);
 }finally{f.storage.close();}
});

test('audit persistence failure rolls back grant consumption and permits exact recovery',async()=>{
 const f=await fixture();try{
  f.storage.sqlite.exec("CREATE TRIGGER fail_renewal_audit BEFORE INSERT ON connection_renewal_audit BEGIN SELECT RAISE(ABORT,'injected audit persistence failure'); END");
  assert.equal((await f.exchange()).status,500);
  assert.equal((await f.env.DB.prepare('SELECT count(*) AS n FROM oauth_grant_consumptions').first()).n,0);
  assert.equal((await f.env.DB.prepare('SELECT count(*) AS n FROM connection_renewal_audit').first()).n,0);
  f.storage.sqlite.exec('DROP TRIGGER fail_renewal_audit');assert.equal((await f.exchange()).status,200);
  assert.equal((await f.env.DB.prepare('SELECT count(*) AS n FROM connection_renewal_audit').first()).n,1);
 }finally{f.storage.close();}
});

test('userinfo renewal facts are scoped, aggregate-only, and do not expose private audit material',async()=>{
 const f=await fixture();try{
  const tokens:any=await(await f.exchange()).json();
  await f.env.DB.prepare("INSERT INTO connection_renewal_audit(grant_id,owner_subject,client_id,resource,committed_at) VALUES('unrelated','bob','other-client','other-resource',9999999999)").run();
  const response=await worker.fetch(new Request(f.env.OAUTH_ISSUER+'/oauth/userinfo',{headers:{authorization:'Bearer '+tokens.access_token}}),f.env);
  assert.equal(response.status,200);const info:any=await response.json();assert.ok(info.renewal.lastCommittedAt<9999999999);assert.equal(info.renewal.recoveryResponsesPrepared,0);
  assert.deepEqual(Object.keys(info.renewal).sort(),['lastCommittedAt','lastRecoveredAt','recoveryResponsesPrepared']);
  const audit=JSON.stringify((await f.env.DB.prepare('SELECT * FROM connection_renewal_audit').all()).results);
  for(const secret of [f.token,tokens.access_token,tokens.refresh_token,'a'.repeat(43)])assert.ok(!audit.includes(secret));
  const anonymous=await worker.fetch(new Request(f.env.OAUTH_ISSUER+'/oauth/userinfo'),f.env);assert.equal(anonymous.status,401);assert.ok(!JSON.stringify(await anonymous.json()).includes('lastCommittedAt'));
 }finally{f.storage.close();}
});

test('standard host refresh audits response preparation without opting into recovery',async()=>{
 const f=await fixture();try{
  assert.equal((await f.exchange(f.token,'')).status,200);
  const row:any=await f.env.DB.prepare('SELECT commit_mode,replay_count FROM connection_renewal_audit').first();assert.equal(row.commit_mode,'response_prepared');assert.equal(row.replay_count,0);
  assert.equal((await f.env.DB.prepare('SELECT count(*) AS n FROM oauth_refresh_recoveries').first()).n,0);
  assert.equal((await f.exchange(f.token,'')).status,400);
  assert.equal((await f.env.DB.prepare('SELECT count(*) AS n FROM connection_renewal_audit').first()).n,1);
 }finally{f.storage.close();}
});

test('standard issuance attempt followed by audit failure is not reported as committed renewal',async()=>{
 const f=await fixture();try{
  f.storage.sqlite.exec("CREATE TRIGGER fail_standard_audit BEFORE INSERT ON connection_renewal_audit BEGIN SELECT RAISE(ABORT,'injected final audit failure'); END");
  assert.equal((await f.exchange(f.token,'')).status,500);
  assert.equal((await f.env.DB.prepare('SELECT count(*) AS n FROM connection_renewal_audit').first()).n,0);
  assert.equal((await f.env.DB.prepare('SELECT count(*) AS n FROM oauth_grant_consumptions').first()).n,1,'Legacy grant consumption already committed; never claim failure had no effect.');
 }finally{f.storage.close();}
});
