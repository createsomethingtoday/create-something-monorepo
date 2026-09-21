import { localLink } from './routes.mjs';
export const SEARCH_ORIGIN='https://webflow-template-search.webflow-inc.workers.dev';
export interface Term {name:string;slug:string;url?:string;count?:number}
export interface Template {id:string;template_slug:string;name:string;url:string;creator_name:string;creator_slug:string;creator_profile_url:string;creator_avatar_url:string;thumbnail_image_url:string;thumbnail_image_secondary_url:string;price:number;is_free:boolean;is_featured:boolean;website_url:string;preview_url:string;purchase_url:string;description_short?:string;description?:string;included_pages?:string[];features?:string[];category_groups?:Term[];child_categories?:Term[];styles?:Term[];published_date?:string;[key:string]:unknown}
export interface SearchResult {items:Template[];pagination:{total_items:number;total_pages:number;page:number};category_pills:Term[];subcategory_pills:Term[];available_facets?:{styles:Term[]}}
export async function search(params:URLSearchParams|Record<string,string>):Promise<SearchResult>{
 const query=new URLSearchParams(params);
 if(query.get('q')?.trim())query.set('strict','true');
 const response=await fetch(`${SEARCH_ORIGIN}/api/templates/search?${query}`,{signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw new Error(`Catalog unavailable (${response.status})`);
 return response.json();
}
export function localizePayload(value:unknown):unknown {
 if(Array.isArray(value))return value.map(localizePayload);
 if(value && typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,v])=>[key,['url','creator_profile_url'].includes(key)&&typeof v==='string'?localLink(v):localizePayload(v)]));
 return value;
}
