/** Real local Workerd/D1 fixture, not intercepted browser fetch.
 * Alice owner proxy :8898 and Bob owner proxy :8899 inject separate synthetic
 * encrypted cookie sessions. No production identity, data, or writes are used.
 * Run with ego-browser nodejs < this file after setup and build.
 */
const assert=(await import('node:assert/strict')).default;
const fs=await import('node:fs/promises');
const output='/Users/createsomething/Documents/Codex/agent-inbox-release-2026-11-09/cre-2389-owner-chat';await fs.mkdir(output,{recursive:true});
const task=await taskSpace('CRE-2389 owner conversation review');console.log({spaceId:task.spaceId});
const alice=task.page('p1');
const managed=await task.pages();const bob=managed.find(p=>p.label==='p2')??await task.newPage();
const stamp=Date.now();const text=`Owner participation check ${stamp}. <img src=x onerror="window.ownerXss=true">`;
await alice.goto('http://127.0.0.1:8898/app');await alice.waitForSelector('#console',{state:'visible'});
await alice.click('#new-message');await alice.fill('#recipient-id','fixture-bob');await alice.fill('#message-text',text);
assert.equal(await alice.evaluate(()=>document.querySelector('input[name=kind]:checked').value),'conversation');
assert.match(await alice.evaluate(()=>document.querySelector('#compose-identity').textContent),/Alice/);
await alice.click('#send-owner-message');await alice.waitForFunction(()=>document.querySelector('#notice').textContent.includes('Conversation posted'));
await alice.waitForFunction(()=>document.querySelector('.conversation-participants').textContent.includes('Alice'));
const threadId=await alice.evaluate(()=>document.querySelector('.thread-reference p').textContent);
assert.equal(await alice.evaluate(()=>window.ownerXss??false),false);
await bob.goto('http://127.0.0.1:8899/app');await bob.waitForSelector('#console',{state:'visible'});
await bob.click('.thread-button >> nth=0');await bob.waitForFunction(()=>document.querySelector('.conversation-participants').textContent.includes('Alice'));
assert.match(await bob.evaluate(()=>document.querySelector('#conversation').textContent),/AliceOwner/);
assert.match(await bob.evaluate(()=>document.querySelector('#conversation').textContent),/No Dot work requested/);
await bob.click('.reply-button');await bob.fill('#message-text','Bob joins as himself. No agent assignment.');await bob.click('#send-owner-message');await bob.waitForFunction(()=>document.querySelector('#notice').textContent.includes('Conversation posted'));
assert.equal(await bob.evaluate(()=>document.querySelectorAll('.message-record[data-author=owner]').length),2);
const rpc=await alice.fetch('/mcp',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'a2a_send_message',arguments:{from_agent_id:'fixture-alice',to_agent_id:'fixture-bob',thread_id:threadId,text:'Synthetic Dot work request',idempotency_key:'ui-dot-'+stamp}}})});
assert.ok(JSON.parse(rpc.body).result.structuredContent.message);
await bob.click('#refresh');await bob.waitForFunction(()=>document.querySelectorAll('.message-record[data-author=agent]').length===1);
assert.match(await bob.evaluate(()=>document.querySelector('.message-record[data-author=agent]').textContent),/Canon fixtureDot/);
await bob.click('.reply-button');await bob.click('input[name=kind][value=request]');
assert.match(await bob.evaluate(()=>document.querySelector('#compose-mode-help').textContent),/receiving owner/);
await bob.fill('#message-text','Explicit owner work request follows recipient policy.');await bob.click('#send-owner-message');await bob.waitForFunction(()=>document.querySelector('#notice').textContent.includes('Work request stored'));
const report=[];
for(const width of [320,390,768,1024,1025,1440]){
 await bob.cdp('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
 await bob.waitForFunction(()=>document.fonts.status==='loaded');
 const measure=await bob.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,xss:window.ownerXss??false,shortButtons:[...document.querySelectorAll('button')].filter(b=>{const r=b.getBoundingClientRect();return r.height>0&&r.height<44}).map(b=>b.textContent)}));
 assert.equal(measure.scrollWidth,width,'No horizontal overflow at '+width);assert.deepEqual(measure.shortButtons,[]);assert.equal(measure.xss,false);report.push(measure);
 await bob.screenshot({path:output+'/owner-thread-'+width+'.png',fullPage:true});
}
await bob.click('.reply-button');await bob.cdp('Emulation.setDeviceMetricsOverride',{width:390,height:900,deviceScaleFactor:1,mobile:false});
await bob.screenshot({path:output+'/owner-composer-390.png',fullPage:true});
await bob.focus('input[name=kind][value=conversation]');await bob.keyboard.press('ArrowRight');assert.equal(await bob.evaluate(()=>document.querySelector('input[name=kind]:checked').value),'request');
await bob.keyboard.press('ArrowLeft');assert.equal(await bob.evaluate(()=>document.querySelector('input[name=kind]:checked').value),'conversation');
await bob.click('#cancel-compose');
await fs.writeFile(output+'/rendered-local-report.json',JSON.stringify({checkedAt:new Date().toISOString(),runtime:'Actual local Workerd D1 and Queue; two synthetic owner-cookie proxies; no production write',threadId,report},null,2));
console.log({passed:true,threadId,viewports:report.length,output});
// Parent retains this owned space for direct visual review, then finishes it.
