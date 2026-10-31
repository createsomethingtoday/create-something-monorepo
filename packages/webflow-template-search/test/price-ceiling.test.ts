import {describe,it,expect,vi} from 'vitest';
import {createTestEnv,callWorker} from './support/worker.js';
import {parseSearchParams} from '../src/query.js';
import {searchTemplates} from '../src/search.js';

describe('price ceiling',()=>{
 it('filters before pagination and totals, retaining confirmed free and excluding unknown prices',async()=>{
  const {env,close}=createTestEnv();
  try{
   for(const [id,price,free] of [['free',null,1],['unknown',null,0],['cheap',49,0],['boundary',99,0],['expensive',129,0]] as const)
    await env.DB.prepare('INSERT INTO template_documents (id, template_slug, name, synced_at, price, is_free) VALUES (?,?,?,?,?,?)').bind(id,id,id,'2026-10-30',price,free).run();
   const result=await searchTemplates(env,parseSearchParams(new URL('https://test/search?max_price=99&page_size=1')));
   expect(result.pagination.total_items).toBe(3);expect(result.items).toHaveLength(1);
   const zero=await searchTemplates(env,parseSearchParams(new URL('https://test/search?max_price=0')));
   expect(zero.items.map(i=>i.id)).toEqual(['free']);
   expect((await searchTemplates(env,parseSearchParams(new URL('https://test/search')))).pagination.total_items).toBe(5);
  }finally{close()}
 });
 it('rejects invalid ceilings without broadening the search',async()=>{
  const {env,close}=createTestEnv();try{
   for(const value of ['-1','NaN','Infinity','100001','1.234','abc','1e2']){
    expect((await callWorker(new Request('https://test/api/templates/search?max_price='+value),env)).status).toBe(400);
   }
  }finally{close()}
 });
 it('isolates zero, paid ceiling and unconstrained cache entries',async()=>{
  const {env,close}=createTestEnv();const store=new Map<string,Response>();
  vi.stubGlobal('caches',{default:{match:async(r:Request)=>store.get(r.url)?.clone(),put:async(r:Request,v:Response)=>{store.set(r.url,v.clone())}}});
  try{
   for(const [id,price] of [['zero',0],['paid',79]] as const)await env.DB.prepare('INSERT INTO template_documents (id,template_slug,name,synced_at,price) VALUES(?,?,?,?,?)').bind(id,id,id,'2026-10-30',price).run();
   for(const [query,count] of [['max_price=0',1],['max_price=99',2],['',2],['max_price=0',1]] as const){const r=await callWorker(new Request('https://test/api/templates/search?'+query),env);expect((await r.json() as any).pagination.total_items).toBe(count)}
   expect(store.size).toBe(3);
  }finally{vi.unstubAllGlobals();close()}
 });
});
