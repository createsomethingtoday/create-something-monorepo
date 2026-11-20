/** Actual local Workerd/D1/Queue qualification via separate synthetic owner-cookie
 * proxies :8908 and :8909. No browser fetch interception or production writes.
 * Run: ego-browser nodejs < packages/a2a/scripts/verify-shared-context.ego.mjs
 */
const fs=await import('node:fs/promises'),assert=(await import('node:assert/strict')).default;
const output='/Users/createsomething/Documents/Codex/agent-inbox-release-2026-11-09/cre-2392-shared-context';await fs.mkdir(output,{recursive:true});
const task=await taskSpace('CRE-2392 shared context qualification');console.log({spaceId:task.spaceId});const alice=task.page('p1');const pages=await task.pages();const bob=pages.find(p=>p.label==='p2')??await task.newPage();
const thread=JSON.parse(await fs.readFile('/tmp/cre-2392-runtime/thread.json','utf8')).threadId;
await alice.goto('http://127.0.0.1:8908/app');await alice.waitForSelector('#console',{state:'visible'});await alice.click(`[data-thread-id="${thread}"]`);await alice.click('.shared-context > summary');
const existing=JSON.parse((await alice.fetch('/api/v1/context?threadId='+thread)).body).resources;assert.ok(existing.length>=1,'Share the1MiB synthetic project-context.md first');const resource=existing.find(r=>r.byteLength===1048576);assert.ok(resource,'Expected the original1MiB fixture');
const row=`.shared-context [data-context-id="${resource.id}"]`;
await alice.click(row+' button:text-is("Read document")');await alice.waitForFunction(()=>!document.querySelector('.context-preview').hidden&&document.querySelector('.context-content').textContent.length>100);
assert.ok(await alice.evaluate(()=>new TextEncoder().encode(document.querySelector('.context-content').textContent).byteLength<=16384));assert.equal(await alice.evaluate(()=>window.contextXss??false),false);
await alice.fill('#context-search','CONTEXT_NEEDLE');await alice.click('.context-search-form button[type=submit]');await alice.waitForFunction(()=>document.querySelector('.context-search-results').textContent.includes('1 match'));
await bob.goto('http://127.0.0.1:8909/app');await bob.waitForSelector('#console',{state:'visible'});await bob.click(`[data-thread-id="${thread}"]`);await bob.click('.shared-context > summary');await bob.waitForSelector('.context-document',{state:'visible'});
assert.equal(await bob.evaluate(()=>[...document.querySelectorAll('.context-document button')].some(b=>b.textContent==='Revoke access')),false);
await bob.click(row+' button:text-is("Read document")');await bob.waitForFunction(()=>document.querySelector('.context-content').textContent.length>100);
await bob.click('loc=role:button[name="Next part"]');await bob.waitForFunction(()=>document.querySelector('.context-preview>.small').textContent.startsWith('Part 2'));
await bob.click(row+' button:text-is("Draft summary + reference")');assert.equal(await bob.evaluate(()=>document.querySelector('input[name=kind]:checked').value),'conversation');assert.ok((await bob.evaluate(()=>document.querySelector('#message-text').value)).includes(resource.uri));
if(!await bob.evaluate(uri=>[...document.querySelectorAll('.message-text')].some(e=>e.textContent.includes(uri)),resource.uri)){await bob.click('#send-owner-message');await bob.waitForFunction(()=>document.querySelector('#notice').textContent.includes('Conversation posted'));}
await bob.click('button:text-is("Open shared document") >> nth=0');await bob.waitForFunction(()=>document.querySelector('.context-content').textContent.length>100);
const report=[];
for(const width of [320,390,768,1024,1025,1440]){
 await bob.cdp('Emulation.setDeviceMetricsOverride',{width,height:950,deviceScaleFactor:1,mobile:false});await bob.waitForFunction(()=>document.fonts.status==='loaded');
 const value=await bob.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,shortButtons:[...document.querySelectorAll('button')].filter(b=>{const r=b.getBoundingClientRect();return r.height>0&&r.height<44}).map(b=>b.textContent),xss:window.contextXss??false}));assert.equal(value.width,value.scrollWidth,'overflow '+width);assert.deepEqual(value.shortButtons,[]);assert.equal(value.xss,false);report.push(value);await bob.screenshot({path:output+'/context-reader-'+width+'.png',fullPage:true});
}
await bob.cdp('Network.enable');await bob.cdp('Network.emulateNetworkConditions',{offline:false,latency:900,downloadThroughput:-1,uploadThroughput:-1});
try{await bob.click('loc=role:button[name="Next part"]');await bob.focus('#new-message');await bob.waitForFunction(()=>document.querySelector('.context-preview>.small').textContent.startsWith('Part 2'));assert.equal(await bob.evaluate(()=>document.activeElement.id),'new-message','Part read must respect intervening focus');}finally{await bob.cdp('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});}
await alice.click('loc=role:button[name="Share a document"]');await alice.setInputFiles('#context-file',['/tmp/cre-2392-runtime/too-large.txt']);await alice.fill('#context-title','Too large');await alice.fill('#context-summary','Rejected locally.');await alice.click('.context-share-form button[type=submit]');assert.match(await alice.evaluate(()=>document.querySelector('.context-status').textContent),/no larger than 1 MiB/);
// Failed owner writes keep keyboard focus and the explicit document draft.
await alice.setInputFiles('#context-file',['/tmp/cre-2392-runtime/project-context.md']);await alice.fill('#context-title','Offline retry context');await alice.fill('#context-summary','Synthetic focus regression.');
await alice.cdp('Network.enable');await alice.cdp('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:-1,uploadThroughput:-1});
try{await alice.focus('.context-share-form button[type=submit]');await alice.press('.context-share-form button[type=submit]','Enter');await alice.waitForFunction(()=>!document.querySelector('.context-share-form button[type=submit]').disabled);assert.equal(await alice.evaluate(()=>document.activeElement===document.querySelector('.context-share-form button[type=submit]')),true,'Failed upload returns focus to submit');assert.equal(await alice.evaluate(()=>document.querySelector('#context-title').value),'Offline retry context');}finally{await alice.cdp('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});}
await alice.click('.context-share-form button:text-is("Cancel")');
await alice.click(row+' button:text-is("Revoke access")');await alice.cdp('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:-1,uploadThroughput:-1});
try{await alice.press(row+' button:text-is("Confirm revoke")','Enter');await alice.waitForFunction(()=>document.querySelector('.context-status').textContent.includes('Revocation could not be confirmed'));assert.equal(await alice.evaluate(()=>document.activeElement.textContent),'Confirm revoke','Failed revoke returns focus to confirm');}finally{await alice.cdp('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});}
await alice.click(row+' button:text-is("Keep shared")');
// Each creator control identifies the exact thread copy, even for identical files.
await alice.click('[data-pane="access"]');await alice.click('.owned-context > summary');await alice.waitForFunction(()=>!document.querySelector('.owned-context button').disabled);
const managed=JSON.parse((await alice.fetch('/api/v1/owned-context')).body).resources;
for(const copy of managed){const shown=await alice.evaluate(id=>document.querySelector(`.owned-context [data-context-id="${id}"]`).textContent,copy.id);assert.ok(shown.includes(copy.threadId),'Creator controls must identify the thread');assert.ok(shown.includes(copy.uri),'Creator controls must identify the immutable copy');}
await fs.writeFile(output+'/rendered-report.json',JSON.stringify({checkedAt:new Date().toISOString(),thread,resource,report,source:'Actual local Workerd/D1/Queue; no intercepted fetch'},null,2));console.log({passed:true,thread,resource:resource.id,viewports:report.length});
