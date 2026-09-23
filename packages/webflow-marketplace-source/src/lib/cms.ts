import {load} from 'cheerio';
import {localLink} from './routes.mjs';
export class CmsNotFound extends Error {}
const cache=new Map<string,{expires:number;html:string}>();
/** Read-only bridge to the retained Webflow CMS publishing origin. Never fetch
 * the production /templates mount: that would loop after routing promotion. */
export async function publishedCms(path:string){
 if(!/^\/(?:[a-z0-9-]+\/?)*$/.test(path))throw new Error('Invalid CMS path');
 let html=cache.get(path)?.expires!>Date.now()?cache.get(path)!.html:undefined;
 if(!html){
  // Edge fetch supports manual redirects; the non-2xx check below rejects them.
  const res=await fetch(`https://templates.webflow.com${path}`,{signal:AbortSignal.timeout(15000),redirect:'manual'});
  if(res.status===404)throw new CmsNotFound('CMS page not found');
  if(!res.ok)throw new Error(`CMS returned ${res.status}`);
  html=await res.text();
  if(cache.size>=100)cache.delete(cache.keys().next().value!);
  cache.set(path,{html,expires:Date.now()+60000});
 }
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
