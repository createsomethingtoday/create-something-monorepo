// Fixed synthetic states; never opens native data or provider accounts.
import {createServer} from '../apps/gigi-desktop/node_modules/vite/dist/node/index.js';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {mkdirSync,writeFileSync} from 'node:fs';
const {chromium}=createRequire(new URL('../packages/agency/package.json',import.meta.url))('@playwright/test');
const root=resolve(process.argv[2]||'apps/gigi-desktop');
const out=resolve(process.argv[3]||'cook/stills/r01');mkdirSync(out,{recursive:true});
const server=await createServer({root,configFile:resolve(root,'vite.config.mjs'),server:{port:0,host:'127.0.0.1'}});await server.listen();
const browser=await chromium.launch({headless:true,channel:'chrome'});
const findings=[];
try{
 for(const width of [390,1280]){
 const page=await browser.newPage({viewport:{width,height:840},reducedMotion:'reduce'});
 await page.addInitScript(()=>{Date.now=()=>Date.parse('2026-11-15T21:00:00Z');});
 for(const state of ['overview','music','settings','finances']){
 await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/?fixture=${state}&recovery=1`);await page.waitForFunction(()=>globalThis.gigiTest);
 if(state==='finances')await page.evaluate(()=>gigiTest.set({selected:{id:'source-money',entity:'finances',title:'Synthetic payment',fields:{Amount:12500,Direction:'Income',Status:'Paid'},source:{kind:'import',provider:'statement',externalId:'synthetic-statement-row'}},sourceExpanded:true}));
 await page.screenshot({path:resolve(out,`${state}-${width}.png`),fullPage:true});
 if(state==='overview'||state==='finances'||state==='music'){await page.locator('#astryx-app-shell-main').evaluate(node=>{node.scrollTop=node.scrollHeight;});await page.screenshot({path:resolve(out,`${state}-detail-${width}.png`),fullPage:true});}
 findings.push({state,width,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)});
 }
 await page.close();
 }
 writeFileSync(resolve(out,'checks.json'),JSON.stringify(findings,null,2));
 if(findings.some(f=>f.overflow))throw Error('Horizontal overflow');
}finally{await browser.close();await server.close();}
