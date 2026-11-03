import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';
const base=process.env.AGENCY_BASE_URL??'http://127.0.0.1:4204';
const evidence=process.env.AGENCY_EVIDENCE_DIR??'/tmp/agency-public-entrances';
await mkdir(evidence,{recursive:true});
const browser=await chromium.launch({headless:true});
const results=[];
try {
 const utility=await browser.newPage();
 await utility.goto(base+'/map',{waitUntil:'networkidle'});
 assert.equal(await utility.locator('[data-agency-page-entrance]').count(),0,'Root Map workbench keeps its own motion ownership');
 await utility.close();
 for(const width of [320,390,768,1024,1025,1440]) {
  const page=await browser.newPage({viewport:{width,height:900}});
  for(const route of ['/services','/products','/products/ground','/about','/dispatch','/field-reports/template-review','/workflows','/workflows/mcp-server-development','/case-studies/webflow-marketplace','/case-studies/webflow-marketplace/validator','/dify/mcp-control-plane','/privacy','/security']) {
   console.log('Checking',width,route);
   await page.goto(base+route,{waitUntil:'networkidle'});
   await page.waitForFunction(()=>document.querySelectorAll('[data-agency-page-entrance]').length>0);
   const groups=page.locator('[data-agency-page-entrance]');
   const count=await groups.count();
   assert.ok(await groups.evaluateAll(es=>es.every(e=>!e.closest('[role="tabpanel"], [data-motion-target], .performance-narrative-stage__composition'))),'State-driven panels keep motion ownership');
   const prepared=page.locator('[data-agency-page-entrance][style*="opacity: 0"]');
   assert.ok(await prepared.count()>0,`${route} has offscreen zero-prepared content at${width}`);
   assert.equal(await page.locator('h1').evaluateAll(es=>es.every(e=>!e.closest('[data-scroll-entrance]'))),true,'Hero stays authored');
   const target=prepared.first();
   await target.evaluate(e=>scrollTo({top:scrollY+e.getBoundingClientRect().top-200,behavior:'instant'}));
   await page.waitForFunction(()=>[...document.querySelectorAll('[data-agency-page-entrance]')].some(e=>Number(e.style.opacity)>0&&Number(e.style.opacity)<1));
   await page.waitForFunction(()=>[...document.querySelectorAll('[data-agency-page-entrance]')].filter(e=>e.getBoundingClientRect().top<innerHeight-120&&e.getBoundingClientRect().bottom>0).every(e=>e.style.opacity===''));
   await page.evaluate(()=>window.dispatchEvent(new Event('beforeprint')));
   assert.ok(await groups.evaluateAll(es=>es.every(e=>getComputedStyle(e).opacity==='1'&&e.style.opacity==='')),'Print restores every group');
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${route} overflow${width}`);
   if([390,1440].includes(width)&&['/services','/products/ground','/case-studies/webflow-marketplace','/privacy'].includes(route))await page.screenshot({path:`${evidence}/${route.replaceAll('/','_')}-${width}.png`});
   results.push({route,width,count,passed:true});
  }
  // A real internal link must initialize the reused layout on the next route.
  await page.goto(base+'/services',{waitUntil:'networkidle'});
  await page.locator('a[href="/about"]').first().click();
  await page.waitForURL('**/about');
  await page.waitForFunction(()=>[...document.querySelectorAll('[data-agency-page-entrance]')].some(e=>e.style.opacity==='0'));
  await page.goBack({waitUntil:'networkidle'});
  await page.waitForURL('**/services');
  await page.waitForFunction(()=>document.querySelector('[data-agency-page-entrance]'));
  await page.close();
 }
 for(const options of [{javaScriptEnabled:false},{reducedMotion:'reduce'}]){
  const page=await browser.newPage(options);await page.goto(base+'/services',{waitUntil:'networkidle'});
  assert.ok(await page.locator('section').evaluateAll(es=>es.every(e=>getComputedStyle(e).opacity==='1')));await page.close();
 }
 const excluded=await browser.newPage();
 for(const route of ['/login']){await excluded.goto(base+route,{waitUntil:'networkidle'});assert.equal(await excluded.locator('[data-agency-page-entrance]').count(),0);}
 for(const route of ['/contact','/book']){await excluded.goto(base+route,{waitUntil:'networkidle'});assert.ok(await excluded.locator('form,input,select,textarea,iframe').evaluateAll(es=>es.every(e=>!e.closest('[data-agency-page-entrance]'))),'Form controls retain immediate ownership');}
 await excluded.goto(base+'/services#support-scope',{waitUntil:'networkidle'});
 assert.ok(await excluded.locator('[data-agency-page-entrance]').evaluateAll(es=>es.every(e=>!e.style.opacity)),'Hash arrival stays visible');
 await excluded.close();
 await writeFile(`${evidence}/results.json`,JSON.stringify({base,passed:true,results},null,2));console.log(JSON.stringify({base,passed:true,results}));
}finally{await browser.close();}
