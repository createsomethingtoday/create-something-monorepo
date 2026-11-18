import {json} from '@sveltejs/kit';
import type {RequestHandler} from './$types';
import {isValidAbundanceApiBearer} from '$lib/server/abundance-api-auth';
const retired:RequestHandler=async({request,platform})=>{
 if(!await isValidAbundanceApiBearer(request.headers.get('authorization'),platform?.env?.AGENCY_INTERNAL_API_KEY)) return json({success:false,error:'Unauthorized'},{status:401});
 return json({success:false,error:'Integration retired. Historical receipts are retained for audit.'},{status:410,headers:{'Cache-Control':'private, no-store'}});
};
export const GET=retired;
export const POST=retired;
