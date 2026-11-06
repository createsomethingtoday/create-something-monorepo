import type {APIRoute} from 'astro';
import {BOOKING_URL} from '../../lib/booking';
export const GET:APIRoute=async()=>{
 let available=false;
 try{const response=await fetch(BOOKING_URL,{signal:AbortSignal.timeout(12000),redirect:'follow'});const html=await response.text();available=response.ok&&new URL(response.url).hostname==='calendly.com'&&!/<title>[^<]*404|Sorry, we (?:can’t|can't) find that page/i.test(html);}catch{}
 return new Response(JSON.stringify({available,url:BOOKING_URL}),{headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
};
