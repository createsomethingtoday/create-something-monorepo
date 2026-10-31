import { afterEach, expect, it, vi } from 'vitest';
import { backfillCms, cmsCheckbox, CMS_FIELD } from '../src/cms-backfill.js';
import { createTestEnv, callWorker } from './support/worker.js';
afterEach(() => vi.unstubAllGlobals());
async function seed(env: ReturnType<typeof createTestEnv>['env']) {
  for (const id of ['recOne', 'recTwo']) await env.DB.prepare('INSERT INTO template_documents(id,template_slug,name,synced_at) VALUES(?,?,?,?)').bind(id,id,id,'before').run();
}
function source(records: unknown[]) { vi.stubGlobal('fetch', vi.fn(async () => Response.json({ records }))); }
it('previews without writes, applies only capabilities and resumes without refetching known rows', async () => {
  const {env,close}=createTestEnv();
  try {
    await seed(env); source([{id:'recOne',fields:{[CMS_FIELD]:true}},{id:'recTwo',fields:{}}]);
    expect(await backfillCms(env)).toMatchObject({dry_run:true,updated:0,counts:{total:2,unknown:2}});
    expect(await backfillCms(env,true)).toMatchObject({updated:2,counts:{total:2,unknown:0,with_cms:1,without_cms:1}});
    expect((await env.DB.prepare('SELECT name,synced_at FROM template_documents WHERE id=?').bind('recOne').first())).toEqual({name:'recOne',synced_at:'before'});
    expect(await env.DB.prepare("SELECT value_json FROM sync_state WHERE key='public_search_cache_version'").first()).toBeTruthy();
    const calls=vi.mocked(fetch).mock.calls.length;
    expect(await backfillCms(env,true)).toMatchObject({selected:0,updated:0});
    expect(vi.mocked(fetch).mock.calls.length).toBe(calls);
  } finally {close();}
});
it('rejects incomplete or invalid source batches before writing any rows', async () => {
  const {env,close}=createTestEnv();
  try {
    await seed(env);
    for(const records of [[],[{id:'recOne',fields:{}},{id:'recTwo',fields:{[CMS_FIELD]:'false'}}]]) {
      source(records); await expect(backfillCms(env,true)).rejects.toThrow();
      expect(await env.DB.prepare('SELECT COUNT(*) AS n FROM template_documents WHERE has_cms IS NULL').first()).toEqual({n:2});
      expect(await env.DB.prepare("SELECT value_json FROM sync_state WHERE key='public_search_cache_version'").first()).toBeNull();
    }
  } finally {close();}
});
it('preserves rows changed by concurrent sync and leaves them resumable', async () => {
  const {env,close}=createTestEnv();
  try {
    await seed(env);
    vi.stubGlobal('fetch',vi.fn(async()=>{
      await env.DB.prepare("UPDATE template_documents SET synced_at='newer' WHERE id='recOne'").run();
      return Response.json({records:[{id:'recOne',fields:{[CMS_FIELD]:true}},{id:'recTwo',fields:{}}]});
    }));
    expect(await backfillCms(env,true)).toMatchObject({updated:1,skipped:1,counts:{unknown:1}});
    expect(await env.DB.prepare("SELECT has_cms FROM template_documents WHERE id='recOne'").first()).toEqual({has_cms:null});
  } finally {close();}
});
it('requires admin authentication before backfill access',async()=>{
 const {env,close}=createTestEnv();try {expect((await callWorker(new Request('https://test/api/templates/admin/backfill-cms',{method:'POST',body:'{}'}),env)).status).toBe(401);}finally{close();}
});
it('rejects malformed checkbox data rather than converting it to false',()=>{expect(()=>cmsCheckbox(null)).toThrow();expect(()=>cmsCheckbox('false')).toThrow();expect(cmsCheckbox(undefined)).toBe(false);});

it('repairs only explicitly selected known values and rejects missing targets', async () => {
 const {env,close}=createTestEnv();try {
  await seed(env);await env.DB.prepare('UPDATE template_documents SET has_cms=0').run();
  source([{id:'recOne',fields:{[CMS_FIELD]:true}}]);
  expect(await backfillCms(env,true,50,['recOne'])).toMatchObject({selected:1,updated:1});
  expect(await env.DB.prepare("SELECT has_cms FROM template_documents WHERE id='recTwo'").first()).toEqual({has_cms:0});
  await expect(backfillCms(env,true,50,['recMissing'])).rejects.toThrow('missing');
 }finally{close();}
});
