import { chromium } from '../../../node_modules/.pnpm/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
const origin=process.argv[2];
assert(origin,'Pass origin');
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 for(const width of [1440,1024,768,390]){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
  const page=await context.newPage();let blocked=0;
  await page.route('**/api/contact',route=>{blocked++;route.abort();});
  await page.goto(origin+'/',{waitUntil:'networkidle'});
  assert.equal(await page.locator('video').count(),0,'reduced-motion fallback');
  assert.equal(await page.locator('img[src="/redesign/reference-home.jpg"]').count(),1);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'home overflow '+width);
  const header=page.locator('header');
  if(width<=1100){await header.getByRole('button',{name:'Menu',exact:true}).click();assert.equal(await header.locator('nav').isVisible(),true);}
  await header.getByRole('button',{name:'Contact Us',exact:true}).click();
  assert.equal(await page.getByRole('dialog').isVisible(),true,'contact opens');
  await page.getByRole('button',{name:'Select solution area',exact:true}).click();
  assert.deepEqual(await page.locator('.dropdown-option').allTextContents().then(x=>x.map(t=>t.trim())),['Oil & Gas','Mining & Metals','General Inquiry']);
  await page.keyboard.press('Escape');assert.equal(await page.getByRole('dialog').count(),0,'escape closes');
  for(const [path,category] of [['/oil-gas','Oil & Gas'],['/mining','Mining & Metals']]){
   await page.goto(origin+path,{waitUntil:'networkidle'});
   await page.getByRole('button',{name:'Talk to Us',exact:true}).click();
   assert.equal(await page.getByRole('dialog').isVisible(),true);
   assert.equal((await page.locator('.dropdown-trigger').innerText()).trim(),category,'product context');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'modal overflow '+width);
   await page.keyboard.press('Escape');
  }
  await page.goto(origin+'/oil-gas',{waitUntil:'networkidle'});await page.locator('.light-content').first().scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>document.querySelector('header').classList.contains('scrolled'));
  assert.notEqual(await header.evaluate(e=>getComputedStyle(e).backgroundColor),'rgba(0, 0, 0, 0)','readable scrolled header');
  assert.equal(blocked,0,'no lead request');
  console.log('PASS responsive navigation, modal, context, reduced motion '+width);
  await context.close();
 }
 const context=await browser.newContext({viewport:{width:1440,height:1000}});const page=await context.newPage();await page.goto(origin+'/',{waitUntil:'networkidle'});
 assert.equal(await page.locator('video[src="/redesign/reference-home.mp4"]').count(),1,'original home video preserved');await context.close();
 console.log('PASS home video preserved; no real submissions');
}finally{await browser.close()}
