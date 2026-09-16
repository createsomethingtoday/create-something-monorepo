import {json} from '@sveltejs/kit';
import {ZodError} from 'zod';
import type {RequestHandler} from './$types';
import {isValidAbundanceApiBearer} from '$lib/server/abundance-api-auth';
import {readGeocodeSource,importGeocodes} from '$lib/server/abundance-geocode-import';
const handle:RequestHandler=async({request,url,platform})=>{
 const env=platform?.env;
 if(!await isValidAbundanceApiBearer(request.headers.get('authorization'),env?.AGENCY_INTERNAL_API_KEY))return json({success:false,error:'Unauthorized'},{status:401});
 if(!env?.DB)return json({success:false,error:'Database unavailable'},{status:503});
 try{
  let data;
  if(request.method==='GET')data=await readGeocodeSource(env.DB,url.searchParams.get('run_id')??'',url.searchParams.get('cursor')??'');
  else{
   const raw=await request.text();if(raw.length>1_000_000)throw new TypeError('Geocode batch is too large.');
   data=await importGeocodes(env.DB,JSON.parse(raw));
  }
  return json({success:true,data},{headers:{'Cache-Control':'private, no-store'}});
 }catch(cause){
  const invalid=cause instanceof TypeError||cause instanceof ZodError||cause instanceof SyntaxError;
  return json({success:false,error:invalid?'Invalid geocode batch or snapshot; verify source versions and input.':'Geocode import unavailable; retry the same batch.'},{status:invalid?400:503});
 }
};
export const GET=handle;export const POST=handle;
