import {describe,it,expect} from 'vitest';
import {portfolioIntent} from '../src/discovery-intent.js';
import {parseSearchParams} from '../src/query.js';
import {searchTemplates} from '../src/search.js';
import {createTestEnv} from './support/worker.js';

describe('opt-in portfolio discovery',()=>{
 it('normalizes conversational portfolio requests while retaining specific requirements',()=>{
  for(const q of ['portfolio','A portfolio site','I need a portfolio website'])expect(portfolioIntent(q)?.keywords).toBe(null);
  expect(portfolioIntent('minimal designer portfolio')?.keywords).toBe('minimal');
  expect(portfolioIntent('portfolio for developers')?.keywords).toBe('developer');
  expect(portfolioIntent('photographer portfolio')?.category_slugs).toEqual(['photography-and-video-portfolio']);
  expect(portfolioIntent('studio portfolio')?.category_slugs).toEqual(['creative-agency']);
  expect(portfolioIntent('portfolio without CMS')).toBeUndefined();
  expect(portfolioIntent('video game portfolio')).toBeUndefined();
  expect(parseSearchParams(new URL('https://test/?discovery=true&q=video+game+portfolio')).q).toBe('video game portfolio');
  expect(portfolioIntent('designer photographer portfolio')).toBeUndefined();
  expect(portfolioIntent('portfolio','constructor')?.audience).toBe('all');
 });
 it('leaves legacy keyword and exact-identity searches unchanged',()=>{
  expect(parseSearchParams(new URL('https://test/?q=A+portfolio+site')).q).toBe('A portfolio site');
  for(const key of ['template_slug','creator_slug','designer_record_id'])expect(parseSearchParams(new URL(`https://test/?q=portfolio&discovery=true&${key}=portfolio`)).intent).toBeUndefined();
 });
 it('uses taxonomy and documented picks before pagination, respecting price and CMS',async()=>{
  const {env,close}=createTestEnv();
  try{
   for(const [id,category,featured,note,popularity,price,cms] of [
    ['pick','design-portfolio',1,'Strong project presentation',10,49,1],
    ['photo','photography-and-video-portfolio',1,'Image-led work',9,49,1],
    ['legacy','design-portfolio',0,'',100,19,0],
    ['unexplained','design-portfolio',1,'',90,49,1],
    ['expensive','design-portfolio',1,'Project focused',100,199,1],
    ['investment','finance',1,'Investment portfolio',200,49,1],
   ] as const){
    await env.DB.prepare('INSERT INTO template_documents (id,template_slug,name,synced_at,is_featured,reviewer_pick_reason,popularity_score,price,has_cms) VALUES(?,?,?,?,?,?,?,?,?)').bind(id,id,id,'2026-10-30',featured,note,popularity,price,cms).run();
    await env.DB.prepare('INSERT INTO template_child_categories VALUES(?,?,?)').bind(id,category,category).run();
   }
   for(const q of ['portfolio','A portfolio site','I need a portfolio website']){
    const p=parseSearchParams(new URL(`https://test/?discovery=true&sort=recommended&strict=true&max_price=99&has_cms=true&q=${encodeURIComponent(q)}`));
    const result=await searchTemplates(env,p);
    expect(result.items.map(x=>x.id)).toEqual(['pick','photo','unexplained']);
    expect(result.interpretation?.original_query).toBe(q);
    const page=await searchTemplates(env,{...p,pageSize:1,page:2});
    expect(page.pagination.total_items).toBe(3);expect(page.items.map(x=>x.id)).toEqual(['photo']);
   }
   const designer=await searchTemplates(env,parseSearchParams(new URL('https://test/?discovery=true&q=portfolio&portfolio_kind=designer')));
   expect(designer.items.map(x=>x.id)).not.toContain('photo');
  }finally{close()}
 });
});
