import type {APIRoute} from 'astro';
import {SEARCH_ORIGIN,localizePayload} from '../../../../lib/api';
export const GET:APIRoute=async({url})=>{
 try{
  const response=await fetch(`${SEARCH_ORIGIN}/api/templates/taxonomy?${url.searchParams}`,{signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw new Error('Taxonomy unavailable');
  return new Response(JSON.stringify(localizePayload(await response.json())),{headers:{'Content-Type':'application/json','Cache-Control':'public, max-age=60'}});
 }catch{return new Response(JSON.stringify({error:'Taxonomy temporarily unavailable'}),{status:503,headers:{'Content-Type':'application/json'}})}
};
