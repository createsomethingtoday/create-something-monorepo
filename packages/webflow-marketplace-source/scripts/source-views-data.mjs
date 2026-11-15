// Writes the read-only data files that the Source Views (Catalog Explorer, Category Health) render.
// Source Views cannot fetch remote hosts, so a View's Refresh button asks the Source agent to run this script.
import {mkdir,writeFile} from 'node:fs/promises';
const SEARCH='https://webflow-template-search.webflow-inc.workers.dev/api/templates/search';
const OUT=new URL('../data/source-views/',import.meta.url);
const LANE_SIZE=48;
async function search(params){
 const url=new URL(SEARCH);
 for(const [k,v] of Object.entries({view:'grid',page:1,...params}))if(v!=null)url.searchParams.set(k,String(v));
 const response=await fetch(url,{signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw new Error(`Search ${response.status} for ${url.search}`);
 return response.json();
}
const total=async params=>(await search({include:'items',page_size:1,...params})).pagination.total_items;
const card=i=>({slug:i.template_slug,name:i.name,url:i.url,website_url:i.website_url,thumbnail:i.thumbnail_image_url,creator:i.creator_name,creator_slug:i.creator_slug,price:i.price,is_free:i.is_free,is_featured:i.is_featured,pick_reason:i.reviewer_pick_reason||'',type:i.template_type,has_cms:i.has_cms,popularity:i.popularity_score,viewers:i.unique_viewers,purchases:i.cumulative_purchases,published:i.published_date,categories:(i.category_groups||[]).map(c=>c.slug)});
async function lane(params){return (await search({include:'items',page_size:LANE_SIZE,...params})).items.map(card)}
async function inBatches(list,size,fn){const out=[];for(let i=0;i<list.length;i+=size)out.push(...await Promise.all(list.slice(i,i+size).map(fn)));return out}

const generatedAt=new Date().toISOString();
const [pillsPayload,facetsPayload]=await Promise.all([search({include:'pills',page_size:1}),search({include:'facets',page_size:1})]);
const pills=pillsPayload.category_pills.map(p=>({name:p.name,slug:p.slug,url:p.url,count:p.count}));
const [all,featured,free,popular,newest,featuredLane,freeLane]=await Promise.all([
 total({}),total({scope:'featured'}),total({scope:'free'}),
 lane({sort:'popular'}),lane({sort:'newest'}),lane({scope:'featured',sort:'popular'}),lane({scope:'free',sort:'popular'}),
]);
const categories=await inBatches(pills,4,async p=>{
 const [featuredCount,freeCount,newestPage,popularPage]=await Promise.all([
  total({scope:'featured',category_group_slug:p.slug}),total({scope:'free',category_group_slug:p.slug}),
  search({include:'items',page_size:3,sort:'newest',category_group_slug:p.slug}),search({include:'items',page_size:3,sort:'popular',category_group_slug:p.slug}),
 ]);
 return {...p,featured:featuredCount,free:freeCount,newest:newestPage.items.map(card),popular:popularPage.items.map(card)};
});
await mkdir(OUT,{recursive:true});
const source={api:SEARCH,generatedAt};
await writeFile(new URL('catalog.json',OUT),JSON.stringify({...source,totals:{all,featured,free},facets:facetsPayload.available_facets,pills,lanes:{popular,newest,featured:featuredLane,free:freeLane}})+'\n');
await writeFile(new URL('categories.json',OUT),JSON.stringify({...source,totals:{all,featured,free},categories})+'\n');
console.log(`Source View data refreshed ${generatedAt}: ${all} templates, ${featured} featured, ${free} free, ${categories.length} categories.`);
