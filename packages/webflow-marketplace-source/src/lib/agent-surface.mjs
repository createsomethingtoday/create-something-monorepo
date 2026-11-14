// WebMCP tools for the surface a page renders. The shared catalog tools come
// from MarketplaceAgentTools; these add what only this page knows.
import {readBrief,briefParams,discoveryQuery,evidenceFor,comparisonSlugs,priceLabel,cmsLabel} from './discovery.mjs';

export const REFERENCE_TOPICS={
 'submission-guidelines':'Template submission guidelines',
 'grading-rubric':'Template grading rubric',
 'template-licenses':'Template license terms',
 'services/program-guidelines':'Customization services program guidelines',
};
const READ={readOnlyHint:true},LISTING={readOnlyHint:true,untrustedContentHint:true};
const MAX_REFERENCE_CHARS=20000;

/** Server side: reduce page islands to the props the tools need. */
export function surfaceFor(islands){
 const detail=islands.find(island=>island.kind==='detail'&&!island.detailSection);
 if(detail){
  const t=detail.item;
  return {kind:'detail',template:{slug:t.template_slug,name:t.name,creator_name:t.creator_name,creator_slug:t.creator_slug,price:priceLabel(t),is_free:t.is_free===true,cms:cmsLabel(t),description:t.description_short||'',categories:(t.category_groups||[]).map(x=>x.name),subcategories:(t.child_categories||[]).map(x=>x.name),styles:(t.styles||[]).map(x=>x.name),features:t.features||[],live_demo_url:t.website_url||'',designer_preview_url:t.preview_url||'',purchase_url:t.purchase_url||'',included_pages:(detail.inventory?.length?detail.inventory:(t.included_pages||[]).map(name=>({name}))).map(page=>({name:page.name,...(page.href?{url:page.href}:{})}))}};
 }
 const creator=islands.find(island=>island.kind==='creator');
 if(creator)return {kind:'creator',creator:{slug:creator.profile.slug,name:creator.profile.name,bio:creator.published?.bio||creator.profile.bio,links:creator.profile.links,total_templates:creator.total,picks:(creator.published?.picks||[]).map(pick=>({slug:pick.slug,...(pick.note?{note:pick.note}:{})}))}};
 if(islands.some(island=>island.kind==='discovery'))return {kind:'search'};
 return {kind:'page'};
}

