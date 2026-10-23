import { chromium } from '@playwright/test';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out=pathToFileURL((process.env.EVIDENCE_DIR||'/tmp/w4fjph-three-story-integration')+'/');await mkdir(out,{recursive:true});
const baseURL=process.env.BASE_URL||'http://127.0.0.1:4187/';
const executablePath=process.env.CHROME_EXECUTABLE||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser=await chromium.launch({executablePath,headless:true});
const results=[];
try{
for(const width of [1440,1024,768,390,320])for(const reducedMotion of ['reduce','no-preference']){
 const page=await browser.newPage({viewport:{width,height:1000},reducedMotion});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(baseURL);await page.waitForLoadState('networkidle');await page.evaluate(()=>document.fonts.ready);
 assert.equal(await page.locator('.bw-scene').count(),3);
 const copy=await page.locator('.bw-story').innerText();assert.doesNotMatch(copy,/GiGi|NPG|Outerfields/);
 assert.match(copy,/one agreed area/i);assert.match(copy,/private beta/i);assert.match(copy,/Educational simulation/i);
 assert.deepEqual((await page.locator('.cc-price').allTextContents()).map(s=>s.replace(/\s/g,'')),['$900/month','$2,500/month']);
 for(const img of await page.locator('.bw-story img').all()){await img.scrollIntoViewIfNeeded();await img.evaluate(i=>i.decode());}
 assert.ok(await page.locator('.bw-story img').evaluateAll(imgs=>imgs.every(i=>i.complete&&i.naturalWidth>0&&i.alt)));
 const check=()=>page.evaluate(()=>{
  const nodes=[...document.querySelectorAll('.bw-story p,.bw-story h2,.bw-story h3,.bw-story h4,.bw-story figcaption,.bw-story summary')].filter(e=>e.getBoundingClientRect().height>0&&(!e.closest('details:not([open])')||e.tagName==='SUMMARY'));
  const collision=[];for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){
   if(nodes[i].contains(nodes[j])||nodes[j].contains(nodes[i]))continue;
   const a=nodes[i].getBoundingClientRect(),b=nodes[j].getBoundingClientRect();
   if(a.left<b.right-1&&a.right>b.left+1&&a.top<b.bottom-1&&a.bottom>b.top+1)collision.push([nodes[i].textContent.slice(0,30),nodes[j].textContent.slice(0,30)]);
  }
  return{overflow:document.documentElement.scrollWidth>innerWidth+1,collision};
 });
 let result=await check();assert.equal(result.overflow,false,`${width} ${reducedMotion}`);assert.deepEqual(result.collision,[]);
 const nav=page.getByRole('link',{name:/01 Develop a product/});await nav.focus();await page.keyboard.press('Enter');await page.waitForURL('**/#workstream-product');
 for(const summary of await page.locator('.bw-story summary').all()){await summary.focus();await page.keyboard.press('Enter');assert.ok(await summary.evaluate(e=>e.parentElement.open));}
 result=await check();assert.equal(result.overflow,false);assert.deepEqual(result.collision,[]);
 if(width===1440&&reducedMotion==='reduce'){
  await page.locator('.bw-story').screenshot({style:'.nav-fixed,.privacy-choice{visibility:hidden!important}',path:new URL('desktop.png',out).pathname});
  await page.locator('#workstream-product').screenshot({path:new URL('product.png',out).pathname});
  await page.locator('#workstream-platform').screenshot({path:new URL('platform.png',out).pathname});
  await page.locator('#workstream-operations').screenshot({path:new URL('operations.png',out).pathname});
 }
 if(width===390&&reducedMotion==='reduce')await page.locator('.bw-story').screenshot({style:'.nav-fixed,.privacy-choice{visibility:hidden!important}',path:new URL('mobile.png',out).pathname});
 await page.locator('.bw-story p,.bw-story li,.bw-story summary,.bw-story h2,.bw-story h3,.bw-story h4,.bw-story .bw-stage,.bw-story .bw-path-number').evaluateAll(elements=>{const sizes=elements.map(e=>parseFloat(getComputedStyle(e).fontSize));elements.forEach((e,i)=>{e.style.fontSize=(sizes[i]*2)+'px';e.style.lineHeight='1.5';});});
 result=await check();assert.equal(result.overflow,false,`200% ${width}`);assert.deepEqual(result.collision,[]);
 for(const summary of await page.locator('.bw-story summary').all()){await summary.focus();await page.keyboard.press('Enter');assert.equal(await summary.evaluate(e=>e.parentElement.open),false);}
 assert.deepEqual(errors,[]);results.push({width,reducedMotion,normalAndExpanded:true,enlargedText:true,keyboard:true,overflow:false,collisions:0,pageErrors:0});await page.close();
}
await writeFile(new URL('results.json',out),JSON.stringify({passed:true,states:results},null,2));console.log(JSON.stringify({passed:true,viewportMotionPairs:results.length,enlargedText:true,keyboard:true}));
}finally{await browser.close()}
