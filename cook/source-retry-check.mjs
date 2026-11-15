import {createServer} from '../apps/gigi-desktop/node_modules/vite/dist/node/index.js';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const {chromium}=createRequire(new URL('../packages/agency/package.json',import.meta.url))('@playwright/test');
const root=resolve(process.argv[2]||'apps/gigi-desktop');
const server=await createServer({root,configFile:resolve(root,'vite.config.mjs'),server:{port:0,host:'127.0.0.1'}});await server.listen();
const browser=await chromium.launch({headless:true,channel:'chrome'});
try {
 const page=await browser.newPage({viewport:{width:390,height:840}});
 await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/?fixture=settings&recovery=1`);await page.waitForFunction(()=>globalThis.gigiTest);
 await page.evaluate(()=>{gigiTest.set({sources:{googlecalendar:{provider:'googlecalendar',state:'connected',connectedAccountId:'synthetic-account',configured:true}},imports:{}});gigiTest.failNext('sources.preview','Synthetic source page unavailable. Try the preview again.');});
 const preview=page.locator('[data-source-preview="googlecalendar"]');await preview.click();await page.getByText('Synthetic source page unavailable. Try the preview again.',{exact:true}).waitFor();
 await preview.click();await page.getByText('Recovered synthetic rehearsal',{exact:true}).waitFor();
 assert.equal(await page.getByText('Synthetic source page unavailable. Try the preview again.',{exact:true}).count(),0,'Successful retry removes its obsolete failure notice');
 const boxes=await page.locator('.source-date-bounds').last().evaluate(node=>Array.from(node.children).map(child=>{const r=child.getBoundingClientRect();return {x:r.x,width:r.width};}));assert.ok(boxes.every(box=>box.x+box.width<=390),'Date fields fit narrow viewport');
 console.log('PASS: successful source retry clears own failure and date bounds fit390');
}finally{await browser.close();await server.close();}
