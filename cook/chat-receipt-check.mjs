import {createServer} from '../apps/gigi-desktop/node_modules/vite/dist/node/index.js';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const {chromium}=createRequire(new URL('../packages/agency/package.json',import.meta.url))('@playwright/test');
const root=resolve('apps/gigi-desktop');
const server=await createServer({root,configFile:resolve(root,'vite.config.mjs'),server:{port:0,host:'127.0.0.1'}});await server.listen();
const browser=await chromium.launch({headless:true,channel:'chrome'});
try{
 const page=await browser.newPage({viewport:{width:880,height:620},reducedMotion:'reduce'});
 await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/?fixture=overview&recovery=1`);await page.waitForFunction(()=>globalThis.gigiTest);
 const set=async current=>page.evaluate(current=>gigiTest.setChat({visible:true,status:{available:true,authenticated:true},pending:false,reading:false,error:null,current}),current);
 const base={sessionId:'receipt-regression',messages:[],approvals:[],recordLinks:[]};
 await page.evaluate(()=>gigiTest.setChat({visible:true,status:{available:true,authenticated:true},pending:false,reading:false,error:null,current:null,refreshRequired:true}));
 assert.equal(await page.locator('.chat-empty').count(),1,'Initial open has no saved transcript to refresh and retains welcome');
 assert.equal(await page.locator('[data-chat-prompt]').count(),3,'Initial open retains all three unsent starters');
 await set({...base,state:'idle'});
 assert.equal(await page.locator('.chat-empty').count(),0,'A selected conversation still awaiting readback must not show welcome');
 assert.equal(await page.locator('[data-chat-prompt]').count(),0,'A selected stale conversation must not show starters');
 await page.evaluate(()=>gigiTest.setChat({refreshRequired:false}));
 await set({...base,state:'interrupted',sendReceipt:{requestId:'accepted-request',turnId:'accepted-turn',accepted:true}});
 assert.equal(await page.locator('.chat-suggestions').count(),0,'Accepted interruption must not show new-chat starters');
 assert.equal(await page.locator('.chat-empty').count(),0,'Accepted interruption must not show empty-chat welcome');
 const interruption=page.getByText('This response was interrupted. You can send another message.',{exact:true});await interruption.waitFor();
 const aboveComposer=async locator=>{
  const item=await locator.boundingBox();const composer=await page.locator('.chat-panel form').boundingBox();
  assert.ok(item&&composer&&item.y>=0&&item.y+item.height<=composer.y,'Recovery content must be fully above composer at880x620');
 };
 await aboveComposer(interruption);
 for(const messages of [[],[{id:'verified-message',role:'assistant',text:'The rehearsal task was saved and read back. Open the linked task to inspect it.'}]]){
 await set({...base,messages,state:'idle',decisionReceipt:{outcome:'verified'},recordLinks:[{entity:'tasks',id:'task-1',title:'Confirm the rehearsal time'}]});
 const receipt=page.getByText('Changes saved and verified in GiGi.',{exact:true});await receipt.waitFor();
 const link=page.getByRole('button',{name:'Open record: Confirm the rehearsal time ↗',exact:true});await link.waitFor();
 assert.equal(await page.locator('.chat-suggestions').count(),0,'Verified receipt must not show starters');
 await aboveComposer(receipt);await aboveComposer(link);
 }
 await page.locator('[data-chat-new]').click();await page.locator('.chat-suggestions').waitFor();
 assert.equal(await page.locator('.chat-empty').count(),1,'Fresh new chat retains welcome');
 assert.ok(await page.getByRole('button',{name:'Help me plan today',exact:true}).isVisible(),'Fresh new chat retains starters');
 console.log('PASS accepted interruption and empty verified receipt/link fully above composer at880x620; no response-state starters; fresh New chat retains welcome/starters. Synthetic Chromium only.');
}finally{await browser.close();await server.close();}
