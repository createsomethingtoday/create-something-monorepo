import type { APIRoute } from 'astro';
import {search,localizePayload} from '../../../../lib/api';
export const GET:APIRoute=async({url})=>{
 try{return new Response(JSON.stringify(localizePayload(await search(url.searchParams))),{headers:{'Content-Type':'application/json','Cache-Control':'public, max-age=30'}})}
 catch{return new Response(JSON.stringify({error:'Catalog temporarily unavailable'}),{status:503,headers:{'Content-Type':'application/json'}})}
};
