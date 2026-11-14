import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { seal, unseal, session, digest, assertAllowed, finishLogin } from '../lib/auth';
import { decodeRpc, withMcp, toolData } from '../lib/mcp';
import { performAction, capabilities, reconcileAction } from '../lib/reviews';
import { analysisRequest, pollAnalysis, startAnalysis, recoverAnalysis } from '../lib/analysis';
import { providerFetch, ProviderFailure } from '../lib/provider';
import type { Platform } from '../lib/platform';

function database() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(new URL('../drizzle/0001_portal.sql', import.meta.url), 'utf8'));
  const DB = {
    prepare(sql: string) {
      return {
        bind(...args: any[]) {
          const statement = sqlite.prepare(sql);
          return {
            async first() {
              return statement.get(...args) ?? null;
            },
            async all() {
              return { results: statement.all(...args) };
            },
            async run() {
              const result = statement.run(...args);
              return { meta: { changes: Number(result.changes) } };
            }
          };
        }
      };
    }
  };
  return { sqlite, DB: DB as unknown as D1Database };
}
const identity = {
  accountId: 'alice',
  email: 'alice@webflow.com',
  name: 'Alice',
  authMode: 'cloudflare-access' as const
};
function environment() {
  const db = database();
  return {
    ...db,
    env: {
      DB: db.DB,
      SESSION_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64url'),
      PORTAL_ORIGIN: 'https://portal.test',
      PORTAL_ALLOWED_EMAILS: 'alice@webflow.com'
    } as Platform
  };
}

