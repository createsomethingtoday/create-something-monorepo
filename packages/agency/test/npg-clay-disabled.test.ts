import test from 'node:test';
import assert from 'node:assert/strict';
import {POST} from '../src/routes/api/abundance/healthcare-providers/enrichment/+server.ts';
test('alternate Agency Clay POST stays disabled even with integration credentials present',async()=>{
 const url=new URL('https://createsomething.agency/api/abundance/healthcare-providers/enrichment');
 const response=await POST({url,request:new Request(url,{method:'POST',headers:{authorization:'Bearer fixture'},body:'{}'}),platform:{env:{AGENCY_INTERNAL_API_KEY:'fixture',CLAY_NPG_WEBHOOK_URL:'https://api.clay.com/fixture',CLAY_NPG_WEBHOOK_AUTH_TOKEN:'fixture',DB:{prepare(){throw Error('No dispatch or receipt write allowed')}}}},fetch:()=>{throw Error('No vendor calls allowed')}} as any);
 assert.equal(response.status,410);
 const result=await response.json() as {error:string};assert.match(result.error,/retired/i);
});
test('retired callback authenticates original job credential and never updates audit records',async()=>{
 const {POST:callback}=await import('../src/routes/api/webhooks/npg-clay/+server.ts');
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('original-token'))),b=>b.toString(16).padStart(2,'0')).join('');
 const call=(token:string)=>callback({request:new Request('https://createsomething.agency/api/webhooks/npg-clay',{method:'POST',body:JSON.stringify({request_id:'npgclay_12345678-1234-1234-1234-123456789abc',callback_token:token,result:{outcome:'no_match'}})}),platform:{env:{DB:{prepare(sql:string){assert.equal(sql,'SELECT callback_hash FROM abundance_clay_jobs WHERE id=?');return {bind(){return {first:async()=>({callback_hash:hash})}}}}}}}} as any);
 assert.equal((await call('wrong')).status,401);assert.equal((await call('original-token')).status,410);
});
