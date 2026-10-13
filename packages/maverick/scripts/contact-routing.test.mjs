import test from 'node:test';
import assert from 'node:assert/strict';
import { POST } from '../.svelte-kit/output/server/entries/endpoints/api/contact/_server.ts.js';

test('invalid contact fails before any database or email access', async () => {
 await assert.rejects(() => POST({ request: new Request('https://fixture.invalid/api/contact', {method:'POST', body:'{}'}), platform: {}, getClientAddress: () => '127.0.0.1' }), e => e.status === 400);
});

test('synthetic contact notifies the previously approved sales recipient only', async () => {
 const sent=[]; let stored;
 const originalFetch=globalThis.fetch;
 globalThis.fetch=async (url,options) => {
  assert.equal(url,'https://api.resend.com/emails');
  sent.push(JSON.parse(options.body));
  return Response.json({id:'synthetic-only'});
 };
 try {
  const DB={prepare:sql=>{ assert.match(sql,/INSERT INTO contact_submissions/); return {bind:(...args)=>{stored=args;return {run:async()=>({success:true})}}}}};
  const response=await POST({request:new Request('https://fixture.invalid/api/contact',{method:'POST',body:JSON.stringify({name:'Synthetic Test',email:'synthetic@example.invalid',company:'Local fixture',category:'petrox',comment:'<synthetic>'})}),platform:{env:{DB,RESEND_API_KEY:'synthetic-not-a-secret'}},getClientAddress:()=> '127.0.0.1'});
  assert.equal(response.status,200);
  assert.equal(stored[5],'petrox');
  assert.equal(sent.length,2);
  assert.deepEqual(sent[1].to,['matthew.fontenot@maverickx.com']);
  assert.match(sent[1].html,/&lt;synthetic&gt;/);
  assert.doesNotMatch(sent[0].html,/24 hours|two business days/);
 } finally { globalThis.fetch=originalFetch; }
});