test('session tokens remain encrypted; corrupted ciphertext cannot authenticate', async () => {
  const { env } = environment(),
    cipher = await seal(env, { accessToken: 'private-provider-token' });
  assert.ok(!cipher.includes('private-provider-token'));
  assert.deepEqual(await unseal(env, cipher), { accessToken: 'private-provider-token' });
  await assert.rejects(unseal(env, cipher.slice(0, -8) + 'AAAAAAAA'));
});
test('unsigned identity headers cannot establish a session; expiry and admission policy are enforced', async () => {
  const { env, sqlite } = environment();
  await assert.rejects(
    session(
      env,
      new Request('https://portal.test/api/session', {
        headers: {
          'x-user-email': 'alice@webflow.com',
          'cf-access-authenticated-user-email': 'alice@webflow.com'
        }
      })
    ),
    /Sign in/
  );
  const raw = Buffer.alloc(32, 4).toString('base64url');
  sqlite
    .prepare('INSERT INTO portal_sessions VALUES(?,?,?)')
    .run(
      await digest(raw),
      await seal(env, { identity, accessToken: 'private', expiresAt: Date.now() + 10000 }),
      Date.now() + 10000
    );
  const request = new Request('https://portal.test/api/session', {
    headers: { cookie: `review_session=${raw}` }
  });
  assert.equal((await session(env, request)).identity.accountId, 'alice');
  assert.throws(
    () => assertAllowed(env, { ...identity, email: 'bob@webflow.com' }),
    /does not have access/
  );
  sqlite.prepare('UPDATE portal_sessions SET expires_at=0').run();
  await assert.rejects(session(env, request), /expired/);
});
test('OAuth callback rejects missing browser state before any token exchange', async () => {
  const { env } = environment();
  await assert.rejects(
    finishLogin(env, new Request('https://portal.test/api/auth/callback?code=x&state=attacker')),
    /did not match/
  );
});
test('JSON and SSE MCP responses preserve result boundaries and reject errors', async () => {
  assert.deepEqual(
    await decodeRpc(Response.json({ jsonrpc: '2.0', id: 1, result: { tools: [] } }), 1),
    { tools: [] }
  );
  assert.deepEqual(
    await decodeRpc(
      new Response('event: message\ndata: {"id":2,"result":{"ok":true}}\n\n', {
        headers: { 'content-type': 'text/event-stream' }
      }),
      2
    ),
    { ok: true }
  );
  await assert.rejects(
    decodeRpc(Response.json({ id: 1, error: { code: -32600 } }), 1),
    /could not complete/
  );
  assert.throws(
    () =>
      toolData({
        content: [
          { type: 'text', text: JSON.stringify({ ok: false, error: { message: 'Denied' } }) }
        ]
      }),
    /Denied/
  );
});
test('MCP sessions initialize per token and are cleaned up after a failing call', async () => {
  const requests: RequestInit[] = [];
  const fetcher = async (_url: any, init?: RequestInit) => {
    requests.push(init!);
    if (init?.method === 'DELETE') return new Response(null, { status: 204 });
    const body = JSON.parse(String(init?.body));
    if (body.method === 'initialize')
      return Response.json(
        { id: body.id, result: {} },
        { headers: { 'Mcp-Session-Id': 'private-session' } }
      );
    return new Response(null, { status: 202 });
  };
  await assert.rejects(
    withMcp(
      'alice-token',
      async () => {
        throw Error('downstream failed');
      },
      fetcher as typeof fetch
    ),
    /downstream failed/
  );
  assert.equal(requests.at(-1)?.method, 'DELETE');
  assert.equal((requests[0].headers as any).Authorization, 'Bearer alice-token');
});
test('provider writes are never retried after an ambiguous network failure', async () => {
  let calls = 0;
  await assert.rejects(
    providerFetch('Test', 'https://provider.test', { method: 'POST' }, async () => {
      calls++;
      throw Error('connection reset');
    }),
    (error: any) => error instanceof ProviderFailure && error.uncertain
  );
  assert.equal(calls, 1);
  await assert.rejects(
    providerFetch(
      'Test',
      'https://provider.test',
      {},
      async () => new Response(null, { status: 403 })
    ),
    (error: any) => error.status === 403 && !error.uncertain
  );
});
const action = {
  id: '75020524-f706-499c-b70a-77b660d8a588',
  action: 'approve',
  versionId: 'rec12345678901234',
  confirmed: true,
  expectedStatus: 'Pending',
  expectedTicketId: '123',
  text: 'Reviewed.'
};
function reviewerRpc(options: { granted?: boolean; status?: string; fail?: boolean } = {}) {
  let writes = 0;
  return {
    writes: () => writes,
    rpc: async (method: string, params?: any) => {
      if (method === 'tools/list')
        return {
          tools: [
            { name: 'app_review_get_version' },
            ...(options.granted === false ? [] : [{ name: 'app_review_approve_version' }])
          ]
        };
      if (params.name === 'app_review_get_version')
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                ok: true,
                data: {
                  version: { reviewStatus: options.status ?? 'Pending', zendeskTicketId: '123' }
                }
              })
            }
          ]
        };
      writes++;
      if (options.fail) throw new ProviderFailure({ provider: 'MCP', status: 0, uncertain: true });
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              ok: true,
              data: { updated_version: { reviewStatus: 'Approved' } }
            })
          }
        ]
      };
    }
  };
}
test('live tool grants and fresh status prevent unauthorized or stale decisions', async () => {
  const { DB } = database();
  let mock = reviewerRpc({ granted: false });
  await assert.rejects(performAction(DB, 'alice', action, mock.rpc), /does not grant/);
  assert.equal(mock.writes(), 0);
  mock = reviewerRpc({ status: 'Rejected' });
  await assert.rejects(performAction(DB, 'alice', action, mock.rpc), /changed/);
  assert.equal(mock.writes(), 0);
  assert.equal(capabilities([]).approve, false);
  await assert.rejects(performAction(DB, 'alice', { ...action, confirmed: false }, mock.rpc));
});
test('a confirmed action is sent once; its exact receipt is returned on retry', async () => {
  const { DB } = database(),
    mock = reviewerRpc();
  assert.equal((await performAction(DB, 'alice', action, mock.rpc)).status, 'completed');
  assert.equal((await performAction(DB, 'alice', action, mock.rpc)).duplicate, true);
  assert.equal(mock.writes(), 1);
  await assert.rejects(
    performAction(DB, 'alice', { ...action, text: 'Different' }, mock.rpc),
    /different content/
  );
});
test('unknown write outcomes block new confirmations for the same target', async () => {
  const { DB, sqlite } = database(),
    mock = reviewerRpc({ fail: true });
  await assert.rejects(performAction(DB, 'alice', action, mock.rpc));
  assert.equal(sqlite.prepare('SELECT status FROM portal_actions').get()?.status, 'unknown');
  await assert.rejects(
    performAction(DB, 'alice', { ...action, id: '9c4985f3-51e4-490c-bd77-cd338b7dadb3' }, mock.rpc),
    /already being processed/
  );
  assert.equal(mock.writes(), 1);
});
test('analysis polling cannot fetch another reviewer’s provider response', async () => {
  const { env, sqlite } = environment();
  const id = '0c1e1bfd-4f76-4e0e-94ac-0301523bbdc8';
  sqlite
    .prepare(
      'INSERT INTO analysis_jobs(id,owner_id,bundle_id,bundle_sha256,status,response_id,created_at) VALUES(?,?,?,?,?,?,?)'
    )
    .run(id, 'alice', 'bundle', 'a'.repeat(64), 'queued', 'resp_private', new Date().toISOString());
  await assert.rejects(pollAnalysis(env, 'bob', id), /not found/);
  const request = analysisRequest('cntr_unique', '/mnt/data/bundle.zip', 'a'.repeat(64));
  assert.equal(request.model, 'gpt-6-astra');
  assert.equal(request.background, true);
  assert.equal(request.tools.length, 1);
  assert.equal(request.tools[0].type, 'shell');
  assert.ok(!JSON.stringify(request).includes('MCP_API_KEY'));
});