function summarize(item,origin){
 return {slug:item.template_slug,name:item.name,creator:item.creator_name,price:priceLabel(item),cms:cmsLabel(item),categories:(item.child_categories?.length?item.child_categories:item.category_groups||[]).map(x=>x.name),url:`${origin}/templates/html/${item.template_slug}`};
}
async function getJson(fetchImpl,url){
 const response=await fetchImpl(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw new Error(`Template search request failed (HTTP ${response.status}).`);
 return response.json();
}
function navigate(win,params){
 win.history.pushState({},'',`${win.location.pathname}?${params}`);
 win.dispatchEvent(new win.PopStateEvent('popstate'));
}

/** Client side: tools for the surface. `win` and `fetchImpl` are injectable for tests. */
export function surfaceTools(surface,{origin,win=globalThis.window,fetchImpl=globalThis.fetch}){
 const search=`${origin}/templates-api/api/templates/search`;
 const tools=[{
  name:'get_marketplace_reference',
  description:'Read a Template Marketplace policy page as plain text: submission guidelines, grading rubric, license terms, or the customization services program guidelines.',
  inputSchema:{type:'object',additionalProperties:false,required:['topic'],properties:{topic:{type:'string',enum:Object.keys(REFERENCE_TOPICS)}}},
  annotations:READ,
  async execute({topic}){
   if(!Object.hasOwn(REFERENCE_TOPICS,topic))return {ok:false,error:'unknown_topic',valid_topics:Object.keys(REFERENCE_TOPICS)};
   const url=`${origin}/templates/${topic}`;
   const response=await fetchImpl(url,{signal:AbortSignal.timeout(10000)});
   if(!response.ok)throw new Error(`Reference page failed (HTTP ${response.status}).`);
   const doc=new win.DOMParser().parseFromString(await response.text(),'text/html');
   doc.querySelectorAll('script,style,nav,footer,.source-skip,.sb-nav-wrapper,.cta-sell-your-templates,dialog').forEach(element=>element.remove());
   const text=(doc.querySelector('main')||doc.body).textContent.replace(/[ \t]+/g,' ').replace(/\s*\n\s*/g,'\n').trim();
   return {ok:true,topic,title:REFERENCE_TOPICS[topic],url,truncated:text.length>MAX_REFERENCE_CHARS,text:text.slice(0,MAX_REFERENCE_CHARS)};
  },
 }];
 if(surface.kind==='detail')tools.push({
  name:'get_template_details',
  description:'Details of the template on this page: price, CMS, categories, styles, included pages, live demo, Designer preview and purchase links. Purchase and cloning are Webflow-owned steps: give the user the link; do not complete checkout for them.',
  inputSchema:{type:'object',additionalProperties:false,properties:{}},
  annotations:LISTING,
  async execute(){return {ok:true,...surface.template,url:`${origin}/templates/html/${surface.template.slug}`,creator_url:`${origin}/templates/designers/${surface.template.creator_slug}`,customization_services_url:`${origin}/templates/services/service-type?${new URLSearchParams({templateName:surface.template.name,templateLink:`https://webflow.com/templates/html/${surface.template.slug}`})}`}},
 });
 if(surface.kind==='creator')tools.push({
  name:'get_creator_storefront',
  description:'The creator on this page: profile, their own featured picks with notes, and one page of their templates.',
  inputSchema:{type:'object',additionalProperties:false,properties:{sort:{type:'string',enum:['popular','newest']},page:{type:'integer',minimum:1,maximum:50}}},
  annotations:LISTING,
  async execute({sort='popular',page=1}){
   const body=await getJson(fetchImpl,`${search}?${new URLSearchParams({creator_slug:surface.creator.slug,sort,page:String(page),page_size:'24',view:'grid',include:'items'})}`);
   return {ok:true,...surface.creator,url:`${origin}/templates/designers/${surface.creator.slug}`,page,has_next_page:body.pagination?.has_next_page===true,templates:(body.items||[]).filter(item=>item.creator_slug===surface.creator.slug).map(item=>summarize(item,origin))};
  },
 });
 if(surface.kind==='search'){
  async function results(){
   const query=win.location.search,brief=readBrief(query);
   const body=await getJson(fetchImpl,`${search}?${discoveryQuery(query)}`);
   return {ok:true,brief,href:win.location.href,total_items:body.pagination?.total_items??0,compare:comparisonSlugs(query),items:(body.items||[]).map(item=>{const evidence=evidenceFor(item,brief,true);return {...summarize(item,origin),fit:evidence.reasons,limit:evidence.limit}})};
  }
  tools.push({
   name:'get_search_results',
   description:'The project brief and results on this search page, with the catalog evidence for each fit and its known limits.',
   inputSchema:{type:'object',additionalProperties:false,properties:{}},
   annotations:LISTING,
   execute:results,
  },{
   name:'set_search_brief',
   description:'Update the visible project brief, then return the new results. Omitted fields keep their current value; an empty string clears one. Back undoes the change. Use list_categories_and_styles for category and style slugs.',
   inputSchema:{type:'object',additionalProperties:false,properties:{
    q:{type:'string',maxLength:256,description:'Keywords.'},
    brief:{type:'string',maxLength:1000,description:'What the user is building, in their words. Travels with shared links.'},
    max_price:{type:['number','string'],description:'Maximum template price in USD, or "" for any budget.'},
    cms:{type:'string',enum:['required','not_needed','any']},
    free_only:{type:'boolean'},
    category:{type:'string',description:'Category slug.'},
    style:{type:'string',description:'Style slug.'},
    types:{type:'string',enum:['','One Page','Multi Page','Multi Layout']},
   }},
   annotations:{readOnlyHint:false},
   async execute(input){
    const next=readBrief(win.location.search);
    if(input.max_price!==undefined){const raw=String(input.max_price);if(raw!==''&&!(/^\d+(?:\.\d{1,2})?$/.test(raw)&&Number(raw)<=100000))return {ok:false,error:'invalid_max_price',message:'Use a number from 0 to 100000, or "" for any budget.'};next.maxPrice=raw}
    if(input.cms!==undefined)next.cms={required:'true',not_needed:'false',any:''}[input.cms]??next.cms;
    if(typeof input.free_only==='boolean')next.free=input.free_only;
    for(const [key,field] of [['q','q'],['brief','notes'],['category','category'],['style','style'],['types','types']])if(typeof input[key]==='string')next[field]=input[key].trim();
    navigate(win,briefParams(next,win.location.search));
    return {...await results(),status:'applied'};
   },
  },{
   name:'compare_templates',
   description:'Put up to 3 templates in the visible comparison tray and return them side by side against the brief. Pass an empty list to clear the tray.',
   inputSchema:{type:'object',additionalProperties:false,required:['slugs'],properties:{slugs:{type:'array',maxItems:3,items:{type:'string'}}}},
   annotations:{readOnlyHint:false},
   async execute({slugs}){
    const wanted=comparisonSlugs(`?compare=${(slugs||[]).join(',')}`);
    const params=new URLSearchParams(win.location.search);
    if(wanted.length)params.set('compare',wanted.join(','));else params.delete('compare');
    navigate(win,params);
    const brief=readBrief(win.location.search);
    const rows=await Promise.all(wanted.map(async slug=>{
     const body=await getJson(fetchImpl,`${search}?${new URLSearchParams({template_slug:slug,strict:'true',page_size:'1',include:'items',view:'full'})}`);
     const item=(body.items||[]).find(t=>t.template_slug===slug);
     if(!item)return {slug,found:false};
     const evidence=evidenceFor(item,brief);
     return {...summarize(item,origin),found:true,facts:evidence.facts,fit:evidence.reasons,limit:evidence.limit};
    }));
    return {ok:true,status:'applied',brief,compared:rows};
   },
  });
 }
 return tools;
}
