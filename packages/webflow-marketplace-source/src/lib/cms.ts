import {load} from 'cheerio';
import {localLink} from './routes.mjs';
export class CmsNotFound extends Error {}
// Fresh for a minute, then served stale for up to a day while one background refresh
// replaces it. A refresh that finds the page gone drops it; other failures keep the copy.
const CMS_TTL_MS=60_000,CMS_STALE_MS=86_400_000;
const cache=new Map<string,{at:number;html:string;refreshing?:boolean}>();
async function fetchCms(path:string){
 // Edge fetch supports manual redirects; the non-2xx check below rejects them.
 const res=await fetch(`https://templates.webflow.com${path}`,{signal:AbortSignal.timeout(15000),redirect:'manual'});
 if(res.status===404)throw new CmsNotFound('CMS page not found');
 if(!res.ok)throw new Error(`CMS returned ${res.status}`);
 const html=await res.text();
 cache.delete(path);
 if(cache.size>=100)cache.delete(cache.keys().next().value!);
 cache.set(path,{at:Date.now(),html});
 return html;
}
/** Read-only bridge to the retained Webflow CMS publishing origin. Never fetch
 * the production /templates mount: that would loop after routing promotion. */
export async function publishedCms(path:string){
 if(!/^\/(?:[a-z0-9-]+\/?)*(?:\?[a-z0-9]+_page=\d+)?$/.test(path))throw new Error('Invalid CMS path');
 const hit=cache.get(path),age=hit?Date.now()-hit.at:Infinity;
 let html=hit&&age<CMS_STALE_MS?hit.html:undefined;
 if(hit&&age>=CMS_TTL_MS&&html&&!hit.refreshing){
  hit.refreshing=true;
  fetchCms(path).catch(error=>{if(error instanceof CmsNotFound)cache.delete(path);else hit.refreshing=false;});
 }
 html??=await fetchCms(path);
 const $=load(html);
 $('script,iframe,object,embed,base,link[rel="preload"],link[rel="modulepreload"]').remove();
 $('*').each((_,e)=>{
  for(const [key,value]of Object.entries('attribs' in e ? e.attribs : {})){
   if(key.startsWith('on'))$(e).removeAttr(key);
   if(['href','src','action'].includes(key)&&/^\s*(?:javascript|data|vbscript):/i.test(value))$(e).removeAttr(key);
  }
 });
 $('a[href]').each((_,e)=>{
  let href=$(e).attr('href')!;
  if(href.startsWith('/')&&!href.startsWith('/templates')&&!href.startsWith('//'))href='https://webflow.com/templates'+href;
  if(href.startsWith('https://templates.webflow.com/'))href=href.replace('https://templates.webflow.com/','https://webflow.com/templates/');
  if(!href.startsWith('#'))$(e).attr('href',localLink(href));
 });
 return $;
}
export function cmsProps($:ReturnType<typeof load>,name:string):Record<string,unknown>|undefined{
 for(const element of $('code-island').toArray()){
  try{const el=$(element);if(JSON.parse(el.attr('data-loader')||'{}').val?.submoduleId===name)return JSON.parse(el.attr('data-props')||'{}')}catch{}
 }
}
