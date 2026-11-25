import {createServer} from '../apps/gigi-desktop/node_modules/vite/dist/node/index.js';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
const {chromium}=createRequire(new URL('../packages/agency/package.json',import.meta.url))('@playwright/test');
const root=resolve(process.argv[2]||'apps/gigi-desktop'),out=resolve('cook/stills/r03-compact');mkdirSync(out,{recursive:true});
const server=await createServer({root,configFile:resolve(root,'vite.config.mjs'),server:{port:0,host:'127.0.0.1'}});await server.listen();
const browser=await chromium.launch({headless:true,channel:'chrome'});
try {for(const width of [880,1280,390]) {
 const page=await browser.newPage({viewport:{width,height:width===880?620:840},reducedMotion:'reduce'});
 await page.addInitScript(()=>{Date.now=()=>Date.parse('2026-11-15T21:00:00Z');});
 await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/?fixture=overview&recovery=1`);await page.waitForFunction(()=>globalThis.gigiTest);
 if(width<=1024){const disclosure=page.locator('.dev-empty-days');assert.equal(await disclosure.count(),1,'Compact agenda puts empty days in an accessible disclosure');assert.equal(await disclosure.getAttribute('open'),null);await disclosure.locator('summary').focus();await page.keyboard.press('Enter');assert.equal(await disclosure.getAttribute('open'),'');assert.equal(await page.locator('.dev-calendar-day:visible').count(),7);await page.keyboard.press('Enter');}
 else assert.equal(await page.locator('.dev-calendar-day:visible').count(),7);
 await page.screenshot({path:resolve(out,`today-${width}.png`)});
 await page.evaluate(()=>gigiTest.open('music'));await page.getByText('Unchanged original',{exact:true}).waitFor();
 await page.screenshot({path:resolve(out,`music-${width}.png`)});
 if(width===880){const rows=await page.locator('.music-library-row').evaluateAll(ns=>ns.map(n=>n.getBoundingClientRect().bottom));assert.ok(rows.length>=3&&rows[2]<=620,'Three music entries must fit in the native minimum viewport');}
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.evaluate(()=>gigiTest.open('settings'));
 await page.evaluate(()=>gigiTest.set({sources:{googlecalendar:{provider:'googlecalendar',state:'connected',connectedAccountId:'synthetic',configured:true,access:{state:'admitted'}}},sourceDrafts:{googlecalendar:{from:'2026-11-09',to:'2026-11-16'}},imports:{googlecalendar:{accountId:'synthetic',preview:{previewId:'synthetic',coverage:'bounded',fetchedAt:1794776400,scannedCount:1,selectedCount:1,newCount:1,existingCount:0,records:[{id:'synthetic',title:'All-day rehearsal',fields:{Date:'2026-11-12/2026-11-14'}}]}}}}));
 await page.locator('[data-source-preview="googlecalendar"]').scrollIntoViewIfNeeded();await page.screenshot({path:resolve(out,`calendar-${width}.png`)});
 await page.close();
}console.log('PASS compact agenda keyboard disclosure, seven accessible days, desktop grid, three visible-start Music entries at880, no overflow. Synthetic Chromium fixtures.');}finally{await browser.close();await server.close();}
