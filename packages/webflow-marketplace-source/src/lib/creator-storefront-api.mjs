import {safeProfileUrl,safeContactUrl} from './creator-storefront.mjs';

const slugPattern=/^[a-z0-9][a-z0-9-]{0,127}$/;
const text=(value,max)=>typeof value==='string'?value.trim().slice(0,max):'';

/** Public allow-list only: creator identity always comes from the Marketplace CMS. */
export function publishedCustomization(value,slug){
 if(!value||value.schema!==1||value.creatorSlug!==slug||!Number.isSafeInteger(value.version)||value.version<1||!Array.isArray(value.selections)||!Array.isArray(value.links))return null;
 const seen=new Set();
 const picks=value.selections.flatMap(pin=>{
  if(!pin||typeof pin.templateSlug!=='string'||!slugPattern.test(pin.templateSlug)||seen.has(pin.templateSlug))return [];
  seen.add(pin.templateSlug);return [{slug:pin.templateSlug,note:text(pin.note,240)}];
 }).slice(0,3);
 return {headline:text(value.positioning,120),coverUrl:safeProfileUrl(value.cover?.url),coverAlt:text(value.cover?.alt,240),portfolioUrl:value.links.map(link=>safeProfileUrl(link?.href)).find(Boolean)||'',support:text(value.support?.text,400),contactUrl:safeContactUrl(value.support?.href),picks};
}

/** Optional enhancement: a bounded, uncached server read; outages preserve the CMS profile. */
export async function readPublishedStorefront(slug,{origin,fetchImpl=fetch,timeoutMs=2500}={}){
 if(!origin||!slugPattern.test(slug))return null;
 try{
  const base=new URL(origin);
  if(base.protocol!=='https:'||base.username||base.password||base.pathname!=='/'||base.search||base.hash)return null;
  const response=await fetchImpl(new URL(`/v1/storefronts/${encodeURIComponent(slug)}`,base),{signal:AbortSignal.timeout(timeoutMs),cache:'no-store',redirect:'manual',headers:{Accept:'application/json'}});
  if(!response.ok)return null;
  return publishedCustomization(await response.json(),slug);
 }catch{return null;}
}
