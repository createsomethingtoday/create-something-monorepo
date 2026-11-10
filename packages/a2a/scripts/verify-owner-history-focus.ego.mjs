/** Read-only actual-runtime keyboard regression. Requires the local two-owner
 * fixture to contain a thread >100 messages (independent qualification seeds one).
 * The pre-fix result was BODY after pressing Enter to reveal earlier messages.
 */
const assert=(await import('node:assert/strict')).default;
const fs=await import('node:fs/promises');const task=await taskSpace('CRE-2389 owner conversation review');const page=task.page('p1');
await page.goto('http://127.0.0.1:8898/app');await page.waitForSelector('#console',{state:'visible'});
const history=JSON.parse((await page.fetch('/api/v1/messages?agentId=fixture-alice&view=history')).body);
let thread;
for(const id of [...new Set(history.messages.map(m=>m.threadId))].slice(0,10)){
 const response=await page.fetch('/api/v1/conversations/'+encodeURIComponent(id)+'?agentId=fixture-alice');const value=JSON.parse(response.body);if(value.hasMore){thread=id;break;}
}
assert.ok(thread,'Seed a >100-message synthetic conversation before this regression');
await page.click('[data-thread-id="'+thread+'"]');await page.waitForSelector('[data-load-earlier]',{state:'visible'});
await page.focus('[data-load-earlier]');await page.keyboard.press('Enter');
await page.waitForFunction(()=>document.querySelectorAll('.message-record').length>100);
const focus=await page.evaluate(()=>({tag:document.activeElement.tagName,messageId:document.activeElement.dataset.messageId,visible:document.activeElement.getBoundingClientRect().top<innerHeight}));
assert.equal(focus.tag,'ARTICLE');assert.ok(focus.messageId);assert.equal(focus.visible,true);
await fs.writeFile('/Users/createsomething/Documents/Codex/agent-inbox-release-2026-11-09/cre-2389-owner-chat/history-focus-regression.json',JSON.stringify({checkedAt:new Date().toISOString(),thread,focus},null,2));console.log({passed:true,thread,focus});
