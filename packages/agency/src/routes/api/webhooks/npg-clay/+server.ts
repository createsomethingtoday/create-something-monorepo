import {json} from '@sveltejs/kit';
import type {RequestHandler} from './$types';
export const POST:RequestHandler=async({request,platform})=>{
 if(!platform?.env?.DB) return json({success:false},{status:503});
 try{
  const text=await request.text();if(text.length>15000) return json({success:false},{status:413});
  const input=JSON.parse(text);
  if(typeof input.request_id!=='string'||typeof input.callback_token!=='string'||input.callback_token.length>200) return json({success:false},{status:401});
  const job=await platform.env.DB.prepare('SELECT callback_hash FROM abundance_clay_jobs WHERE id=?').bind(input.request_id).first<{callback_hash:string}>();
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(input.callback_token));
  const hash=Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
  let mismatch=job?hash.length^job.callback_hash.length:1;
  for(let i=0;i<hash.length;i++) mismatch|=hash.charCodeAt(i)^(job?.callback_hash.charCodeAt(i)??0);
  if(!job||mismatch!==0) return json({success:false},{status:401});
  return json({success:false,error:'Integration retired. Historical receipts are retained for audit.'},{status:410,headers:{'Cache-Control':'no-store'}});
 }catch{return json({success:false},{status:401});}
};
