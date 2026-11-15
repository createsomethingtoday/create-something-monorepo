// Fixed synthetic states; never opens native data or provider accounts.
import {createServer} from '../apps/gigi-desktop/node_modules/vite/dist/node/index.js';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
const {chromium}=createRequire(new URL('../packages/agency/package.json',import.meta.url))('@playwright/test');
const root=resolve(process.argv[2]||'apps/gigi-desktop');
const out=resolve(process.argv[3]||'cook/stills/r01');mkdirSync(out,{recursive:true});
const server=await createServer({root,configFile:resolve(root,'vite.config.mjs'),server:{port:0,host:'127.0.0.1',watch:{ignored:['**/*']}}});await server.listen();
const browser=await chromium.launch({headless:true,channel:'chrome'});
const findings=[];
try{
 for(const width of [390,880,1280]){
 const page=await browser.newPage({viewport:{width,height:width===880?620:840},reducedMotion:'reduce'});
 page.setDefaultTimeout(10000);
 await page.addInitScript(()=>{Date.now=()=>Date.parse('2026-11-15T21:00:00Z');});
 for(const state of (process.argv.includes('--finances-only')?['finances']:['overview','music','settings','finances'])){
 await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/?fixture=${state}&recovery=1`);await page.waitForFunction(()=>globalThis.gigiTest);
 if(state==='finances')await page.evaluate(()=>gigiTest.set({selected:{id:'source-money',entity:'finances',title:'Synthetic payment',fields:{Amount:12500,Direction:'Income',Status:'Paid'},source:{kind:'import',provider:'statement',externalId:'synthetic-statement-row'}},sourceExpanded:true}));
 await page.screenshot({path:resolve(out,`${state}-${width}.png`),fullPage:true});
 if(state==='overview'||state==='finances'||state==='music'){await page.locator('#astryx-app-shell-main').evaluate(node=>{node.scrollTop=node.scrollHeight;});await page.screenshot({path:resolve(out,`${state}-detail-${width}.png`),fullPage:true});}
 findings.push({state,width,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)});
 }
 if(process.argv.includes('--finances-only')){await page.close();continue;}
 // Populate saved context in the active synthetic runtime, never native data.
 await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/?fixture=overview&recovery=1`);await page.waitForFunction(()=>globalThis.gigiTest);
 await page.evaluate(async()=>{gigiTest.records.tasks.push({id:'waiting-fixture',entity:'tasks',title:'Confirm the venue load-in',fields:{Status:'Waiting'},source:{kind:'manual'}});gigiTest.records.notes.push({id:'pinned-fixture',entity:'notes',title:'Stage plot · current rehearsal',fields:{Pinned:true},source:{kind:'manual'}});await gigiTest.open('overview');});
 await page.locator('.working-week-group').first().scrollIntoViewIfNeeded().catch(()=>{});await page.screenshot({path:resolve(out,`working-week-${width}.png`),fullPage:true});
 await page.evaluate(()=>gigiTest.open('settings'));
 const source={provider:'googlecalendar',state:'connected',connectedAccountId:'synthetic-calendar-account',configured:true,access:{state:'admitted'},accountLabel:{value:'rehearsal@example.invalid'}};
 for(const coverage of ['bounded','complete']){
 await page.evaluate(({source,coverage})=>gigiTest.set({sources:{googlecalendar:source},sourceDrafts:{googlecalendar:{from:'2026-11-09',to:'2026-11-16'}},imports:{googlecalendar:{accountId:source.connectedAccountId,preview:{previewId:'synthetic-preview',coverage,fetchedAt:1794776400,scannedCount:1,selectedCount:1,newCount:1,existingCount:0,records:[{id:'all-day-synthetic',title:'All-day rehearsal · Nov 12–14 (exclusive end)',fields:{Date:'2026-11-12/2026-11-14','All Day':true}}]}}}}),{source,coverage});
 await page.locator('[data-source-preview="googlecalendar"]').scrollIntoViewIfNeeded();
 await page.screenshot({path:resolve(out,`calendar-${coverage}-${width}.png`),fullPage:true});
 findings.push({state:`calendar-${coverage}`,width,visiblePreview:await page.getByText('Review before importing',{exact:true}).isVisible()});
 }
 await page.evaluate(({source})=>{gigiTest.set({sources:{googlecalendar:source},imports:{}});gigiTest.failNext('sources.preview','Synthetic source page unavailable. Try the preview again.');},{source});
 await page.locator('[data-source-preview="googlecalendar"]').click();await page.getByText('Synthetic source page unavailable. Try the preview again.',{exact:true}).waitFor();
 await page.screenshot({path:resolve(out,`source-failure-${width}.png`),fullPage:true});
 await page.locator('[data-source-preview="googlecalendar"]').click();await page.getByText('Recovered synthetic rehearsal',{exact:true}).waitFor();
 if(await page.getByText('Synthetic source page unavailable. Try the preview again.',{exact:true}).count())throw Error('Recovered preview retained failure notice');
 findings.push({state:'source-preview-retry',width,invoked:await page.evaluate(()=>gigiTest.calls.filter(c=>c.operation==='sources.preview').length>=2)});
 await page.screenshot({path:resolve(out,`source-retry-${width}.png`),fullPage:true});
 await page.evaluate(()=>gigiTest.set({sources:{googlecalendar:{provider:'googlecalendar',state:'connected',connectedAccountId:'synthetic-calendar-account',configured:true,access:{state:'admitted'},accountLabel:{value:'rehearsal@example.invalid'}}}}));
 await page.locator('#source-connections').scrollIntoViewIfNeeded();await page.screenshot({path:resolve(out,`connected-onboarding-${width}.png`),fullPage:true});
 await page.getByRole('button',{name:'Dismiss message',exact:true}).click().catch(()=>{});
 if(await page.evaluate(()=>Boolean(gigiTest.setChat))){
 await page.evaluate(()=>gigiTest.setChat({visible:true,status:{available:true,authenticated:true},error:'turn_outcome_unknown',current:{sessionId:'synthetic-uncertain',state:'interrupted',messages:[],approvals:[],recordLinks:[],error:'turn_outcome_unknown',decisionReceipt:{outcome:'unknown'}}}));
 await page.screenshot({path:resolve(out,`ask-uncertain-${width}.png`),fullPage:true});
 findings.push({state:'ask-uncertain',width,checkStatus:await page.locator('[data-chat-refresh]').isVisible(),sendBlocked:await page.locator('.chat-panel button[type="submit"]').isDisabled()});
 await page.evaluate(()=>{gigiTest.setChat({error:'turn_outcome_unknown',unconfirmedSends:new Map([['synthetic-uncertain',{sessionId:'synthetic-uncertain',requestId:'synthetic-send',text:'Inspect the rehearsal task',messageIds:new Set()}]]),current:{sessionId:'synthetic-uncertain',state:'interrupted',messages:[],approvals:[],recordLinks:[]}});gigiTest.sessions.set('synthetic-uncertain',{sessionId:'synthetic-uncertain',state:'interrupted',messages:[],approvals:[],recordLinks:[],sendReceipt:{requestId:'synthetic-send',turnId:'synthetic-turn',accepted:true}});});
 await page.locator('[data-chat-refresh]').click();await page.waitForFunction(()=>gigiTest.snapshot().chat.unconfirmedSends.size===0 && gigiTest.snapshot().chat.current.sendReceipt?.requestId==='synthetic-send');
 if(await page.getByText('Changes saved and verified in GiGi.',{exact:true}).count())throw Error('Accepted send incorrectly claimed saved change');
 await page.screenshot({path:resolve(out,`ask-accepted-send-${width}.png`),fullPage:true});
 await page.evaluate(()=>{gigiTest.setChat({refreshRequired:true});gigiTest.sessions.set('synthetic-uncertain',{sessionId:'synthetic-uncertain',state:'idle',messages:[{id:'verified-receipt',role:'assistant',text:'The rehearsal task was saved and read back. Open the linked task to inspect it.'}],approvals:[],recordLinks:[{entity:'tasks',id:'task-1',title:'Confirm the rehearsal time'}],decisionReceipt:{outcome:'verified'}});});
 await page.locator('[data-chat-refresh]').click();await page.getByText('Changes saved and verified in GiGi.',{exact:true}).waitFor();
 findings.push({state:'ask-receipt-readback',width,readInvoked:await page.evaluate(()=>gigiTest.calls.some(c=>c.operation==='agent.chat.read'&&c.input.sessionId==='synthetic-uncertain'))});
 await page.screenshot({path:resolve(out,`ask-matching-receipt-${width}.png`),fullPage:true});
 }
 await page.close();
 }
 writeFileSync(resolve(out,process.argv.includes('--finances-only')?'checks-finances.json':'checks.json'),JSON.stringify(findings,null,2));
 if(findings.some(f=>f.overflow))throw Error('Horizontal overflow');
}finally{await browser.close();await server.close();}