function analysisEnvironment() {
  const state=environment();
  state.sqlite.exec(readFileSync(new URL('../drizzle/0000_groovy_risque.sql',import.meta.url),'utf8'));
  const bundleId='cb5e102c-aeb4-4716-aa35-0d2e1b91c2ad';
  state.sqlite.prepare('INSERT INTO review_bundles VALUES(?,?,?,?,?,?,?,?,?)').run(bundleId,'alice','fixture.zip','QA fixture','1','a'.repeat(64),4,1,new Date().toISOString());
  state.env.OPENAI_API_KEY='local-test-credential';
  state.env.BUCKET={get:async()=>({arrayBuffer:async()=>new Uint8Array([1,2,3,4]).buffer})} as unknown as R2Bucket;
  return {...state,bundleId};
}
async function mockAnalysisProvider(run:(calls:string[])=>Promise<void>,options:{terminal?:boolean;failReceipt?:boolean;malformed?:boolean}={}) {
  const original=globalThis.fetch,calls:string[]=[];
  globalThis.fetch=async(input:any,init?:RequestInit)=>{
    const path=new URL(String(input)).pathname;calls.push(`${init?.method||'GET'} ${path}`);
    if(path==='/v1/containers'){
      assert.equal(JSON.parse(String(init?.body)).network_policy.type,'disabled');
      return Response.json({id:'cntr_fixture'});
    }
    if(path.endsWith('/files'))return Response.json({path:'/mnt/data/bundle.zip'});
    if(path==='/v1/responses'){
      const body=JSON.parse(String(init?.body));assert.equal(body.model,'gpt-6-astra');assert.ok(body.metadata.portal_job_id);
      if(options.malformed)return new Response('not json');
      return Response.json({id:'resp_fixture',status:options.terminal?'completed':'queued'});
    }
    if(path==='/v1/responses/resp_fixture'){
      if(options.failReceipt)return new Response(null,{status:503});
      return Response.json({id:'resp_fixture',model:'gpt-6-astra',status:'completed',output:[{type:'message',content:[{type:'output_text',text:'Actual fixture report.'}]},{type:'shell_call_output',output:[{stdout:'Node fixture',stderr:'',outcome:{type:'exit',exit_code:0}}]}]});
    }
    if(init?.method==='DELETE')return Response.json({deleted:true});
    throw Error(`Unexpected test request ${path}`);
  };
  try{await run(calls);}finally{globalThis.fetch=original;}
}
test('immediate terminal analysis saves its provider receipt and deletes its isolated container',async()=>{
  const {env,bundleId,sqlite}=analysisEnvironment();
  await mockAnalysisProvider(async calls=>{
    const result=await startAnalysis(env,'alice',bundleId,'cecb71f5-569f-44dd-bdcc-6d38a36041b5');
    assert.equal(result.status,'completed');assert.equal((result as any).result.report,'Actual fixture report.');
    assert.ok(calls.includes('DELETE /v1/containers/cntr_fixture'));
    assert.equal(sqlite.prepare('SELECT status FROM analysis_jobs').get()?.status,'completed');
  },{terminal:true});
});
test('a receipt-fetch failure after accepted inference preserves a recoverable response and active lock',async()=>{
  const {env,bundleId,sqlite}=analysisEnvironment();
  await mockAnalysisProvider(async calls=>{
    await assert.rejects(startAnalysis(env,'alice',bundleId,'cecb71f5-569f-44dd-bdcc-6d38a36041b5'));
    const row=sqlite.prepare('SELECT * FROM analysis_jobs').get();assert.equal(row?.status,'unknown');assert.equal(row?.response_id,'resp_fixture');
    assert.ok(!calls.some(c=>c.startsWith('DELETE')));
    await assert.rejects(startAnalysis(env,'alice',bundleId,'f9a04662-fcb6-46fb-8b72-58f65afed078'),/already active/);
    assert.equal(calls.filter(c=>c==='POST /v1/responses').length,1);
  },{terminal:true,failReceipt:true});
});
test('a malformed response after inference submission remains unknown and is never replayed',async()=>{
  const {env,bundleId,sqlite}=analysisEnvironment();
  await mockAnalysisProvider(async calls=>{
    await assert.rejects(startAnalysis(env,'alice',bundleId,'cecb71f5-569f-44dd-bdcc-6d38a36041b5'));
    assert.equal(sqlite.prepare('SELECT status FROM analysis_jobs').get()?.status,'unknown');
    assert.ok(!calls.some(c=>c.startsWith('DELETE')));
  },{malformed:true});
});
test('response recovery rejects another run or bundle before attaching a provider result',async()=>{
  const {env,sqlite,bundleId}=analysisEnvironment(),id='cecb71f5-569f-44dd-bdcc-6d38a36041b5';
  sqlite.prepare('INSERT INTO analysis_jobs(id,owner_id,bundle_id,bundle_sha256,status,created_at) VALUES(?,?,?,?,?,?)').run(id,'alice',bundleId,'a'.repeat(64),'unknown',new Date().toISOString());
  const original=globalThis.fetch;globalThis.fetch=async()=>Response.json({id:'resp_wrong',metadata:{portal_job_id:'different',bundle_sha256:'a'.repeat(64)},status:'completed'});
  try{await assert.rejects(recoverAnalysis(env,'alice',id,{responseId:'resp_wrong',confirmed:true}),/does not belong/);await assert.rejects(recoverAnalysis(env,'bob',id,{responseId:'resp_wrong',confirmed:true}),/not found/);assert.equal(sqlite.prepare('SELECT response_id FROM analysis_jobs').get()?.response_id,null);}finally{globalThis.fetch=original;}
});
test('action reconciliation is explicit, owner-scoped, and records fresh evidence without repeating the write',async()=>{
  const {DB,sqlite}=database(),mock=reviewerRpc({fail:true});await assert.rejects(performAction(DB,'alice',action,mock.rpc));
  sqlite.prepare('UPDATE portal_actions SET created_at=?').run(new Date(Date.now()-130000).toISOString());
  const input={confirmed:true,outcome:'observed_not_applied',note:'Verified the current Airtable version and its unchanged status.'};
  await assert.rejects(reconcileAction(DB,'bob',action.id,input,mock.rpc),/not found/);
  await assert.rejects(reconcileAction(DB,'alice',action.id,{...input,confirmed:false},mock.rpc));
  assert.equal((await reconcileAction(DB,'alice',action.id,input,mock.rpc)).status,'reconciled');assert.equal(mock.writes(),1);
  assert.equal((await performAction(DB,'alice',action,mock.rpc)).duplicate,true);assert.equal(mock.writes(),1);
});
